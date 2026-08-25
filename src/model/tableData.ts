import type { DataRow } from "./bindings";
import { resolveItemsPath, resolveTemplate } from "./bindings";
import type { RuntimeContext } from "./expr";

export type TableDataSource = {
  datasetName?: string;
  sourcePath?: string;
  header?: boolean;
  cells?: string[][];
};

function asObjectRows(items: unknown[]): Record<string, unknown>[] {
  return items.flatMap((it) =>
    it && typeof it === "object" && !Array.isArray(it)
      ? [it as Record<string, unknown>]
      : [],
  );
}

/** Slug a header label toward a likely field key. */
export function fieldKeyFromHeader(label: string): string {
  return label
    .trim()
    .replace(/\{\{\s*|\s*\}\}/g, "")
    .replace(/\|.*$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

/**
 * Resolve body rows for a table: named dataset (optionally filtered by
 * keyField vs primary row) or JSON array at sourcePath on the primary row.
 */
export function resolveTableSourceRows(
  content: TableDataSource,
  row: DataRow | undefined,
  runtime?: RuntimeContext,
): Record<string, unknown>[] {
  const datasetName = String(content.datasetName ?? "").trim();
  if (datasetName && runtime?.datasets) {
    const pack = runtime.datasets[datasetName];
    if (pack && typeof pack === "object" && !Array.isArray(pack)) {
      const rec = pack as Record<string, unknown>;
      const rows = Array.isArray(rec.rows) ? asObjectRows(rec.rows) : [];
      const keyField = String(rec.keyField ?? "").trim();
      if (keyField && row && row[keyField] != null && String(row[keyField]) !== "") {
        const want = String(row[keyField]);
        return rows.filter((r) => String(r[keyField] ?? "") === want);
      }
      return rows;
    }
  }

  const sourcePath = String(content.sourcePath ?? "").trim();
  if (sourcePath) {
    try {
      return asObjectRows(resolveItemsPath(sourcePath, row, runtime));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Column templates: prefer an explicit template row (cells[1] when header),
 * else synthesize `{{field}}` from header labels.
 */
export function tableColumnTemplates(
  cells: string[][],
  header: boolean,
): string[] {
  if (header) {
    const headers = cells[0] ?? [];
    const tpl = cells[1];
    if (tpl?.some((c) => String(c).includes("{{"))) return tpl.map(String);
    return headers.map((h) => `{{${fieldKeyFromHeader(String(h))}}}`);
  }
  const first = cells[0] ?? [];
  if (first.some((c) => String(c).includes("{{"))) return first.map(String);
  return first.map((h) => `{{${fieldKeyFromHeader(String(h))}}}`);
}

/** Render one data row into display cell strings. */
export function mapTableItemToCells(
  item: Record<string, unknown>,
  templates: string[],
  preview: boolean,
  runtime?: RuntimeContext,
): string[] {
  return templates.map((tpl) => {
    const raw = String(tpl ?? "");
    if (!raw.includes("{{")) {
      // Literal header-as-key fallback
      const key = fieldKeyFromHeader(raw);
      const direct = item[raw] ?? item[key];
      if (direct !== undefined && direct !== null) return String(direct);
      return raw;
    }
    return resolveTemplate(raw, item as DataRow, {
      missingAsEmpty: preview,
      ctx: runtime,
    });
  });
}
