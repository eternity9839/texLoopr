import { PAGE_WIDTH, PAGE_HEIGHT } from "../../model/document";

/** Never render the sheet smaller than this, even in tiny panes. */
export const MIN_CANVAS_SCALE = 0.25;

/** Cap so extreme zooms stay usable. */
export const MAX_CANVAS_SCALE = 4;

export type CanvasZoomMode = "fit" | "manual";

export const ZOOM_PRESETS = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4,
] as const;

export function clampZoom(z: number): number {
  if (!Number.isFinite(z) || z <= 0) return 1;
  return Math.min(MAX_CANVAS_SCALE, Math.max(MIN_CANVAS_SCALE, z));
}

/**
 * Uniform, WYSIWYG-preserving canvas scale: the artboard must stay visible
 * and undistorted.
 *
 * @param opts.maxScale — default `1` (legacy: never enlarge). Pass
 *   `MAX_CANVAS_SCALE` for Fit-to-view that can fill a large stage.
 */
export function fitScale(
  availW: number,
  availH: number,
  pageW = PAGE_WIDTH,
  pageH = PAGE_HEIGHT,
  opts?: { maxScale?: number },
): number {
  const w = Math.max(0, availW);
  const h = Math.max(0, availH);
  const max = opts?.maxScale ?? 1;
  if (w === 0 || h === 0) return MIN_CANVAS_SCALE;
  return Math.max(
    MIN_CANVAS_SCALE,
    Math.min(w / pageW, h / pageH, max),
  );
}

/** Resolve the active render scale from prefs + viewport. */
export function resolveCanvasScale(args: {
  mode: CanvasZoomMode;
  zoom: number;
  availW: number;
  availH: number;
  pageW?: number;
  pageH?: number;
  /** Override max fit scale (WebKitGTK CSS-px mode may need ~96). */
  maxScale?: number;
}): number {
  const pageW = args.pageW ?? PAGE_WIDTH;
  const pageH = args.pageH ?? PAGE_HEIGHT;
  const maxScale = args.maxScale ?? MAX_CANVAS_SCALE;
  if (args.mode === "manual") {
    if (!Number.isFinite(args.zoom) || args.zoom <= 0) return 1;
    return Math.min(maxScale, Math.max(MIN_CANVAS_SCALE, args.zoom));
  }
  return fitScale(args.availW, args.availH, pageW, pageH, {
    maxScale,
  });
}

/** Next preset at or above current (for +); or below for −. */
export function stepZoom(current: number, direction: 1 | -1): number {
  const z = clampZoom(current);
  if (direction > 0) {
    const next = ZOOM_PRESETS.find((p) => p > z + 1e-6);
    return next ?? MAX_CANVAS_SCALE;
  }
  for (let i = ZOOM_PRESETS.length - 1; i >= 0; i--) {
    if (ZOOM_PRESETS[i] < z - 1e-6) return ZOOM_PRESETS[i];
  }
  return MIN_CANVAS_SCALE;
}

export function formatZoomPercent(scale: number): string {
  return `${Math.round(clampZoom(scale) * 100)}%`;
}
