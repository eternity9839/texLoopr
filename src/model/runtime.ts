import type { Project } from "./document";
import type { DataRow } from "./bindings";
import { resolveTemplate } from "./bindings";
import {
  evaluateConditionExpr,
  evaluateExpr,
  type RuntimeContext,
  type ExprValue,
} from "./expr";
import {
  outputToCtx,
  type OutputProfile,
  type ProjectScript,
  type WorkflowStep,
} from "./workflow";

export interface RunOptions {
  project: Project;
  row: DataRow;
  output: OutputProfile;
  vars?: Record<string, ExprValue>;
  preview?: boolean;
}

export interface StepLog {
  stepId: string;
  name: string;
  type: string;
  skipped: boolean;
  ok: boolean;
  detail?: string;
}

export interface WorkflowResult {
  ok: boolean;
  skippedRow: boolean;
  context: RuntimeContext;
  scriptResults: Record<string, ExprValue>;
  logs: StepLog[];
  emit: {
    kind: string;
    payload: Record<string, unknown>;
  } | null;
}

function buildContext(opts: RunOptions): RuntimeContext {
  const { output, device } = outputToCtx(opts.output);
  const ctx: RuntimeContext = {
    data: { ...(opts.row as Record<string, ExprValue>) },
    output,
    device,
    vars: opts.vars ?? {},
    env: {
      preview: Boolean(opts.preview),
      timestamp: Date.now(),
    },
  };
  attachProjectDatasets(opts.project, ctx, opts.row);
  return ctx;
}

/** Expose named datasets + nest matched linked rows onto data.<name>. */
export function attachProjectDatasets(
  project: Project,
  ctx: RuntimeContext,
  row?: DataRow,
): void {
  const map: Record<string, ExprValue> = {};
  for (const ds of project.datasets ?? []) {
    const keyField = ds.keyField ?? "id";
    map[ds.name] = {
      keyField,
      rows: ds.rows as ExprValue[],
    };
    if (row && keyField) {
      const want = String(row[keyField] ?? "");
      if (want) {
        const hit = ds.rows.find((r) => String(r[keyField] ?? "") === want);
        if (hit) {
          ctx.data[ds.name] = hit as ExprValue;
        }
      }
    }
  }
  ctx.datasets = map;
}

function findScript(
  project: Project,
  id: string,
): ProjectScript | undefined {
  return (project.scripts ?? []).find((s) => s.id === id);
}

function runScript(
  script: ProjectScript,
  ctx: RuntimeContext,
): ExprValue {
  if (script.kind === "template") {
    return resolveTemplate(script.body, ctx.data as DataRow, {
      missingAsEmpty: true,
      ctx,
    });
  }
  return evaluateExpr(script.body, ctx);
}

/**
 * Run bind + script (+ soft condition) steps to enrich preview context.
 * Skips filter / render / emit (ADR 0008).
 */
export function enrichPreviewContext(
  project: Project,
  row: DataRow | undefined,
  output: OutputProfile,
  vars: Record<string, ExprValue> = {},
): RuntimeContext {
  const ctx = previewContext(row, output, vars, true);
  attachProjectDatasets(project, ctx, row);
  const steps: WorkflowStep[] = (project.workflow ?? []).filter(
    (s) => s.type === "bind" || s.type === "script" || s.type === "condition",
  );

  for (const step of steps) {
    if (step.when && !evaluateConditionExpr(step.when, ctx)) continue;
    try {
      if (step.type === "script") {
        const scriptId = String(step.config.scriptId ?? "");
        const script = findScript(project, scriptId);
        if (!script) continue;
        const value = runScript(script, ctx);
        const key = script.name.replace(/\s+/g, "_").toLowerCase();
        if (typeof value === "string" || typeof value === "number") {
          ctx.data[key] = String(value);
          ctx.vars[key] = value;
        } else if (value != null) {
          ctx.vars[key] = value;
        }
      }
    } catch {
      /* fail open for preview */
    }
  }
  return ctx;
}

