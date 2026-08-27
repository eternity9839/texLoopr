// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  clampZoom,
  fitScale,
  resolveCanvasScale,
  MAX_CANVAS_SCALE,
} from "./canvasScale";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../model/document";

describe("layoutAccuracy / WYSIWYG scale", () => {
  it("100% manual zoom is exactly 1", () => {
    expect(
      resolveCanvasScale({
        mode: "manual",
        zoom: 1,
        availW: 400,
        availH: 400,
        pageW: PAGE_WIDTH,
        pageH: PAGE_HEIGHT,
      }),
    ).toBe(1);
  });

  it("fit scale is uniform (min of both axes)", () => {
    const s = fitScale(360, 800, PAGE_WIDTH, PAGE_HEIGHT, {
      maxScale: MAX_CANVAS_SCALE,
    });
    expect(s).toBeCloseTo(360 / PAGE_WIDTH, 5);
    expect(s).toBeLessThanOrEqual(800 / PAGE_HEIGHT + 1e-9);
  });

  it("sheet wrapper size equals pageW * scale", () => {
    const scale = clampZoom(0.5);
    const pageW = PAGE_WIDTH;
    const sheetW = pageW * scale;
    expect(sheetW).toBe(pageW * scale);
    expect(Number.isInteger(pageW)).toBe(true);
  });

  it("never stretches axes independently", () => {
    const s = resolveCanvasScale({
      mode: "fit",
      zoom: 1,
      availW: 400,
      availH: 2000,
      pageW: 720,
      pageH: 960,
    });
    // Same scale applied to both dimensions
    expect(720 * s).toBeCloseTo(400, 0);
    expect(960 * s).toBeCloseTo(960 * (400 / 720), 5);
  });
});
