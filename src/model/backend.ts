/** Prefer Rust (Tauri) for heavy runtime work; fall back to JS on web. */

import {
  parseDataInput as parseDataInputJs,
  type DataRow,
} from "./bindings";
import {
  resolveTemplate as resolveTemplateJs,
} from "./bindings";
import {
  runWorkflow as runWorkflowJs,
  type RunOptions,
  type WorkflowResult,
} from "./runtime";
import type { RuntimeContext } from "./expr";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function parseDataInputBackend(raw: string): Promise<DataRow[]> {
  if (!isTauri()) return parseDataInputJs(raw);
  try {
    const result = await invoke<{
      rows: DataRow[];
      columns: string[];
      format: string;
    }>("data_parse", { text: raw });
    return result.rows;
  } catch {
    return parseDataInputJs(raw);
  }
}

export async function resolveTemplateBackend(
  template: string,
  row: DataRow | undefined,
  options: { missingAsEmpty?: boolean; ctx?: RuntimeContext } = {},
): Promise<string> {
  if (!isTauri()) {
    return resolveTemplateJs(template, row, options);
  }
  try {
    return await invoke<string>("template_resolve", {
      template,
      row: row ?? {},
      ctx: options.ctx ?? null,
      missing_as_empty: options.missingAsEmpty ?? true,
    });
  } catch {
    return resolveTemplateJs(template, row, options);
  }
}

export async function runWorkflowBackend(
  opts: RunOptions,
): Promise<WorkflowResult> {
  if (!isTauri()) return runWorkflowJs(opts);
  try {
    const result = await invoke<{
      ok: boolean;
      skippedRow: boolean;
      context: RuntimeContext;
      scriptResults: Record<string, unknown>;
      logs: WorkflowResult["logs"];
      emit: WorkflowResult["emit"];
    }>("workflow_run", {
      project: opts.project,
      row: opts.row,
      output: opts.output,
      vars: opts.vars ?? null,
      preview: Boolean(opts.preview),
    });
    return {
      ok: result.ok,
      skippedRow: result.skippedRow,
      context: result.context,
      scriptResults: result.scriptResults as WorkflowResult["scriptResults"],
      logs: result.logs,
      emit: result.emit,
    };
  } catch {
    return runWorkflowJs(opts);
  }
}

export async function getRuntimeInfo(): Promise<{
  version: string;
  backbone: string;
  engines: string[];
} | null> {
  if (!isTauri()) {
    return {
      version: "0.1.0",
      backbone: "javascript",
      engines: ["bindings", "expr", "runtime"],
    };
  }
  try {
    return await invoke("get_runtime_info");
  } catch {
    return null;
  }
}
