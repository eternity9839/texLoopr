/** Keep a fixed/absolute box fully inside the visual viewport. */

export type ViewportBox = { left: number; top: number };

/**
 * Clamp `left`/`top` so a box of `width`×`height` stays within the viewport
 * with `pad` pixels of margin. Prefer flipping above/left of the anchor when
 * the preferred side overflows.
 */
export function clampToViewport(
  left: number,
  top: number,
  width: number,
  height: number,
  pad = 8,
): ViewportBox {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxLeft = Math.max(pad, vw - width - pad);
  const maxTop = Math.max(pad, vh - height - pad);

  let nextLeft = left;
  let nextTop = top;

  if (nextLeft + width > vw - pad) {
    nextLeft = Math.min(left, maxLeft);
  }
  if (nextTop + height > vh - pad) {
    nextTop = Math.min(top, maxTop);
  }

  nextLeft = Math.min(maxLeft, Math.max(pad, nextLeft));
  nextTop = Math.min(maxTop, Math.max(pad, nextTop));

  return { left: nextLeft, top: nextTop };
}

/** Max height so a scrollable panel fits in the viewport under `top`. */
export function maxHeightInViewport(top: number, pad = 8): number {
  return Math.max(120, window.innerHeight - top - pad);
}
