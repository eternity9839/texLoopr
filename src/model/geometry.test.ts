import { describe, expect, it } from "vitest";
import {
  applyMove,
  applyResize,
  footerPin,
  headerPin,
  px,
  rectsIntersect,
  resizeFromHandle,
  resolvePinnedRect,
  snapPx,
} from "./geometry";
import { PAGE_HEIGHT, PAGE_WIDTH } from "./document";

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

  it("detects rect overlap for marquee select", () => {
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(
      true,
    );
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 })).toBe(
      false,
    );
  });

  it("enforces minimum size on resize", () => {
    expect(applyResize({ w: 30, h: 30 }, -100, -100, null)).toEqual({
      w: 24,
      h: 24,
    });
  });
});

describe("resizeFromHandle aspect lock", () => {
  it("keeps ratio on corner drag when lockAspect is set", () => {
    const start = { x: 10, y: 20, w: 100, h: 50 };
    const next = resizeFromHandle(start, "se", 40, 10, {
      lockAspect: true,
      ratio: 2,
    });
    expect(next.w / next.h).toBeCloseTo(2, 1);
    expect(next.x).toBe(10);
    expect(next.y).toBe(20);
  });

  it("does not lock when lockAspect is false", () => {
    const start = { x: 0, y: 0, w: 100, h: 50 };
    const next = resizeFromHandle(start, "se", 50, 0, { lockAspect: false });
    expect(next.w).toBe(150);
    expect(next.h).toBe(50);
  });
});

describe("resolvePinnedRect", () => {
  it("leaves unpinned blocks unchanged", () => {
    expect(
      resolvePinnedRect({ x: 40, y: 50, w: 100, h: 80 }, { top: 64, left: 56 }),
    ).toEqual({ x: 40, y: 50, w: 100, h: 80 });
  });

  it("pins full bleed by default (ignores margins)", () => {
    const r = resolvePinnedRect(
      { x: 10, y: 200, w: 50, h: 48, pin: headerPin() },
      { top: 32, right: 40, bottom: 32, left: 40 },
    );
    expect(r.y).toBe(0);
    expect(r.x).toBe(0);
    expect(r.w).toBe(PAGE_WIDTH);
    expect(r.h).toBe(48);
  });

  it("pins a header across the content width when margins apply", () => {
    const r = resolvePinnedRect(
      { x: 10, y: 200, w: 50, h: 48, pin: headerPin() },
      { top: 32, right: 40, bottom: 32, left: 40 },
      PAGE_WIDTH,
      PAGE_HEIGHT,
      { pinRespectsMargins: true },
    );
    expect(r.y).toBe(32);
    expect(r.x).toBe(40);
    expect(r.w).toBe(PAGE_WIDTH - 80);
    expect(r.h).toBe(48);
  });

  it("pins a footer to the bottom margin when margins apply", () => {
    const r = resolvePinnedRect(
      { x: 100, y: 10, w: 200, h: 40, pin: footerPin() },
      { top: 0, right: 40, bottom: 48, left: 40 },
      PAGE_WIDTH,
      PAGE_HEIGHT,
      { pinRespectsMargins: true },
    );
    expect(r.y).toBe(PAGE_HEIGHT - 48 - 40);
    expect(r.x).toBe(40);
    expect(r.w).toBe(PAGE_WIDTH - 80);
  });

  it("stretches origin header bars edge-to-edge when margins apply", () => {
    const r = resolvePinnedRect(
      { x: 0, y: 0, w: 960, h: 72, pin: headerPin() },
      { top: 64, right: 56, bottom: 72, left: 56 },
      960,
      540,
      { pinRespectsMargins: true },
    );
    expect(r).toEqual({ x: 0, y: 0, w: 960, h: 72 });
  });

  it("stretches a left rail full height when margins apply", () => {
    const r = resolvePinnedRect(
      {
        x: 0,
        y: 0,
        w: 220,
        h: 100,
        pin: { left: true, top: true, bottom: true },
      },
      { top: 0, right: 48, bottom: 40, left: 0 },
      PAGE_WIDTH,
      PAGE_HEIGHT,
      { pinRespectsMargins: true },
    );
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.w).toBe(220);
    expect(r.h).toBe(PAGE_HEIGHT - 40);
  });
});
