// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { measureBoardViewport, sanityCap } from "./measureBoardViewport";

describe("sanityCap", () => {
  it("accepts normal board sizes", () => {
    expect(sanityCap(960, 640)).toEqual({ w: 960, h: 640 });
  });

  it("rejects exploded dimensions", () => {
    expect(sanityCap(52_390_624, 17_687_500)).toBeNull();
  });

  it("rejects negative sizes", () => {
    expect(sanityCap(-90336, -105408)).toBeNull();
  });

  it("rejects zero / tiny sizes", () => {
    expect(sanityCap(0, 0)).toBeNull();
    expect(sanityCap(1, 100)).toBeNull();
  });
});

describe("measureBoardViewport", () => {
  it("uses clientWidth/Height when sane", () => {
    const board = document.createElement("div");
    Object.defineProperty(board, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(board, "clientHeight", { value: 600, configurable: true });
    expect(measureBoardViewport(board)).toEqual({ w: 800, h: 600 });
  });

  it("falls back to sanitized window when client size is zero", () => {
    const board = document.createElement("div");
    Object.defineProperty(board, "clientWidth", { value: 0, configurable: true });
    Object.defineProperty(board, "clientHeight", { value: 0, configurable: true });
    board.getBoundingClientRect = () =>
      ({
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const size = measureBoardViewport(board);
    expect(size.w).toBeGreaterThanOrEqual(320);
    expect(size.h).toBeGreaterThanOrEqual(240);
    expect(size.w).toBeLessThanOrEqual(8192);
  });

  it("ignores exploded and negative bounding rects", () => {
    const board = document.createElement("div");
    Object.defineProperty(board, "clientWidth", { value: 0, configurable: true });
    Object.defineProperty(board, "clientHeight", { value: 0, configurable: true });
    board.getBoundingClientRect = () =>
      ({
        width: -89386,
        height: -94933,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    window.__TEXLOOPER__ = { windowSize: { w: 1280, h: 800 } };

    const size = measureBoardViewport(board);
    expect(size.w).toBeGreaterThanOrEqual(320);
    expect(size.h).toBeGreaterThanOrEqual(240);
    expect(size.w).toBeLessThanOrEqual(8192);
  });
});
