import { describe, expect, it } from "vitest";
import {
  applyMove,
  applyResize,
  px,
  resizeFromHandle,
  snapPx,
} from "./geometry";

describe("geometry", () => {
  it("rounds to integer pixels", () => {
    expect(px(10.4)).toBe(10);
    expect(px(10.5)).toBe(11);
  });

  it("resizes with 1px accuracy from origin", () => {
    expect(applyResize({ w: 100, h: 80 }, 13.2, -4.6, null)).toEqual({
      w: 113,
      h: 75,
    });
  });

  it("snaps move when step provided", () => {
    expect(applyMove({ x: 10, y: 10 }, 5, 3, 8)).toEqual({ x: 16, y: 16 });
    expect(snapPx(15, 8)).toBe(16);
  });

  it("enforces minimum size on resize", () => {
    expect(applyResize({ w: 30, h: 30 }, -100, -100, null)).toEqual({
      w: 24,
      h: 24,
    });
  });

  it("keeps opposite edge fixed when resizing west", () => {
    const next = resizeFromHandle(
      { x: 100, y: 40, w: 200, h: 100 },
      "w",
      20,
      0,
    );
    expect(next.x + next.w).toBe(300);
    expect(next.w).toBe(180);
    expect(next.y).toBe(40);
    expect(next.h).toBe(100);
  });

  it("resizes southeast by integer deltas", () => {
    expect(
      resizeFromHandle({ x: 10, y: 10, w: 100, h: 80 }, "se", 12.4, 7.6),
    ).toEqual({ x: 10, y: 10, w: 112, h: 88 });
  });
});
