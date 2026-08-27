import type { Block, PageMargins } from "./document";
import { effectiveZ } from "./layerStack";
import { type Rect, resolvePinnedRect } from "./geometry";

export function blockLayoutRect(
  block: Block,
  pageW: number,
  pageH: number,
  margins?: Partial<PageMargins> | null,
  pinRespectsMargins?: boolean,
): Rect {
  return resolvePinnedRect(block, margins, pageW, pageH, {
    pinRespectsMargins: pinRespectsMargins === true,
  });
}

export function pointInRect(
  x: number,
  y: number,
  rect: Pick<Rect, "x" | "y" | "w" | "h">,
): boolean {
  return (
    x >= rect.x &&
    x < rect.x + rect.w &&
    y >= rect.y &&
    y < rect.y + rect.h
  );
}

/** Blocks under a page point, front-most first (narrower ties break toward front). */
export function blocksAtPoint(
  blocks: Block[],
  x: number,
  y: number,
  pageW: number,
  pageH: number,
  margins?: Partial<PageMargins> | null,
  pinRespectsMargins?: boolean,
): Block[] {
  const hits = blocks
    .filter((b) => {
      if (b.locked) return false;
      const r = blockLayoutRect(
        b,
        pageW,
        pageH,
        margins,
        pinRespectsMargins,
      );
      return pointInRect(x, y, r);
    })
    .sort((a, b) => {
      const dz = effectiveZ(b) - effectiveZ(a);
      if (dz !== 0) return dz;
      const ra = blockLayoutRect(
        a,
        pageW,
        pageH,
        margins,
        pinRespectsMargins,
      );
      const rb = blockLayoutRect(
        b,
        pageW,
        pageH,
        margins,
        pinRespectsMargins,
      );
      return ra.w * ra.h - rb.w * rb.h;
    });
  return hits;
}

/** Large low layers that should not block clicks to narrower blocks below. */
export function isBackdropBlock(
  block: Block,
  layout: Rect,
  pageW: number,
  pageH: number,
): boolean {
  if (block.type !== "shape" && block.type !== "picture") return false;
  if (effectiveZ(block) > 1) return false;
  const pageArea = Math.max(1, pageW * pageH);
  return (layout.w * layout.h) / pageArea >= 0.18;
}
