/** Document geometry uses integer CSS pixels so export/preview match the model. */

import type { Block, BlockPin, PageMargins } from "./document";
import { PAGE_HEIGHT, PAGE_WIDTH, normalizeMargins } from "./document";

export const MIN_BLOCK_W = 24;
export const MIN_BLOCK_H = 24;

export function px(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function clampPx(n: number, min: number, max = Number.POSITIVE_INFINITY): number {
  return px(Math.min(max, Math.max(min, n)));
}

export function snapPx(n: number, step: number): number {
  if (step <= 1) return px(n);
  return px(Math.round(n / step) * step);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function normalizeRect(rect: Partial<Rect>, defaults: Rect): Rect {
  return {
    x: clampPx(rect.x ?? defaults.x, 0),
    y: clampPx(rect.y ?? defaults.y, 0),
    w: clampPx(rect.w ?? defaults.w, MIN_BLOCK_W),
    h: clampPx(rect.h ?? defaults.h, MIN_BLOCK_H),
  };
}

/** True when two axis-aligned rects overlap (touching edges counts). */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Apply move: snap only position when enabled; never fractional pixels. */
export function applyMove(
  start: { x: number; y: number },
  dx: number,
  dy: number,
  snapStep: number | null,
): Pick<Rect, "x" | "y"> {
  let x = start.x + dx;
  let y = start.y + dy;
  if (snapStep != null && snapStep > 1) {
    x = snapPx(x, snapStep);
    y = snapPx(y, snapStep);
  }
  return { x: clampPx(x, 0), y: clampPx(y, 0) };
}

/** Apply resize from a fixed origin corner; 1px accurate (snap optional). */
export function applyResize(
  start: { w: number; h: number },
  dw: number,
  dh: number,
  snapStep: number | null,
): Pick<Rect, "w" | "h"> {
  let w = start.w + dw;
  let h = start.h + dh;
  if (snapStep != null && snapStep > 1) {
    w = snapPx(w, snapStep);
    h = snapPx(h, snapStep);
  }
  return {
    w: clampPx(w, MIN_BLOCK_W),
    h: clampPx(h, MIN_BLOCK_H),
  };
}

export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

/** Snap every edge/corner of a rect exactly onto the grid. */
export function snapRect(rect: Rect, step: number): Rect {
  if (step <= 1) return rect;
  const x = snapPx(rect.x, step);
  const y = snapPx(rect.y, step);
  const right = snapPx(rect.x + rect.w, step);
  const bottom = snapPx(rect.y + rect.h, step);
  return {
    x,
    y,
    w: Math.max(MIN_BLOCK_W, px(right - x)),
    h: Math.max(MIN_BLOCK_H, px(bottom - y)),
  };
}

/** Resize from a fixed opposite edge/corner; integer CSS px for output fidelity. */
export function resizeFromHandle(
  start: Rect,
  handle: ResizeHandle,
  dw: number,
  dh: number,
): Rect {
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  let { x, y, w, h } = start;

  if (handle.includes("e")) {
    w = Math.max(MIN_BLOCK_W, px(start.w + dw));
  }
  if (handle.includes("s")) {
    h = Math.max(MIN_BLOCK_H, px(start.h + dh));
  }
  if (handle.includes("w")) {
    w = Math.max(MIN_BLOCK_W, px(start.w - dw));
    x = px(right - w);
    if (x < 0) {
      w = px(right);
      x = 0;
    }
  }
  if (handle.includes("n")) {
    h = Math.max(MIN_BLOCK_H, px(start.h - dh));
    y = px(bottom - h);
    if (y < 0) {
      h = px(bottom);
      y = 0;
    }
  }

  return { x: px(x), y: px(y), w: px(w), h: px(h) };
}

export interface ResolvePinnedOptions {
  /** When true, pinned edges inset by page margins. Default false (full bleed). */
  pinRespectsMargins?: boolean;
}

/** Apply edge pins so headers/footers/sidebars stay glued to the surface. */
export function resolvePinnedRect(
  block: Pick<Block, "x" | "y" | "w" | "h" | "pin">,
  margins?: Partial<PageMargins> | null,
  pageW = PAGE_WIDTH,
  pageH = PAGE_HEIGHT,
  opts?: ResolvePinnedOptions,
): Rect {
  const pin = block.pin;
  if (!pin || (!pin.top && !pin.bottom && !pin.left && !pin.right)) {
    return {
      x: px(block.x),
      y: px(block.y),
      w: px(block.w),
      h: px(block.h),
    };
  }
  const respect = opts?.pinRespectsMargins === true;
  const base = respect
    ? normalizeMargins(margins ?? undefined)
    : { top: 0, right: 0, bottom: 0, left: 0 };
  /** Origin/bottom chrome ignores content margins on the pinned edges. */
  const m = respect
    ? {
        top: pin.top && block.y <= 0 ? 0 : base.top,
        right: pin.right && block.x <= 0 && pin.left ? 0 : base.right,
        bottom:
          pin.bottom && block.y + block.h >= pageH - 16 ? 0 : base.bottom,
        left: pin.left && block.x <= 0 ? 0 : base.left,
      }
    : base;
  let { x, y, w, h } = {
    x: px(block.x),
    y: px(block.y),
    w: px(block.w),
    h: px(block.h),
  };

  if (pin.left && pin.right) {
    x = m.left;
    w = Math.max(MIN_BLOCK_W, pageW - m.left - m.right);
  } else if (pin.left) {
    x = m.left;
  } else if (pin.right) {
    x = Math.max(0, pageW - m.right - w);
  }

  if (pin.top && pin.bottom) {
    y = m.top;
    h = Math.max(MIN_BLOCK_H, pageH - m.top - m.bottom);
  } else if (pin.top) {
    y = m.top;
  } else if (pin.bottom) {
    y = Math.max(0, pageH - m.bottom - h);
  }

  return { x: px(x), y: px(y), w: px(w), h: px(h) };
}

export function pinIsActive(pin?: BlockPin | null): boolean {
  return Boolean(pin && (pin.top || pin.bottom || pin.left || pin.right));
}

export function headerPin(): BlockPin {
  return { top: true, left: true, right: true };
}

export function footerPin(): BlockPin {
  return { bottom: true, left: true, right: true };
}
