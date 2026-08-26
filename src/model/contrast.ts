import type { Block } from "./document";
import { getChildBlocks, isContainerBlock } from "./groups";
import { effectiveZ } from "./layerStack";
import { findBlockAncestors } from "./outlineTree";

const LIGHT_INK = "#f4f7fb";
const DARK_INK = "#1c2430";
/** WCAG-ish floor for edit assist (UI readability, not print). */
const MIN_CONTRAST = 3;

export function isOpaqueFill(bg: string): boolean {
  const t = bg.trim().toLowerCase();
  if (!t || t === "transparent" || t === "none") return false;
  if (t.startsWith("rgba") && /,\s*0\s*\)$/.test(t)) return false;
  return true;
}

/** Relative luminance 0–1 for #rgb / #rrggbb; null when not a hex color. */
export function hexLuminance(color: string): number | null {
  const hex = color.trim();
  const m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function isLightInk(color: string): boolean {
  const L = hexLuminance(color);
  return L != null && L > 0.72;
}

export function isDarkFill(bg: string): boolean {
  if (!isOpaqueFill(bg)) return false;
  const L = hexLuminance(bg);
  return L != null && L < 0.45;
}

export function contrastRatio(fg: string, bg: string): number | null {
  const Lf = hexLuminance(fg);
  const Lb = hexLuminance(bg);
  if (Lf == null || Lb == null) return null;
  const hi = Math.max(Lf, Lb);
  const lo = Math.min(Lf, Lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** If ink/backdrop contrast is weak, pick whitish or dark ink for Edit mode. */
export function ensureReadableInk(ink: string, backdrop: string): string {
  const ratio = contrastRatio(ink, backdrop);
  if (ratio == null || ratio >= MIN_CONTRAST) return ink;
  const Lb = hexLuminance(backdrop);
  if (Lb == null) return ink;
  return Lb < 0.45 ? LIGHT_INK : DARK_INK;
}

function flattenBlocks(blocks: Block[]): Block[] {
  const out: Block[] = [];
  const walk = (list: Block[]) => {
    for (const b of list) {
      out.push(b);
      if (isContainerBlock(b)) walk(getChildBlocks(b));
    }
  };
  walk(blocks);
  return out;
}

function containsCenter(outer: Block, inner: Block): boolean {
  const cx = inner.x + inner.w / 2;
  const cy = inner.y + inner.h / 2;
  return (
    cx >= outer.x &&
    cx <= outer.x + outer.w &&
    cy >= outer.y &&
    cy <= outer.y + outer.h
  );
}

function isPaintedBehind(
  a: Block,
  b: Block,
  orderIndex: Map<string, number>,
): boolean {
  const za = effectiveZ(a);
  const zb = effectiveZ(b);
  if (za !== zb) return za < zb;
  return (orderIndex.get(a.id) ?? 0) < (orderIndex.get(b.id) ?? 0);
}

/**
 * Effective backdrop behind a block for Edit contrast assist:
 * own fill → ancestor fill → topmost opaque block behind center → page bg.
 */
export function resolveEditBackdrop(
  block: Block,
  pageBlocks: Block[],
  pageBackground?: string | null,
): string {
  const own = block.style.background ?? "transparent";
  if (isOpaqueFill(own)) return own;

  const ancestors = findBlockAncestors(pageBlocks, block.id);
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const fill = ancestors[i]!.style.background ?? "transparent";
    if (isOpaqueFill(fill)) return fill;
  }

  const flat = flattenBlocks(pageBlocks);
  const orderIndex = new Map(flat.map((b, i) => [b.id, i]));
  let best: Block | null = null;
  for (const cand of flat) {
    if (cand.id === block.id) continue;
    const fill = cand.style.background ?? "transparent";
    if (!isOpaqueFill(fill)) continue;
    if (!containsCenter(cand, block)) continue;
    if (!isPaintedBehind(cand, block, orderIndex)) continue;
    if (!best || isPaintedBehind(best, cand, orderIndex)) best = cand;
  }
  if (best) {
    const fill = best.style.background ?? "transparent";
    if (isOpaqueFill(fill)) return fill;
  }

  const page = (pageBackground ?? "").trim();
  if (isOpaqueFill(page)) return page;
  return "#ffffff";
}
