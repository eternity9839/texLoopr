import {
  evaluateConditionExpr,
  getAtPath,
  type ExprValue,
  type RuntimeContext,
} from "./expr";
import { applyTemplateFilters, normalizeFilterList } from "./templateFilters";
import { previewContext } from "./runtime";
import type { OutputProfile } from "./workflow";
import { noteIssue } from "../state/issueLog";

/** Row values may be strings (CSV) or richer JSON shapes (arrays/objects). */
export type DataRow = Record<string, ExprValue>;

function valueToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Resolve {{path}} / {{path|filter}} and {{#if}}…{{/if}} against a row / context. */
export function resolveTemplate(
  template: string,
  row: DataRow | undefined,
  options: {
    missingAsEmpty?: boolean;
    ctx?: RuntimeContext;
    /** When true (preview), missing fields are logged to the in-app issue panel. */
    diagnose?: boolean;
  } = {},
): string {
  const diagnose = options.diagnose === true;
  const withConditionals = expandConditionals(template, row, {
    ...options,
    diagnose,
  });
  return withConditionals.replace(
    /\{\{\s*([^}#/][^}|]*?)(?:\|([^}]+))?\s*\}\}/g,
    (_m, pathRaw: string, filterRaw?: string) => {
      const path = pathRaw.trim();
      if (!path || path.startsWith("#") || path === "else") return "";
      const filters = normalizeFilterList(
        (filterRaw ?? "")
          .split("|")
          .map((f) => f.trim())
          .filter(Boolean),
      );

      let value: string | undefined;
      const looked = lookupValue(path, row, options.ctx);
      if (looked !== undefined && looked !== null) {
        value = valueToString(looked);
      } else if (options.missingAsEmpty || filters.length > 0) {
        value = "";
        if (diagnose && !filters.some((f) => f.startsWith("default"))) {
          noteIssue({
            category: "missing-data",
            severity: "warning",
            message: `Missing field «${path}»`,
            detail: path,
            source: "preview",
          });
        }
      } else {
        if (diagnose) {
          noteIssue({
            category: "missing-data",
            severity: "warning",
            message: `Unresolved merge «${path}»`,
            detail: path,
            source: "resolve",
          });
        }
        return `{{${path}}}`;
      }

      return applyTemplateFilters(value, filters, { seedKey: path });
    },
  );
}

/**
 * Expand {{#if expr}}…{{else}}…{{/if}} (fail-safe: hide branch on error).
 * Supports nesting by processing innermost first.
 */
export function expandConditionals(
  template: string,
  row: DataRow | undefined,
  options: {
    missingAsEmpty?: boolean;
    ctx?: RuntimeContext;
    diagnose?: boolean;
  } = {},
): string {
  let out = template;
  const re =
    /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/;
  for (let i = 0; i < 32; i++) {
    const next = out.replace(re, (_m, exprRaw: string, thenPart: string, elsePart?: string) => {
      const expr = String(exprRaw).trim();
      let ok = false;
      try {
        ok = evaluateCondition(expr, row, options.ctx, {
          diagnose: options.diagnose,
        });
      } catch (err) {
        ok = false;
        if (options.diagnose) {
          noteIssue({
            category: "impossible-condition",
            severity: "error",
            message: `Conditional failed: ${err instanceof Error ? err.message : "invalid expression"}`,
            detail: expr,
            source: "preview",
          });
        }
      }
      return ok ? thenPart : (elsePart ?? "");
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

export function lookupValue(
  path: string,
  row: DataRow | undefined,
  ctx?: RuntimeContext,
): unknown {
  if (ctx) {
    const fromCtx = lookupCtx(path, ctx);
    if (fromCtx != null) return fromCtx;
  }
  if (!row) return null;
  if (path in row) return row[path];
  const nested = getAtPath(row, path);
  return nested;
}

function lookupCtx(path: string, ctx: RuntimeContext): unknown {
  const roots = ["data", "output", "device", "vars", "env"] as const;
  if (roots.some((r) => path === r || path.startsWith(`${r}.`))) {
    const parts = path.split(".");
    let cur: unknown =
      parts[0] === "data"
        ? ctx.data
        : parts[0] === "output"
          ? ctx.output
          : parts[0] === "device"
            ? ctx.device
            : parts[0] === "vars"
              ? ctx.vars
              : ctx.env;
    for (const p of parts.slice(1)) {
      if (cur == null || typeof cur !== "object") return null;
      if (Array.isArray(cur)) {
        const idx = Number(p);
        if (!Number.isFinite(idx)) return null;
        cur = cur[idx];
        continue;
      }
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur ?? null;
  }
  if (path in ctx.data) return ctx.data[path];
  return getAtPath(ctx.data, path);
}

/**
 * True when the condition is only about output.kind (format alternate layouts).
 * Used in Edit to hide SMS/mobile chrome without hiding data-driven conditions.
 */
export function isOutputFormatCondition(condition: string | undefined): boolean {
  if (!condition?.trim()) return false;
  const stripped = condition
    .trim()
    .replace(/\s+/g, " ")
    .replace(/&&/g, "&&")
    .replace(/\|\|/g, "||");
  // Allow only output.kind comparisons chained with &&
  return /^(output\.kind\s*(==|!=)\s*['"][\w-]+['"](\s*&&\s*)?)+$/.test(
    stripped,
  );
}

/**
 * Evaluate block/workflow conditions.
 * Supports legacy `field` / `!field` and full expression language (ADR 0005).
 */
export function evaluateCondition(
  condition: string | undefined,
  row: DataRow | undefined,
  ctx?: RuntimeContext,
  options: { diagnose?: boolean } = {},
): boolean {
  if (!condition || !condition.trim()) return true;
  const trimmed = condition.trim();

  // Legacy presence checks (no operators)
  const pathMatch = trimmed.match(/^!?([\w.-]+)$/);
  if (pathMatch && !trimmed.includes(" ")) {
    const key = pathMatch[1];
    if (!key.includes(".") || key.startsWith("data.")) {
      const field = key.startsWith("data.") ? key.slice(5) : key;
      const present = Boolean(
        lookupValue(field, row, ctx) ?? row?.[field] ?? ctx?.data?.[field],
      );
      return trimmed.startsWith("!") ? !present : present;
    }
  }

  if (trimmed === "false" || trimmed === "0") return false;

  const runtime =
    ctx ??
    previewContext(row, {
      id: "out-preview",
      name: "preview",
      kind: "preview",
    } satisfies OutputProfile);

  return evaluateConditionExpr(trimmed, runtime, {
    onError: options.diagnose
      ? (err) => {
          noteIssue({
            category: "impossible-condition",
            severity: "error",
            message: `Condition cannot be evaluated: ${err.message}`,
            detail: trimmed,
            source: "preview",
          });
        }
      : undefined,
  });
}

/** Resolve an array for repeater blocks (JSON rows or JSON-encoded string). */
export function resolveItemsPath(
  itemsPath: string,
  row: DataRow | undefined,
  ctx?: RuntimeContext,
): ExprValue[] {
  const raw = lookupValue(itemsPath, row, ctx);
  if (Array.isArray(raw)) return raw as ExprValue[];
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as ExprValue[];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseDataInput(raw: string): DataRow[] {
  const text = raw.trim();
  if (!text) return [];

  if (text.startsWith("[") || text.startsWith("{")) {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((row) => normalizeRow(row));
    }
    if (parsed && typeof parsed === "object") {
      return [normalizeRow(parsed)];
    }
    throw new Error("JSON must be an object or array of objects");
  }

  return parseCsv(text);
}

function normalizeRow(row: unknown): DataRow {
  if (!row || typeof row !== "object") return {};
  const out: DataRow = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    out[k] = toExprValue(v);
  }
  return out;
}

function toExprValue(v: unknown): ExprValue {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map((x) => toExprValue(x));
  }
  if (typeof v === "object") {
    const o: Record<string, ExprValue> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      o[k] = toExprValue(val);
    }
    return o;
  }
  return String(v);
}

function parseCsv(text: string): DataRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: DataRow = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Column names for field picker (top-level keys of first rows). */
export function dataColumnNames(rows: DataRow[]): string[] {
  const keys = new Set<string>();
  for (const row of rows.slice(0, 20)) {
    for (const k of Object.keys(row)) keys.add(k);
  }
  return [...keys].sort();
}

export const SAMPLE_CSV = `name,company,role
Ada Lovelace,Analytical Engines,Mathematician
Alan Turing,Bletchley Park,Cryptanalyst
Grace Hopper,US Navy,Rear Admiral`;
