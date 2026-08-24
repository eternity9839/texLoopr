/** Document geometry uses integer CSS pixels so export/preview match the model. */

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
