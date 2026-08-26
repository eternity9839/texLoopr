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

  it("resolves social cover and post presets", () => {
    expect(
      canvasSizeFromPrefs({ ...basePrefs, canvasPreset: "fbCover" }),
    ).toEqual({
      w: 820,
      h: 312,
      preset: "fbCover",
    });
    expect(
      canvasSizeFromPrefs({ ...basePrefs, canvasPreset: "igStory" }),
    ).toEqual({
      w: 1080,
      h: 1920,
      preset: "igStory",
    });
    expect(
      canvasSizeFromPrefs({ ...basePrefs, canvasPreset: "ytThumb" }),
    ).toEqual({
      w: 1280,
      h: 720,
      preset: "ytThumb",
    });
  });

  it("prefers project artboard over mismatched prefs", () => {
    expect(
      canvasSizeForSession(
        { artboard: "landscape" },
        { ...basePrefs, canvasPreset: "document" },
      ),
    ).toEqual({
      w: CANVAS_PRESETS.landscape.w,
      h: CANVAS_PRESETS.landscape.h,
      preset: "landscape",
    });
  });
});
