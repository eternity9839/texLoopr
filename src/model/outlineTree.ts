import { evaluateCondition } from "./bindings";
import type { Block, CanvasPresetId, Page, Project } from "./document";
import {
  getChildBlocks,
  isContainerBlock,
  matchesQuery,
} from "./groups";
import { effectiveZ } from "./layerStack";
import type { RuntimeContext } from "./expr";
import type { OutputKind, OutputProfile } from "./workflow";
import { OUTPUT_KIND_LABEL } from "./workflow";

export type OutlineSortMode = "document" | "z" | "name" | "type";

export type OutlineRow =
  | { kind: "project"; name: string; pageCount: number; blockCount: number }
  | { kind: "page"; page: Page; count: number; depth: number }
  | {
      kind: "format";
      pageId: string;
      output: OutputProfile;
      label: string;
      depth: number;
    }
  | {
      kind: "block";
      pageId: string;
      block: Block;
      depth: number;
      parentId: string | null;
      effectiveZ: number;
      hasChildren: boolean;
      visibleForOutput: boolean;
      dimmed: boolean;
    };

export type OutlineExpandKey = string;

export function expandKeyProject(): string {
  return "project";
}

export function expandKeyPage(pageId: string): string {
  return `page:${pageId}`;
}

export function expandKeyGroup(blockId: string): string {
  return `group:${blockId}`;
}

export function expandKeyFormat(pageId: string, outputId: string): string {
  return `format:${pageId}:${outputId}`;
}

export function isExpanded(
  expanded: Record<string, boolean>,
  key: string,
  defaultOpen = true,
): boolean {
  if (key in expanded) return Boolean(expanded[key]);
  return defaultOpen;
}

function countBlocksDeep(blocks: Block[]): number {
  let n = 0;
  for (const b of blocks) {
    n += 1;
    if (isContainerBlock(b)) n += countBlocksDeep(getChildBlocks(b));
  }
  return n;
}

export function sortBlocksList(
  blocks: Block[],
  mode: OutlineSortMode,
): Block[] {
  const list = [...blocks];
  switch (mode) {
    case "z":
      return list.sort(
        (a, b) =>
          effectiveZ(b) - effectiveZ(a) ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      );
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "type":
      return list.sort(
        (a, b) =>
          a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
      );
    default:
      return list;
  }
}

function blockVisibleForCondition(
  block: Block,
  outputKind: OutputKind | null,
  runtime: RuntimeContext | undefined,
): boolean {
  if (!block.condition?.trim()) return true;
  if (!runtime) return true;
  try {
    const ctx =
      outputKind != null
        ? {
            ...runtime,
            output: { ...runtime.output, kind: outputKind },
          }
        : runtime;
    return evaluateCondition(block.condition, runtime.data, ctx);
  } catch {
    return true;
  }
}

function walkBlocks(
  blocks: Block[],
  pageId: string,
  depth: number,
  parentId: string | null,
  opts: {
    expanded: Record<string, boolean>;
    query: string;
    sort: OutlineSortMode;
    outputKind: OutputKind | null;
    runtime: RuntimeContext | undefined;
    formatScope: boolean;
    rows: OutlineRow[];
  },
): void {
  const sorted =
    opts.sort === "document" ? blocks : sortBlocksList(blocks, opts.sort);

  for (const block of sorted) {
    const q = opts.query.trim().toLowerCase();
    const hasChildren = isContainerBlock(block) && getChildBlocks(block).length > 0;
    const kindForCheck = opts.formatScope
      ? opts.outputKind
      : ((opts.runtime?.output.kind as OutputKind | undefined) ?? null);
    const visible = blockVisibleForCondition(
      block,
      kindForCheck,
      opts.runtime,
    );
    const matches = !q || matchesQuery(block, q);
    const childRows: OutlineRow[] = [];
    if (hasChildren && isExpanded(opts.expanded, expandKeyGroup(block.id))) {
      walkBlocks(getChildBlocks(block), pageId, depth + 1, block.id, {
        ...opts,
        rows: childRows,
      });
    }
    const subtreeMatches =
      matches || childRows.some((r) => r.kind === "block");
    if (!subtreeMatches && q) continue;

    opts.rows.push({
      kind: "block",
      pageId,
      block,
      depth,
      parentId,
      effectiveZ: effectiveZ(block),
      hasChildren,
      visibleForOutput: visible,
      dimmed: Boolean(block.condition?.trim()) && !visible,
    });
    opts.rows.push(...childRows);
  }
}

export interface BuildOutlineOptions {
  project: Project;
  expanded: Record<string, boolean>;
  query?: string;
  sort?: OutlineSortMode;
  showFormatsInTree?: boolean;
  /** When set, block rows under format branches use this output kind for visibility. */
  formatOutputKind?: OutputKind | null;
  runtime?: RuntimeContext;
}

