import { describe, expect, it } from "vitest";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../model/document";
import { MIN_CANVAS_SCALE, fitScale } from "./canvasScale";

describe("fitScale", () => {
  it("returns 1 when the page fits at native size", () => {
    expect(fitScale(PAGE_WIDTH + 40, PAGE_HEIGHT + 40)).toBe(1);
  });

  it("scales uniformly to the tighter dimension", () => {
    // Narrow phone pane: width is the binding constraint
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
});
