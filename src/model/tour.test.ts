import { describe, expect, it } from "vitest";
import { getTourSteps, TOUR_STEPS } from "./tour";

describe("tour", () => {
  it("exposes five localized steps", () => {
    expect(TOUR_STEPS).toHaveLength(5);
    expect(getTourSteps("en").map((s) => s.id)).toEqual([
      "welcome",
      "edit",
      "inspector",
      "data",
      "preview",
    ]);
    expect(getTourSteps("fr")).toHaveLength(5);
  });
});
