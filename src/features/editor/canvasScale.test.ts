import { describe, expect, it } from "vitest";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../model/document";
import {
  MIN_CANVAS_SCALE,
  MAX_CANVAS_SCALE,
  clampZoom,
  fitScale,
  formatZoomPercent,
  resolveCanvasScale,
  stepZoom,
} from "./canvasScale";

describe("fitScale", () => {
  it("returns 1 when the page fits at native size (default max)", () => {
    expect(fitScale(PAGE_WIDTH + 40, PAGE_HEIGHT + 40)).toBe(1);
  });

  it("scales uniformly to the tighter dimension", () => {
    const s = fitScale(360, 1200);
    expect(s).toBeCloseTo(360 / PAGE_WIDTH, 5);
    expect(fitScale(2000, 480)).toBeCloseTo(480 / PAGE_HEIGHT, 5);
  });

  it("keeps the sheet fully inside a small square pane", () => {
    const s = fitScale(300, 300);
    expect(s).toBeLessThanOrEqual(300 / PAGE_WIDTH);
    expect(s * PAGE_HEIGHT).toBeLessThanOrEqual(300 + 1e-9);
  });

  it("clamps degenerate sizes to the minimum scale", () => {
    expect(fitScale(0, 500)).toBe(MIN_CANVAS_SCALE);
    expect(fitScale(-10, -10)).toBe(MIN_CANVAS_SCALE);
  });

  it("can upscale when maxScale allows", () => {
    const s = fitScale(1440, 1920, PAGE_WIDTH, PAGE_HEIGHT, {
      maxScale: MAX_CANVAS_SCALE,
    });
    expect(s).toBeCloseTo(2, 5);
  });
});

describe("resolveCanvasScale", () => {
  it("uses manual zoom when mode is manual", () => {
    expect(
      resolveCanvasScale({
        mode: "manual",
        zoom: 1.5,
        availW: 100,
        availH: 100,
      }),
    ).toBe(1.5);
  });

  it("fits to viewport when mode is fit", () => {
    const s = resolveCanvasScale({
      mode: "fit",
      zoom: 1,
      availW: 360,
      availH: 1200,
    });
    expect(s).toBeCloseTo(360 / PAGE_WIDTH, 5);
  });
});

describe("stepZoom / clampZoom", () => {
  it("steps through presets", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(clampZoom(99)).toBe(MAX_CANVAS_SCALE);
    expect(formatZoomPercent(1)).toBe("100%");
  });
});
