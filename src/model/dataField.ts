import { resolveTemplate, type DataRow } from "./bindings";
import type { RuntimeContext } from "./expr";

/** Default ink for data-field blocks in the editor. */
export const DATA_FIELD_COLOR = "#2f7d5c";

/** Strip optional {{ }} wrappers; keep filter pipes (e.g. date|date:short). */
export function normalizeDataFieldPath(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const wrapped = t.match(/^\{\{\s*(.+?)\s*\}\}$/);
  return (wrapped ? wrapped[1] : t).trim();
}

export function dataFieldTemplate(path: string): string {
  const p = normalizeDataFieldPath(path);
  return p ? `{{${p}}}` : "";
}

/** Human label in the editor (path only, no braces). */
export function dataFieldLabel(path: string): string {
  const p = normalizeDataFieldPath(path);
  return p || "field";
}

export function resolveDataField(
  path: string,
  row: DataRow | undefined,
  ctx?: RuntimeContext,
): string {
  const tpl = dataFieldTemplate(path);
  if (!tpl) return "";
  return resolveTemplate(tpl, row, { missingAsEmpty: true, ctx });
}
