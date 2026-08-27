/**
 * Layout size / WYSIWYG accuracy diagnostics for desktop debugging.
 */

import {
  CSS_PX_PER_IN,
  formatUnitValue,
  type RulerUnit,
} from "../model/rulerUnits";
import {
  detectLayoutDevice,
  type LayoutDevice,
  type DetectLayoutDeviceOpts,
} from "./layoutDevice";
import { webkitCssPxPerDevicePx } from "./viewportMetrics";

export const LAYOUT_DIAG_SELECTORS = [
  "html",
  "body",
  "#root",
  ".app-shell",
  ".app-shell__body",
  ".mode-workspace",
  ".context-bar",
  ".studio-layout",
  ".studio-tools",
  ".studio-main",
  ".studio-inspector",
  ".editor-workspace",
  ".editor-stage",
  ".editor-board",
  ".editor-board__scroll",
  ".editor-fit-area",
  ".editor-fit",
  ".editor-page--active",
] as const;

export type NodeSizeSnapshot = {
  selector: string;
  found: boolean;
  clientWidth?: number;
  clientHeight?: number;
  offsetWidth?: number;
  offsetHeight?: number;
  scrollWidth?: number;
  scrollHeight?: number;
  rect?: { w: number; h: number; x: number; y: number };
  display?: string;
  overflow?: string;
  flex?: string;
  gridTemplateColumns?: string;
  styleSnippet?: string;
};

export type CanvasDiag = {
  pageW: number;
  pageH: number;
  scale: number;
  zoomMode: string;
  fitW: number;
  fitH: number;
  displayedPageW: number;
  cssPxPerIn: number;
  rulerSample: string;
};

export type AccuracyChecks = {
  pageRectMatchesScale: boolean;
  uniformScale: boolean;
  anomalies: string[];
};

export type LayoutSnapshot = {
  at: number;
  window: {
    innerWidth: number;
    innerHeight: number;
    dpr: number;
    sanitized: { w: number; h: number; dpr: number };
    cssFactor: number;
    rawCorrupt: boolean;
  };
  visualViewport: { w: number; h: number } | null;
  layoutDevice: LayoutDevice;
  canvas: CanvasDiag;
  accuracyChecks: AccuracyChecks;
  nodes: NodeSizeSnapshot[];
};

export type CanvasDiagInput = {
  pageW: number;
  pageH: number;
  scale: number;
  zoomMode: string;
  fitW: number;
  fitH: number;
  rulerUnit: RulerUnit;
};

const HISTORY_MAX = 20;

declare global {
  interface Window {
    __TEXLOOPER_LAYOUT__?: {
      last: LayoutSnapshot | null;
      history: LayoutSnapshot[];
    };
  }
}

const ANOMALY_ABS = 8192;

export function isAnomalousSize(
  w: number,
  h: number,
  viewportW: number,
  viewportH: number,
): boolean {
  if (!Number.isFinite(w) || !Number.isFinite(h)) return true;
  if (w < 0 || h < 0) return true;
  const vw = Math.max(1, Math.abs(viewportW));
  const vh = Math.max(1, Math.abs(viewportH));
  const absMax = Math.max(ANOMALY_ABS, vw * 2, vh * 2);
  if (w > absMax || h > absMax) return true;
  if (vw >= 320 && vh >= 320) {
    if (w > vw * 2 || h > vh * 2) return true;
  }
  return false;
}

function snapNode(selector: string): NodeSizeSnapshot {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return { selector, found: false };
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const style = el.getAttribute("style") ?? "";
  return {
    selector,
    found: true,
    clientWidth: el.clientWidth,
    clientHeight: el.clientHeight,
    offsetWidth: el.offsetWidth,
    offsetHeight: el.offsetHeight,
    scrollWidth: el.scrollWidth,
    scrollHeight: el.scrollHeight,
    rect: {
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
    },
    display: cs.display,
    overflow: cs.overflow,
    flex: cs.flex,
    gridTemplateColumns:
      cs.display === "grid" ? cs.gridTemplateColumns : undefined,
    styleSnippet: style.slice(0, 160) || undefined,
  };
}

