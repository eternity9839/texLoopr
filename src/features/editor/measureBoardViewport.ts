/** Best-effort board viewport size for fit-to-window zoom (WebKitGTK-safe). */

import {
  isSaneSize,
  readSanitizedViewport,
  VIEWPORT_MAX,
} from "../../ui/viewportMetrics";

/** Reject dimensions that indicate a layout explosion, negatives, or zero. */
export function sanityCap(w: number, h: number): { w: number; h: number } | null {
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  if (w < 2 || h < 2) return null;
  if (w > VIEWPORT_MAX || h > VIEWPORT_MAX) return null;
  const win = readSanitizedViewport();
  const maxW = Math.min(VIEWPORT_MAX, Math.max(win.w * 2, 400));
  const maxH = Math.min(VIEWPORT_MAX, Math.max(win.h * 2, 400));
  if (w > maxW || h > maxH) return null;
  return { w: Math.floor(w), h: Math.floor(h) };
}

/**
 * Measure the scrollport used for fit-zoom.
 * Prefer clientWidth/Height; never trust exploded / negative rects.
 */
export function measureBoardViewport(board: HTMLElement): {
  w: number;
  h: number;
} {
  const fromClient = sanityCap(board.clientWidth, board.clientHeight);
  if (fromClient) return fromClient;

  const rect = board.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    const fromRect = sanityCap(rect.width, rect.height);
    if (fromRect) return fromRect;
  }

  const win = readSanitizedViewport();
  return {
    w: Math.max(320, Math.floor(win.w * 0.7)),
    h: Math.max(240, Math.floor(win.h * 0.7)),
  };
}

export { isSaneSize };
