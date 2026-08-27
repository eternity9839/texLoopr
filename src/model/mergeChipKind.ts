import { normalizeDataFieldPath } from "./dataField";
import { TEMPLATE_FILTERS, parseFilterPipe } from "./templateFilters";

/** Ink for runtime vars / native pipe filters in the editor. */
export const RUNTIME_FIELD_COLOR = "#9b87d9";

const RUNTIME_ROOTS = new Set(["vars", "env", "output", "device"]);

/** Filters that mark a chip as “native function” (purple). `default` alone does not. */
const NATIVE_FILTERS = new Set(
  TEMPLATE_FILTERS.filter((f) => f.name !== "default").map((f) => f.name),
);

export type MergeChipKind = "data" | "runtime";

/**
 * Green = bare data path (optional `|default` only).
 * Purple = runtime roots (vars/env/output/device) or any native transform filter.
 */
export function mergeChipKind(
  path: string,
  filters: string[] = [],
): MergeChipKind {
  const normalized = normalizeDataFieldPath(path);
  const { path: cleanPath, filters: fromPath } = parseFilterPipe(normalized);
  const allFilters = [...fromPath, ...filters];
  const top = cleanPath.split(".")[0] ?? "";
  if (RUNTIME_ROOTS.has(top)) return "runtime";
  for (const raw of allFilters) {
    const name = raw.split(":")[0]?.trim() ?? "";
    if (NATIVE_FILTERS.has(name)) return "runtime";
  }
  return "data";
}

/** CSS class for merge / data chips. */
export function mergeChipClassName(
  path: string,
  filters: string[] = [],
  warn = false,
): string {
  const kind = mergeChipKind(path, filters);
  return [
    kind === "runtime" ? "block-runtime" : "block-data",
    warn ? "merge-aware-text__chip--warn" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
