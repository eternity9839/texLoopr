import {
  CANVAS_PRESETS,
  type CanvasPresetId,
  type EditorPrefs,
  type Project,
} from "./document";

function resolveCanvasPreset(
  projectArtboard: CanvasPresetId | undefined,
  prefs: EditorPrefs,
): CanvasPresetId {
  return (projectArtboard ?? prefs.canvasPreset ?? "document") as CanvasPresetId;
}

/** Active artboard size from prefs (defaults stay 720×960). */
export function canvasSizeFromPrefs(prefs: EditorPrefs): {
  w: number;
  h: number;
  preset: CanvasPresetId;
} {
  const preset = resolveCanvasPreset(undefined, prefs);
  const size = CANVAS_PRESETS[preset] ?? CANVAS_PRESETS.document;
  return { w: size.w, h: size.h, preset };
}

/** Prefer the project's owned artboard over session prefs. */
export function canvasSizeForSession(
  project: Pick<Project, "artboard"> | undefined,
  prefs: EditorPrefs,
): {
  w: number;
  h: number;
  preset: CanvasPresetId;
} {
  const preset = resolveCanvasPreset(project?.artboard, prefs);
  const size = CANVAS_PRESETS[preset] ?? CANVAS_PRESETS.document;
  return { w: size.w, h: size.h, preset };
}

export function gridSpacing(prefs: EditorPrefs): { x: number; y: number } {
  const legacy = prefs.gridSize ?? 16;
  return {
    x: Math.max(4, prefs.gridSizeX ?? legacy),
    y: Math.max(4, prefs.gridSizeY ?? legacy),
  };
}
