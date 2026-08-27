// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  buildLayoutSnapshot,
  isAnomalousSize,
  publishLayoutSnapshot,
} from "./layoutDiagnostics";

describe("isAnomalousSize", () => {
  it("flags multi-million px sizes", () => {
    expect(isAnomalousSize(52_390_624, 17_687_500, 1280, 800)).toBe(true);
  });

  it("accepts normal board sizes", () => {
    expect(isAnomalousSize(960, 640, 1280, 800)).toBe(false);
  });
});

describe("buildLayoutSnapshot", () => {
  it("builds a snapshot with canvas accuracy fields", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
    });
    document.body.innerHTML = `
      <div id="root" class="app-shell">
        <div class="editor-board__scroll"></div>
        <div class="editor-page--active" style="width:720px;height:960px"></div>
      </div>
    `;
    const page = document.querySelector(".editor-page--active") as HTMLElement;
    page.getBoundingClientRect = () =>
      ({
        width: 720,
        height: 960,
        x: 40,
        y: 40,
        top: 40,
        left: 40,
        right: 760,
        bottom: 1000,
        toJSON: () => ({}),
      }) as DOMRect;

    const snap = buildLayoutSnapshot({
      pageW: 720,
      pageH: 960,
      scale: 1,
      zoomMode: "manual",
      fitW: 720,
      fitH: 960,
      rulerUnit: "mm",
    });

    expect(snap.canvas.cssPxPerIn).toBe(96);
    expect(snap.canvas.displayedPageW).toBe(720);
    expect(snap.canvas.rulerSample).toContain("mm");
    expect(snap.accuracyChecks.pageRectMatchesScale).toBe(true);
    expect(snap.accuracyChecks.uniformScale).toBe(true);
    expect(snap.nodes.some((n) => n.selector === "#root")).toBe(true);
  });

  it("publishes to window.__TEXLOOPER_LAYOUT__", () => {
    const snap = buildLayoutSnapshot({
      pageW: 100,
      pageH: 100,
      scale: 1,
      zoomMode: "fit",
      fitW: 100,
      fitH: 100,
      rulerUnit: "px",
    });
    publishLayoutSnapshot(snap);
    expect(window.__TEXLOOPER_LAYOUT__?.last).toBe(snap);
    expect(window.__TEXLOOPER_LAYOUT__?.history.length).toBeGreaterThan(0);
  });
});
