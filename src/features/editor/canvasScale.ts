import { PAGE_WIDTH, PAGE_HEIGHT } from "../../model/document";

/** Never render the sheet smaller than this, even in tiny panes. */
export const MIN_CANVAS_SCALE = 0.15;

/**
 * Uniform, WYSIWYG-preserving canvas scale: the whole 720×960 page must
 * stay visible and undistorted regardless of how much space the studio
 * gives the canvas. Output fidelity beats responsiveness here.
 */
export function fitScale(availW: number, availH: number): number {
  const w = Math.max(0, availW);
  const h = Math.max(0, availH);
  if (w === 0 || h === 0) return MIN_CANVAS_SCALE;
  return Math.max(
    MIN_CANVAS_SCALE,
    Math.min(w / PAGE_WIDTH, h / PAGE_HEIGHT, 1),
  );
}
