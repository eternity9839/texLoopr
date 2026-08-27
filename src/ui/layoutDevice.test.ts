// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  artboardClassFromPreset,
  detectLayoutDevice,
  detectShell,
  resolveLayoutMode,
} from "./layoutDevice";

describe("artboardClassFromPreset", () => {
  it("maps print / device / social groups", () => {
    expect(artboardClassFromPreset("a4")).toBe("print");
    expect(artboardClassFromPreset("document")).toBe("print");
    expect(artboardClassFromPreset("mobile")).toBe("device");
    expect(artboardClassFromPreset("igPost")).toBe("social");
  });
});

describe("resolveLayoutMode", () => {
  it("forces wide on desktop when width >= 640", () => {
    expect(resolveLayoutMode("desktop", 700)).toBe("wide");
    expect(resolveLayoutMode("desktop", 500)).toBe("stack");
  });

  it("forces wide on desktop when metrics are corrupt", () => {
    expect(
      resolveLayoutMode("desktop", -90336, { metricsCorrupt: true }),
    ).toBe("wide");
  });

  it("stacks web below 880", () => {
    expect(resolveLayoutMode("web", 900)).toBe("wide");
    expect(resolveLayoutMode("web", 700)).toBe("stack");
  });
});

describe("detectShell / detectLayoutDevice", () => {
  const prev = window.__TEXLOOPER__;

  afterEach(() => {
    window.__TEXLOOPER__ = prev;
  });

  it("detects desktop from profile", () => {
    window.__TEXLOOPER__ = { profile: "desktop" };
    expect(detectShell()).toBe("desktop");
  });

  it("builds a full snapshot", () => {
    window.__TEXLOOPER__ = { profile: "desktop" };
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
    });
    const d = detectLayoutDevice({
      prefs: { density: "compact", rulerUnit: "mm", canvasPreset: "a4" },
      outputDevice: { media: "print", dpi: 300 },
    });
    expect(d.shell).toBe("desktop");
    expect(d.layoutMode).toBe("wide");
    expect(d.artboardClass).toBe("print");
    expect(d.rulerUnit).toBe("mm");
    expect(d.outputDevice.dpi).toBe(300);
  });

  it("stays wide on desktop when WebKit reports negative innerWidth", () => {
    window.__TEXLOOPER__ = { profile: "desktop" };
    Object.defineProperty(window, "innerWidth", {
      value: -90336,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: -105408,
      configurable: true,
    });
    const d = detectLayoutDevice();
    expect(d.layoutMode).toBe("wide");
    expect(d.viewport.w).toBeGreaterThanOrEqual(320);
    expect(d.viewport.h).toBeGreaterThanOrEqual(320);
  });
});
