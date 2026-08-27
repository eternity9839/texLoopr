import { describe, expect, it } from "vitest";
import { rulerTickPeriod } from "./EditorRulers";

describe("rulerTickPeriod", () => {
  it("scales with canvas zoom", () => {
    expect(rulerTickPeriod(1)).toBe(8);
    expect(rulerTickPeriod(0.5)).toBe(4);
    expect(rulerTickPeriod(2)).toBe(16);
  });

  it("never collapses below 4px", () => {
    expect(rulerTickPeriod(0.1)).toBe(4);
  });
});
