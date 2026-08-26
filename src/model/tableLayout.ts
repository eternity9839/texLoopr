/** Content-aware table height estimates (auto row sizing). */

export type TableHeightMode = "fixed" | "auto";

export function parseTableHeightMode(raw: unknown): TableHeightMode {
  return raw === "auto" ? "auto" : "fixed";
}

export type TableLayoutOpts = {
  /** Block / column width for wrap estimate */
  tableWidth: number;
  cols: number;
  fontSize?: number;
  lineHeight?: number;
  cellPadding?: number;
  rowMinHeight?: number;
  /** 0 = no max */
  rowMaxHeight?: number;
  rowGap?: number;
};

const DEFAULT_FONT = 12;
const DEFAULT_LH = 1.35;
const CHAR_EMP = 0.55;

function clampRow(h: number, min: number, max: number): number {
  let out = Math.max(min, h);
  if (max > 0) out = Math.min(max, out);
  return Math.round(out);
}

/** Estimate one cell's needed height from text (newlines + soft wrap). */
export function estimateCellHeight(
  text: string,
  colWidth: number,
  opts: Pick<
    TableLayoutOpts,
    "fontSize" | "lineHeight" | "cellPadding" | "rowMinHeight" | "rowMaxHeight"
  >,
): number {
  const fontSize = opts.fontSize ?? DEFAULT_FONT;
  const lineHeight = opts.lineHeight ?? DEFAULT_LH;
  const pad = Math.max(0, opts.cellPadding ?? 6) * 2;
  const min = opts.rowMinHeight ?? 28;
  const max = opts.rowMaxHeight ?? 0;
  const usable = Math.max(24, colWidth - pad);
  const charsPerLine = Math.max(4, Math.floor(usable / (fontSize * CHAR_EMP)));
  const raw = String(text ?? "");
  const paragraphs = raw.length ? raw.split("\n") : [""];
  let lines = 0;
  for (const p of paragraphs) {
    const len = p.length || 1;
    lines += Math.max(1, Math.ceil(len / charsPerLine));
  }
  const content = lines * fontSize * lineHeight;
  return clampRow(content + pad, min, max);
}

/** Tallest cell in a row wins. */
export function estimateRowHeight(
  cells: string[],
  opts: TableLayoutOpts,
): number {
  const cols = Math.max(1, opts.cols || cells.length || 1);
  const colW = Math.max(24, opts.tableWidth / cols);
  let tallest = opts.rowMinHeight ?? 28;
  for (const cell of cells) {
    tallest = Math.max(tallest, estimateCellHeight(String(cell ?? ""), colW, opts));
  }
  return tallest;
}

/** Sum of row heights (+ gaps) for an auto-sized table block. */
export function estimateTableHeight(
  matrix: string[][],
  opts: TableLayoutOpts,
): number {
  if (!matrix.length) return opts.rowMinHeight ?? 28;
  const gap = Math.max(0, opts.rowGap ?? 0);
  let total = 0;
  for (let i = 0; i < matrix.length; i++) {
    total += estimateRowHeight(matrix[i] ?? [], opts);
    if (i < matrix.length - 1) total += gap;
  }
  return Math.max(opts.rowMinHeight ?? 28, Math.round(total));
}
