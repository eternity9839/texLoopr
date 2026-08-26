import { describe, expect, it } from "vitest";
import {
  CSS_PX_PER_IN,
  formatRulerHover,
  formatUnitValue,
  pxToUnit,
  unitToPx,
} from "./rulerUnits";

describe("rulerUnits", () => {
  it("converts inches at 96dpi", () => {
    expect(pxToUnit(CSS_PX_PER_IN, "in")).toBe(1);
    expect(unitToPx(1, "in")).toBe(CSS_PX_PER_IN);
  });

  it("converts cm/mm round-trip", () => {
    expect(pxToUnit(CSS_PX_PER_IN, "cm")).toBeCloseTo(2.54, 5);
    expect(unitToPx(25.4, "mm")).toBeCloseTo(CSS_PX_PER_IN, 5);
  });

  it("formats hover with px and metric", () => {
    expect(formatRulerHover(96, "px")).toBe("96 px");
    expect(formatRulerHover(96, "in")).toBe("96 px · 1.00 in");
    expect(formatUnitValue(96, "cm")).toBe("2.54 cm");
  });
});