export function runWorkflow(opts: RunOptions): WorkflowResult {
  const ctx = buildContext(opts);
  const logs: StepLog[] = [];
  const scriptResults: Record<string, ExprValue> = {};
  let skippedRow = false;
  let emit: WorkflowResult["emit"] = null;
  const steps: WorkflowStep[] = opts.project.workflow?.length
    ? opts.project.workflow
    : [];

  for (const step of steps) {
    if (step.when && !evaluateConditionExpr(step.when, ctx)) {
      logs.push({
        stepId: step.id,
        name: step.name,
        type: step.type,
        skipped: true,
        ok: true,
        detail: "when=false",
      });
      continue;
    }

    try {
      switch (step.type) {
        case "bind":
          logs.push({
            stepId: step.id,
            name: step.name,
            type: step.type,
            skipped: false,
            ok: true,
            detail: `${Object.keys(ctx.data).length} fields`,
          });
          break;
        case "filter": {
          const action = String(step.config.action ?? "skip-row");
          // `when` already matched — filter steps that fire mean the filter condition matched
          if (action === "skip-row") {
            skippedRow = true;
            logs.push({
              stepId: step.id,
              name: step.name,
              type: step.type,
              skipped: false,
              ok: true,
              detail: "row skipped",
            });
          }
          break;
        }
        case "condition": {
          const expr = String(step.config.expr ?? "true");
          const pass = evaluateConditionExpr(expr, ctx);
          logs.push({
            stepId: step.id,
            name: step.name,
            type: step.type,
            skipped: false,
            ok: pass,
            detail: pass ? "passed" : "failed",
          });
          if (!pass && step.config.onFail === "skip-row") skippedRow = true;
          break;
        }
        case "script": {
          const scriptId = String(step.config.scriptId ?? "");
          const script = findScript(opts.project, scriptId);
          if (!script) {
            logs.push({
              stepId: step.id,
              name: step.name,
              type: step.type,
              skipped: false,
              ok: false,
              detail: `missing script ${scriptId}`,
            });
            break;
          }
          const value = runScript(script, ctx);
          scriptResults[script.id] = value;
          if (typeof value === "string" || typeof value === "number") {
            ctx.data[script.name.replace(/\s+/g, "_").toLowerCase()] =
              String(value);
          }
          logs.push({
            stepId: step.id,
            name: step.name,
            type: step.type,
            skipped: false,
            ok: true,
            detail: asShort(value),
          });
          break;
        }
        case "render":
          logs.push({
            stepId: step.id,
            name: step.name,
            type: step.type,
            skipped: skippedRow,
            ok: true,
            detail: skippedRow ? "skipped (row)" : "render ready",
          });
          break;
        case "emit":
          emit = {
            kind: String(ctx.output.kind ?? "preview"),
            payload: {
              outputId: ctx.output.id,
              device: ctx.device,
              api: opts.output.api ?? null,
              data: ctx.data,
              scripts: scriptResults,
            },
          };
          logs.push({
            stepId: step.id,
            name: step.name,
            type: step.type,
            skipped: false,
            ok: true,
            detail: `emit ${emit.kind}`,
          });
          break;
        default:
          logs.push({
            stepId: step.id,
            name: step.name,
            type: step.type,
            skipped: false,
            ok: false,
            detail: "unknown step",
          });
      }
    } catch (err) {
      logs.push({
        stepId: step.id,
        name: step.name,
        type: step.type,
        skipped: false,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }

    if (skippedRow && step.type === "filter") break;
  }

  return {
    ok: logs.every((l) => l.ok || l.skipped),
    skippedRow,
    context: ctx,
    scriptResults,
    logs,
    emit,
  };
}

function asShort(v: ExprValue): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

/** Build runtime context for block visibility / templates during preview. */
export function previewContext(
  row: DataRow | undefined,
  output: OutputProfile,
  vars: Record<string, ExprValue> = {},
  preview = true,
): RuntimeContext {
  const { output: o, device } = outputToCtx(output);
  return {
    data: { ...((row ?? {}) as Record<string, ExprValue>) },
    output: o,
    device,
    vars,
    env: { preview, timestamp: Date.now() },
  };
}
