import { resolveTemplate, type DataRow } from "./bindings";
import type { RuntimeContext } from "./expr";
import { dataFieldLabel } from "./dataField";

export function hasMergeBinding(raw: string): boolean {
  return /\{\{/.test(raw);
}

/** Short label for a bound value in edit mode. */
export function bindingPreviewLabel(raw: string): string {
  const m = raw.match(/\{\{\s*([^}|#/]+?)(?:\|[^}]*)?\s*\}\}/);
  if (m?.[1]) return dataFieldLabel(m[1]);
  const t = raw.trim();
  if (!t) return "value";
  return t.length > 28 ? `${t.slice(0, 25)}…` : t;
}

/** Resolve row-1 (or static) preview text for edit-mode binding hints. */
export function resolveBindingPreview(
  raw: string,
  row: DataRow | undefined,
  ctx?: RuntimeContext,
): string | null {
  if (!raw.trim()) return null;
  if (!hasMergeBinding(raw)) {
    const t = raw.trim();
    return t || null;
  }
  if (!row) return null;
  const v = resolveTemplate(raw, row, { missingAsEmpty: true, ctx });
  return v.trim() ? v : "(empty)";
}
