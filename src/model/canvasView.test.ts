import { describe, expect, it } from "vitest";
import { canvasSizeForSession, canvasSizeFromPrefs } from "./canvasView";
import { CANVAS_PRESETS, type EditorPrefs } from "./document";

const basePrefs = {
  showGrid: true,
  snap: true,
  density: "compact",
} as EditorPrefs;

describe("canvasSizeFromPrefs", () => {
  it("defaults to the document artboard", () => {
    expect(canvasSizeFromPrefs(basePrefs)).toEqual({
      w: CANVAS_PRESETS.document.w,
      h: CANVAS_PRESETS.document.h,
      preset: "document",
    });
  });

  it("resolves landscape, a5, and mobile presets", () => {
    expect(
      canvasSizeFromPrefs({ ...basePrefs, canvasPreset: "landscape" }),
    ).toEqual({
      w: 960,
      h: 540,
      preset: "landscape",
    });
    expect(
      canvasSizeFromPrefs({ ...basePrefs, canvasPreset: "a5" }),
    ).toEqual({
      w: 505,
      h: 714,
      preset: "a5",
    });
    expect(
      canvasSizeFromPrefs({ ...basePrefs, canvasPreset: "mobile" }),
    ).toEqual({
      w: CANVAS_PRESETS.mobile.w,
      h: CANVAS_PRESETS.mobile.h,
      preset: "mobile",
    });
  });

  it("prefers project artboard over mismatched prefs", () => {
    expect(
      canvasSizeForSession(
        { artboard: "landscape" },
        { ...basePrefs, canvasPreset: "document" },
      ),
    ).toEqual({
      w: 960,
      h: 540,
      preset: "landscape",
    });
  });
});
