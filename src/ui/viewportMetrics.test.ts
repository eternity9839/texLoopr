// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  applyDesktopShellGeometry,
  isSaneSize,
  readSanitizedViewport,
  webkitCssPxPerDevicePx,
  VIEWPORT_FALLBACK,
} from "./viewportMetrics";

describe("viewportMetrics", () => {
  const prev = window.__TEXLOOPER__;

  afterEach(() => {
    window.__TEXLOOPER__ = prev;
    Object.defineProperty(window, "devicePixelRatio", {
      value: 1,
      configurable: true,
    });
  });

  it("rejects negative and absurd sizes", () => {
    expect(isSaneSize(-90336, -76608)).toBe(false);
    expect(isSaneSize(33_554_432, 33_554_432)).toBe(false);
    expect(isSaneSize(1280, 800)).toBe(true);
  });

  it("detects ±1/96 dpr as css factor 96", () => {
    delete window.__TEXLOOPER__;
    Object.defineProperty(window, "devicePixelRatio", {
      value: -0.010416666977107525,
      configurable: true,
    });
    expect(webkitCssPxPerDevicePx()).toBe(96);
  });

  it("recovers logical size from abs(inner)/factor when dpr is corrupt", () => {
    delete window.__TEXLOOPER__;
    Object.defineProperty(window, "innerWidth", {
      value: -90336,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: -76608,
      configurable: true,
    });
    Object.defineProperty(window, "devicePixelRatio", {
      value: -0.010416666977107525,
      configurable: true,
    });
    const v = readSanitizedViewport();
    expect(v.w).toBe(941);
    expect(v.h).toBe(798);
    expect(v.dpr).toBe(1);
  });

  it("prefers injected Tauri windowSize as logical px", () => {
    window.__TEXLOOPER__ = {
      windowSize: { w: 1440, h: 900 },
      cssWindowSize: { w: 1440 * 96, h: 900 * 96, factor: 96 },
    };
    Object.defineProperty(window, "innerWidth", {
      value: -1,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: -1,
      configurable: true,
    });
    Object.defineProperty(window, "devicePixelRatio", {
      value: -0.01,
      configurable: true,
    });
    const v = readSanitizedViewport();
    expect(v.w).toBe(1440);
    expect(v.h).toBe(900);
    expect(v.dpr).toBe(1);
  });

  it("falls back when metrics are unusable", () => {
    delete window.__TEXLOOPER__;
    Object.defineProperty(window, "innerWidth", {
      value: NaN,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: NaN,
      configurable: true,
    });
    Object.defineProperty(window, "devicePixelRatio", {
      value: 1,
      configurable: true,
    });
    expect(readSanitizedViewport()).toEqual(VIEWPORT_FALLBACK);
  });

  it("applyDesktopShellGeometry pins #root to logical px", () => {
    window.__TEXLOOPER__ = {
      profile: "desktop",
      windowSize: { w: 941, h: 1145 },
      cssWindowSize: { w: 941 * 96, h: 1145 * 96, factor: 96 },
    };
    Object.defineProperty(window, "devicePixelRatio", {
      value: -0.010416666977107525,
      configurable: true,
    });
    document.body.innerHTML = `<div id="root"></div>`;
    applyDesktopShellGeometry({ w: 941, h: 1145, dpr: 1 });
    const root = document.getElementById("root")!;
    expect(root.style.width).toBe("941px");
    expect(root.style.height).toBe("1145px");
    expect(document.documentElement.style.width).toBe("941px");
    expect(document.body.style.width).toBe("941px");
  });
});