export function buildOutlineRows(opts: BuildOutlineOptions): OutlineRow[] {
  const {
    project: proj,
    expanded,
    query = "",
    sort = "document",
    showFormatsInTree = false,
    runtime,
  } = opts;

  const rows: OutlineRow[] = [];
  const blockCount = proj.pages.reduce(
    (n, p) => n + countBlocksDeep(p.blocks),
    0,
  );

  rows.push({
    kind: "project",
    name: proj.name,
    pageCount: proj.pages.length,
    blockCount,
  });

  const projectOpen = isExpanded(expanded, expandKeyProject(), true);

  for (const page of proj.pages) {
    if (!projectOpen) continue;

    rows.push({
      kind: "page",
      page,
      count: countBlocksDeep(page.blocks),
      depth: 1,
    });

    if (!isExpanded(expanded, expandKeyPage(page.id))) continue;

    const outputs = (proj.outputs ?? []).filter((o) => o.enabled !== false);

    if (showFormatsInTree && outputs.length > 0) {
      for (const output of outputs) {
        rows.push({
          kind: "format",
          pageId: page.id,
          output,
          label: OUTPUT_KIND_LABEL[output.kind] ?? output.name,
          depth: 2,
        });
        if (
          !isExpanded(expanded, expandKeyFormat(page.id, output.id), false)
        ) {
          continue;
        }
        walkBlocks(page.blocks, page.id, 3, null, {
          expanded,
          query,
          sort,
          outputKind: output.kind,
          runtime,
          formatScope: true,
          rows,
        });
      }
    } else {
      walkBlocks(page.blocks, page.id, 2, null, {
        expanded,
        query,
        sort,
        outputKind: null,
        runtime,
        formatScope: false,
        rows,
      });
    }
  }

  return rows;
}

/** Container chain from page root to block (excluding the block itself). */
export function findBlockAncestors(
  pageBlocks: Block[],
  blockId: string,
): Block[] {
  const path: Block[] = [];
  const walk = (blocks: Block[], trail: Block[]): boolean => {
    for (const b of blocks) {
      if (b.id === blockId) {
        path.push(...trail);
        return true;
      }
      if (isContainerBlock(b)) {
        if (walk(getChildBlocks(b), [...trail, b])) return true;
      }
    }
    return false;
  };
  walk(pageBlocks, []);
  return path;
}

/** Suggested artboard when focusing an output kind in the tree. */
export const OUTPUT_KIND_ARTBOARD: Partial<Record<OutputKind, CanvasPresetId>> =
  {
    preview: "document",
    pdf: "a4",
    print: "a4",
    email: "document",
    sms: "notification",
    mobile: "mobile",
    image: "igPost",
    api: "document",
  };

export function extractMergePaths(block: Block): string[] {
  const paths = new Set<string>();
  const scan = (text: string) => {
    for (const m of text.matchAll(/\{\{\s*([^}#/][^}|]*?)(?:\|[^}]*)?\s*\}\}/g)) {
      const p = m[1]?.trim();
      if (p && p !== "else") paths.add(p);
    }
  };
  if (block.type === "data") {
    const p = String(block.content.path ?? "").trim();
    if (p) paths.add(p);
  }
  if (block.type === "link") {
    if (block.content.target) scan(String(block.content.target));
    if (block.content.label) scan(String(block.content.label));
  }
  if (block.content.text) scan(String(block.content.text));
  if (block.content.src) scan(String(block.content.src));
  if (block.content.alt) scan(String(block.content.alt));
  if (Array.isArray(block.content.items)) {
    for (const item of block.content.items as string[]) scan(String(item));
  }
  if (Array.isArray(block.content.cells)) {
    for (const row of block.content.cells as unknown[]) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) scan(String(cell));
    }
  }
  const sourcePath = String(block.content.sourcePath ?? "").trim();
  if (sourcePath) paths.add(sourcePath);
  const datasetName = String(block.content.datasetName ?? "").trim();
  if (datasetName) paths.add(`dataset:${datasetName}`);
  if (isContainerBlock(block)) {
    for (const child of getChildBlocks(block)) {
      for (const p of extractMergePaths(child)) paths.add(p);
    }
  }
  return [...paths];
}

/** Stable, readable accents for surfaces / groups in the Layers tree. */
const GROUP_ACCENTS = [
  "#0f6b63",
  "#c45c26",
  "#3d5a80",
  "#6b8f71",
  "#b08d57",
  "#8b5e6b",
  "#4a7c9b",
  "#9a6b4f",
] as const;

export function accentForKey(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return GROUP_ACCENTS[(h >>> 0) % GROUP_ACCENTS.length]!;
}

/** Kinship key: nested group id, else the surface (page) id. */
export function outlineKinKey(
  pageId: string,
  parentId: string | null,
): string {
  return parentId ? `group:${parentId}` : `page:${pageId}`;
}

export type BlockBindingHint = {
  fields: string[];
  sourcePath: string;
  datasetName: string;
  label: string;
};

/** Compact binding summary for Layers dots / tooltips. */
export function blockBindingHint(block: Block): BlockBindingHint | null {
  const fields = extractMergePaths(block);
  const sourcePath = String(block.content.sourcePath ?? "").trim();
  const datasetName = String(block.content.datasetName ?? "").trim();
  if (!fields.length && !sourcePath && !datasetName) return null;
  const parts: string[] = [];
  if (datasetName) parts.push(`dataset ${datasetName}`);
  if (sourcePath) parts.push(`rows ← ${sourcePath}`);
  const merges = fields.filter(
    (f) => f !== sourcePath && f !== `dataset:${datasetName}`,
  );
  if (merges.length) parts.push(merges.slice(0, 4).join(", "));
  return {
    fields,
    sourcePath,
    datasetName,
    label: parts.join(" · ") || "Data-bound",
  };
}
