import type { DataRow } from "./bindings";
import { resolveItemsPath, resolveTemplate } from "./bindings";
import type { RuntimeContext } from "./expr";
import { noteIssue } from "../state/issueLog";

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
    if (!pack) {
      noteIssue({
        category: "dataset",
        severity: "error",
        message: `Unknown dataset «${datasetName}»`,
        detail: datasetName,
        source: "preview",
      });
      return [];
    }
    if (pack && typeof pack === "object" && !Array.isArray(pack)) {
      const rec = pack as Record<string, unknown>;
      const rows = Array.isArray(rec.rows) ? asObjectRows(rec.rows) : [];
      const keyField = String(rec.keyField ?? "").trim();
      if (keyField && row && row[keyField] != null && String(row[keyField]) !== "") {
        const want = String(row[keyField]);
        const filtered = rows.filter((r) => String(r[keyField] ?? "") === want);
        if (filtered.length === 0) {
          noteIssue({
            category: "dataset",
            severity: "warning",
            message: `No rows in «${datasetName}» match ${keyField}=${want}`,
            detail: `${datasetName}.${keyField}`,
            source: "preview",
          });
        }
        return filtered;
      }
      return rows;
    }
  } else if (datasetName && !runtime?.datasets) {
    noteIssue({
      category: "dataset",
      severity: "error",
      message: `Dataset «${datasetName}» is not available in this context`,
      detail: datasetName,
      source: "preview",
    });
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
    if (
      tpl?.some(
        (c) => String(c).includes("{{") || String(c).startsWith("="),
      )
    ) {
      return tpl.map(String);
    }
    return headers.map((h) => `{{${fieldKeyFromHeader(String(h))}}}`);
  }
  const first = cells[0] ?? [];
  if (
    first.some((c) => String(c).includes("{{") || String(c).startsWith("="))
  ) {
    return first.map(String);
  }
  return first.map((h) => `{{${fieldKeyFromHeader(String(h))}}}`);
}

/** Render one data row into display cell strings. */
export function mapTableItemToCells(
  item: Record<string, unknown>,
  templates: string[],
  preview: boolean,
  runtime?: RuntimeContext,
  options: { diagnose?: boolean } = {},
): string[] {
  return templates.map((tpl) => {
    const raw = String(tpl ?? "");
    // Prefix "=" forces a literal column (no field lookup / merge).
    if (raw.startsWith("=")) return raw.slice(1);
    if (!raw.includes("{{")) {
      const key = fieldKeyFromHeader(raw);
      const direct = item[raw] ?? item[key];
      if (direct !== undefined && direct !== null) return String(direct);
      if (options.diagnose) {
        noteIssue({
          category: "missing-data",
          severity: "warning",
          message: `Table column missing «${raw}»`,
          detail: raw,
          source: "preview",
        });
      }
      return raw;
    }
    return resolveTemplate(raw, item as DataRow, {
      missingAsEmpty: preview,
      ctx: runtime,
      diagnose: options.diagnose,
    });
  });
}

/** True when a column template uses the `=` literal prefix. */
export function isLiteralColumnTemplate(tpl: string): boolean {
  return String(tpl ?? "").startsWith("=");
}

export function toLiteralColumnTemplate(text: string): string {
  const t = String(text ?? "");
  if (t.startsWith("=")) return t;
  return `=${t}`;
}

export function fromLiteralColumnTemplate(tpl: string): string {
  const t = String(tpl ?? "");
  return t.startsWith("=") ? t.slice(1) : t;
}
