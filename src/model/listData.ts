/**
 * Resolve list items from static content, a named dataset, or a JSON path.
 * Supports nested hierarchies via childrenPath / nested `children` arrays.
 */
import type { DataRow } from "./bindings";
import { resolveItemsPath, resolveTemplate } from "./bindings";
import type { RuntimeContext } from "./expr";
import { noteIssue } from "../state/issueLog";
import { resolveTableSourceRows } from "./tableData";

export type ListItemNode = {
  text: string;
  children?: ListItemNode[];
};

export type ListDataSource = {
  items?: unknown;
  datasetName?: string;
  sourcePath?: string;
  /** Template for each row/object, e.g. `{{label}}` or `{{name}}`. */
  itemText?: string;
  /** Field on each object that holds nested children (default: children). */
  childrenPath?: string;
};

function asObject(it: unknown): Record<string, unknown> | null {
  if (it && typeof it === "object" && !Array.isArray(it)) {
    return it as Record<string, unknown>;
  }
  return null;
}

function defaultItemText(row: Record<string, unknown>): string {
  for (const key of ["label", "text", "name", "title", "item"]) {
    if (row[key] != null && String(row[key]).trim() !== "") {
      return String(row[key]);
    }
  }
  const first = Object.values(row).find(
    (v) => v != null && typeof v !== "object",
  );
  return first != null ? String(first) : "";
}

function childrenFromRow(
  row: Record<string, unknown>,
  childrenPath: string,
): unknown[] {
  const path = childrenPath.trim() || "children";
  const raw = row[path];
  if (Array.isArray(raw)) return raw;
  return [];
}

/** Normalize authoring / imported list content into a tree. */
export function normalizeListItems(raw: unknown): ListItemNode[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((it) => {
    if (typeof it === "string") return [{ text: it }];
    const obj = asObject(it);
    if (!obj) return [];
    const text =
      obj.text != null
        ? String(obj.text)
        : obj.label != null
          ? String(obj.label)
          : defaultItemText(obj);
    const childRaw = obj.children ?? obj.items;
    const children = Array.isArray(childRaw)
      ? normalizeListItems(childRaw)
      : undefined;
    return [{ text, children: children?.length ? children : undefined }];
  });
}

function rowsToNodes(
  rows: Record<string, unknown>[],
  itemText: string,
  childrenPath: string,
  _row: DataRow | undefined,
  runtime: RuntimeContext | undefined,
): ListItemNode[] {
  const tpl = itemText.trim();
  return rows.map((r) => {
    const dataRow = r as DataRow;
    const text = tpl
      ? resolveTemplate(tpl, dataRow, {
          missingAsEmpty: true,
          ctx: runtime
            ? {
                ...runtime,
                data: { ...runtime.data, ...dataRow },
              }
            : undefined,
        })
      : defaultItemText(r);
    const nested = childrenFromRow(r, childrenPath);
    const childRows = nested.flatMap((n) => {
      const o = asObject(n);
      return o ? [o] : typeof n === "string" ? [{ text: n }] : [];
    });
    const children =
      childRows.length > 0
        ? rowsToNodes(childRows, tpl || "{{text}}", childrenPath, _row, runtime)
        : undefined;
    return { text, children };
  });
}

/**
 * Resolve the list tree for preview/edit display.
 * Priority: named dataset / sourcePath → static `items`.
 */
export function resolveListItems(
  content: ListDataSource,
  row: DataRow | undefined,
  runtime?: RuntimeContext,
): ListItemNode[] {
  const datasetName = String(content.datasetName ?? "").trim();
  const sourcePath = String(content.sourcePath ?? "").trim();
  const itemText = String(content.itemText ?? "").trim();
  const childrenPath = String(content.childrenPath ?? "children").trim() || "children";

  if (datasetName || sourcePath) {
    const rows = resolveTableSourceRows(
      { datasetName, sourcePath },
      row,
      runtime,
    );
    if (datasetName && rows.length === 0 && runtime?.datasets?.[datasetName]) {
      // resolveTableSourceRows already notes issues
    }
    if (!datasetName && sourcePath && rows.length === 0) {
      try {
        const items = resolveItemsPath(sourcePath, row, runtime);
        if (items.length && items.every((x) => typeof x === "string")) {
          return items.map((t) => ({ text: String(t) }));
        }
      } catch {
        noteIssue({
          category: "dataset",
          severity: "warning",
          message: `List path «${sourcePath}» produced no items`,
          detail: sourcePath,
          source: "preview",
        });
      }
    }
    return rowsToNodes(rows, itemText, childrenPath, row, runtime);
  }

  return normalizeListItems(content.items);
}

/** Flat strings for simple editors (one line per leaf, indented with tabs). */
export function listItemsToIndentedText(nodes: ListItemNode[], depth = 0): string {
  const lines: string[] = [];
  for (const n of nodes) {
    lines.push(`${"\t".repeat(depth)}${n.text}`);
    if (n.children?.length) {
      lines.push(listItemsToIndentedText(n.children, depth + 1));
    }
  }
  return lines.join("\n");
}

/** Parse indented textarea into a hierarchy (tabs or 2+ spaces). */
export function indentedTextToListItems(text: string): ListItemNode[] {
  const lines = text.split("\n");
  const root: ListItemNode[] = [];
  const stack: { depth: number; node: ListItemNode }[] = [];

  for (const line of lines) {
    if (line.trim() === "" && lines.length === 1) continue;
    const match = line.match(/^(\t+| {2,})?(.*)$/);
    const indent = match?.[1] ?? "";
    const depth = indent.includes("\t")
      ? indent.length
      : Math.floor(indent.length / 2);
    const itemText = (match?.[2] ?? "").replace(/\s+$/, "");
    const node: ListItemNode = { text: itemText };

    while (stack.length && stack[stack.length - 1]!.depth >= depth) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      const parent = stack[stack.length - 1]!.node;
      parent.children = parent.children ?? [];
      parent.children.push(node);
    }
    stack.push({ depth, node });
  }
  return root;
}
