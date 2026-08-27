// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  CSS_PX_PER_IN,
  formatUnitValue,
  pxToUnit,
  unitToPx,
} from "./rulerUnits";

describe("rulerUnits", () => {
  it("uses 96 CSS px per inch", () => {
    expect(CSS_PX_PER_IN).toBe(96);
    expect(unitToPx(1, "in")).toBe(96);
    expect(pxToUnit(96, "in")).toBe(1);
  });

  it("roundtrips mm / cm / in", () => {
    for (const unit of ["mm", "cm", "in"] as const) {
      const px = 720;
      const back = unitToPx(pxToUnit(px, unit), unit);
      expect(back).toBeCloseTo(px, 5);
    }
  });

  it("formats A4-ish width as ~189 mm", () => {
    // 714 CSS px ≈ 714/96*25.4 mm
    const sample = formatUnitValue(714, "mm");
    expect(sample).toContain("mm");
    const mm = pxToUnit(714, "mm");
    expect(mm).toBeCloseTo(188.9, 0);
  });
});