export function buildLayoutSnapshot(
  canvas: CanvasDiagInput,
  deviceOpts: DetectLayoutDeviceOpts = {},
): LayoutSnapshot {
  const layoutDevice = detectLayoutDevice(deviceOpts);
  const cssFactor = webkitCssPxPerDevicePx();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const vv = window.visualViewport;
  const nodes = LAYOUT_DIAG_SELECTORS.map((s) => snapNode(s));
  const anomalies: string[] = [];
  const saneW = layoutDevice.viewport.w;
  const saneH = layoutDevice.viewport.h;

  for (const n of nodes) {
    if (!n.found || !n.rect) continue;
    if (isAnomalousSize(n.rect.w, n.rect.h, saneW, saneH)) {
      anomalies.push(`${n.selector} rect ${n.rect.w}x${n.rect.h}`);
    }
    if (n.clientWidth != null && n.clientHeight != null) {
      if (isAnomalousSize(n.clientWidth, n.clientHeight, saneW, saneH)) {
        anomalies.push(
          `${n.selector} client ${n.clientWidth}x${n.clientHeight}`,
        );
      }
    }
  }

  const pageNode = nodes.find((n) => n.selector === ".editor-page--active");
  const expectedW = canvas.pageW * canvas.scale;
  // Webview zoom scales painting; getBoundingClientRect usually stays logical.
  const pageRectW = pageNode?.rect?.w ?? NaN;
  const pageRectMatchesScale =
    Number.isFinite(pageRectW) &&
    (Math.abs(pageRectW - expectedW) <= 2 ||
      Math.abs(pageRectW - expectedW * cssFactor) <= 2 * cssFactor);

  if (pageNode?.found && !pageRectMatchesScale) {
    anomalies.push(
      `pageRect ${pageRectW} != pageW*scale ${expectedW.toFixed(1)} (factor=${cssFactor})`,
    );
  }

  const canvasDiag: CanvasDiag = {
    pageW: canvas.pageW,
    pageH: canvas.pageH,
    scale: canvas.scale,
    zoomMode: canvas.zoomMode,
    fitW: canvas.fitW,
    fitH: canvas.fitH,
    displayedPageW: expectedW,
    cssPxPerIn: CSS_PX_PER_IN,
    rulerSample: formatUnitValue(canvas.pageW, canvas.rulerUnit),
  };

  return {
    at: Date.now(),
    window: {
      innerWidth: vw,
      innerHeight: vh,
      dpr: window.devicePixelRatio || 1,
      sanitized: layoutDevice.viewport,
      cssFactor,
      rawCorrupt:
        !Number.isFinite(vw) ||
        !Number.isFinite(vh) ||
        vw < 320 ||
        vh < 320 ||
        vw > 8192 ||
        vh > 8192,
    },
    visualViewport: vv
      ? { w: Math.round(vv.width), h: Math.round(vv.height) }
      : null,
    layoutDevice,
    canvas: canvasDiag,
    accuracyChecks: {
      pageRectMatchesScale,
      uniformScale: true,
      anomalies,
    },
    nodes,
  };
}

export function publishLayoutSnapshot(snapshot: LayoutSnapshot): void {
  const history = window.__TEXLOOPER_LAYOUT__?.history ?? [];
  history.push(snapshot);
  while (history.length > HISTORY_MAX) history.shift();
  window.__TEXLOOPER_LAYOUT__ = { last: snapshot, history };
  console.info("[texlooper:layout]", JSON.stringify(snapshot));
}

export function takeAndPublishLayoutSnapshot(
  canvas: CanvasDiagInput,
  deviceOpts: DetectLayoutDeviceOpts = {},
): LayoutSnapshot {
  const snap = buildLayoutSnapshot(canvas, deviceOpts);
  publishLayoutSnapshot(snap);
  return snap;
}
