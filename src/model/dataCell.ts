import type { ExprValue } from "./expr";

export function isComplexValue(v: unknown): boolean {
  return v != null && typeof v === "object";
}

export function isObjectArray(v: unknown): v is Record<string, ExprValue>[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((item) => item != null && typeof item === "object" && !Array.isArray(item))
  );
}

/** Short label for grid cells — never `[object Object]`. */
export function cellDisplaySummary(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    if (isObjectArray(v)) {
      const keys = nestedTableHeaders(v);
      return `${v.length} item${v.length === 1 ? "" : "s"} · ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}`;
    }
    return `[${v.length} values]`;
  }
  const keys = Object.keys(v as object);
  return `{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}}`;
}

export function formatCellEditor(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function parseCellEditor(text: string, previous: unknown): ExprValue {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const looksJson =
    trimmed.startsWith("[") ||
    trimmed.startsWith("{") ||
    (isComplexValue(previous) && trimmed !== String(previous));

  if (looksJson) {
    try {
      return normalizeParsed(JSON.parse(trimmed));
    } catch {
      if (isComplexValue(previous)) {
        throw new Error("Invalid JSON");
      }
    }
  }

  if (typeof previous === "number" && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (typeof previous === "boolean" && (trimmed === "true" || trimmed === "false")) {
    return trimmed === "true";
  }

  return text;
}

function normalizeParsed(v: unknown): ExprValue {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map((x) => normalizeParsed(x));
  }
  if (typeof v === "object") {
    const out: Record<string, ExprValue> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = normalizeParsed(val);
    }
    return out;
  }
  return String(v);
}

export function nestedTableHeaders(rows: Record<string, ExprValue>[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) keys.add(k);
  }
  return [...keys];
}

export function complexFieldKeys(row: Record<string, unknown>): string[] {
  return Object.keys(row).filter((k) => isComplexValue(row[k]));
}
