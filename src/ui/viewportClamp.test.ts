/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from "vitest";
import { clampToViewport, maxHeightInViewport } from "./viewportClamp";

function stubViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

describe("clampToViewport", () => {
  const prevW = window.innerWidth;
  const prevH = window.innerHeight;

  afterEach(() => {
    stubViewport(prevW, prevH);
  });

  it("keeps the box below and right of the pad", () => {
    stubViewport(1000, 800);
    expect(clampToViewport(-40, -20, 200, 100, 8)).toEqual({
      left: 8,
      top: 8,
    });
  });

  it("flips when the preferred corner would overflow the bottom-right", () => {
    stubViewport(400, 300);
    const r = clampToViewport(350, 250, 200, 120, 8);
    expect(r.left).toBe(400 - 200 - 8);
    expect(r.top).toBe(300 - 120 - 8);
  });

  it("never places top above the pad even for tall menus", () => {
    stubViewport(800, 400);
    const r = clampToViewport(10, 10, 240, 600, 8);
    expect(r.top).toBe(8);
    expect(r.left).toBe(10);
  });
});

describe("maxHeightInViewport", () => {
  const prevH = window.innerHeight;

  afterEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: prevH,
    });
  });

  it("leaves room under the clamped top", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 500,
    });
    expect(maxHeightInViewport(8, 8)).toBe(500 - 8 - 8);
  });
});
