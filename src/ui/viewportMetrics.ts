/**
 * Sanitized viewport metrics for WebKitGTK (Tauri Linux).
 *
 * Observed corruption: devicePixelRatio ≈ ±1/96. Host recovery is
 * webview zoom (desktop_set_zoom) + logical CSS geometry — not inflating
 * the DOM to ~90k CSS px (that leaves chrome unusable / blank).
 */

export type ViewportSize = { w: number; h: number; dpr: number };

export const VIEWPORT_MIN = 320;
export const VIEWPORT_MAX = 16_384;
export const VIEWPORT_FALLBACK: ViewportSize = { w: 1280, h: 800, dpr: 1 };

export function isSaneSize(w: number, h: number): boolean {
  return (
    Number.isFinite(w) &&
    Number.isFinite(h) &&
    w >= VIEWPORT_MIN &&
    h >= VIEWPORT_MIN &&
    w <= VIEWPORT_MAX &&
    h <= VIEWPORT_MAX
  );
}

export function isSaneDpr(dpr: number): boolean {
  return Number.isFinite(dpr) && dpr > 0.25 && dpr <= 8;
}

/**
 * Detected WebKit CSS inflation factor (1 = healthy, ~96 = ±1/96 dpr bug).
 * Host zoom should match this; layout still uses logical px.
 */
export function webkitCssPxPerDevicePx(): number {
  if (typeof window === "undefined") return 1;
  // Framed desktop app uses the iframe's logical viewport — never inflate.
  if (window.__TEXLOOPER__?.embeddedInDesktopHost) return 1;
  const injected = window.__TEXLOOPER__?.cssWindowSize?.factor;
  if (
    typeof injected === "number" &&
    Number.isFinite(injected) &&
    injected >= 1 &&
    injected <= 192
  ) {
    return Math.round(injected);
  }
  const dpr = window.devicePixelRatio;
  if (isSaneDpr(dpr)) return 1;
  const abs = Math.abs(dpr);
  if (!(abs > 0) || !Number.isFinite(abs)) return 1;
  if (Math.abs(abs * 96 - 1) < 0.08) return 96;
  if (abs < 0.25) return Math.min(192, Math.round(1 / abs));
  return 1;
}

export function isWebkitCssScaleCorrupt(): boolean {
  return webkitCssPxPerDevicePx() !== 1;
}

/** Host window size in normal UI coordinates (Tauri logical px). */
export function readSanitizedViewport(): ViewportSize {
  if (typeof window === "undefined") return { ...VIEWPORT_FALLBACK };

  const injected = window.__TEXLOOPER__?.windowSize;
  if (injected && isSaneSize(Number(injected.w), Number(injected.h))) {
    return {
      w: Math.floor(Number(injected.w)),
      h: Math.floor(Number(injected.h)),
      dpr: 1,
    };
  }

  // Inside the desktop iframe, prefer the frame's own layout viewport when sane.
  if (window.__TEXLOOPER__?.embeddedInDesktopHost) {
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    if (isSaneSize(iw, ih)) {
      return { w: Math.floor(iw), h: Math.floor(ih), dpr: 1 };
    }
  }

  const factor = webkitCssPxPerDevicePx();
  const cssInjected = window.__TEXLOOPER__?.cssWindowSize;
  if (
    cssInjected &&
    factor > 1 &&
    isSaneSize(
      Number(cssInjected.w) / factor,
      Number(cssInjected.h) / factor,
    )
  ) {
    return {
      w: Math.floor(Number(cssInjected.w) / factor),
      h: Math.floor(Number(cssInjected.h) / factor),
      dpr: 1,
    };
  }

  const iw = window.innerWidth;
  const ih = window.innerHeight;
  if (factor > 1 && Number.isFinite(iw) && Number.isFinite(ih) && iw !== 0 && ih !== 0) {
    const w = Math.round(Math.abs(iw) / factor);
    const h = Math.round(Math.abs(ih) / factor);
    if (isSaneSize(w, h)) return { w, h, dpr: 1 };
  }

  const vv = window.visualViewport;
  const candidates: Array<{ w: number; h: number }> = [
    { w: vv?.width ?? NaN, h: vv?.height ?? NaN },
    { w: iw, h: ih },
    {
      w: document.documentElement?.clientWidth ?? NaN,
      h: document.documentElement?.clientHeight ?? NaN,
    },
  ];

  for (const c of candidates) {
    if (isSaneSize(c.w, c.h)) {
      const dprRaw = window.devicePixelRatio;
      return {
        w: Math.floor(c.w),
        h: Math.floor(c.h),
        dpr: isSaneDpr(dprRaw) ? dprRaw : 1,
      };
    }
  }

  return { ...VIEWPORT_FALLBACK };
}

export function maxCanvasScaleForViewport(): number {
  return 4;
}

function setImportant(el: HTMLElement, prop: string, value: string): void {
  el.style.setProperty(prop, value, "important");
}

function pinBox(el: HTMLElement, w: number, h: number): void {
  setImportant(el, "box-sizing", "border-box");
  setImportant(el, "margin", "0");
  setImportant(el, "padding", "0");
  setImportant(el, "overflow", "hidden");
  setImportant(el, "width", `${w}px`);
  setImportant(el, "height", `${h}px`);
  setImportant(el, "max-width", `${w}px`);
  setImportant(el, "max-height", `${h}px`);
  setImportant(el, "min-width", `${w}px`);
  setImportant(el, "min-height", `${h}px`);
}

type TauriCore = { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };

function tauriCore(): TauriCore | null {
  const w = window as Window & {
    __TAURI__?: { core?: TauriCore };
    __TAURI_INTERNALS__?: { invoke?: TauriCore["invoke"] };
  };
  if (w.__TAURI__?.core?.invoke) return w.__TAURI__.core;
  if (w.__TAURI_INTERNALS__?.invoke) {
    return { invoke: w.__TAURI_INTERNALS__.invoke.bind(w.__TAURI_INTERNALS__) };
  }
  return null;
}

/** Ask the host webview to zoom so logical CSS px fill the physical window. */
export async function applyHostWebviewZoom(factor: number): Promise<void> {
  const f =
    Number.isFinite(factor) && factor > 0 && factor <= 192 ? factor : 1;
  const core = tauriCore();
  if (core) {
    try {
      await core.invoke("desktop_set_zoom", { factor: f });
      return;
    } catch {
      /* fall through to CSS zoom */
    }
  }
  const html = document.documentElement;
  if (f === 1) {
    html.style.removeProperty("zoom");
  } else {
    setImportant(html, "zoom", String(f));
  }
}

/**
 * Pin the desktop shell to host logical px.
 * When embedded in the desktop iframe host, avoid fighting the frame viewport.
 */
export function applyDesktopShellGeometry(size: ViewportSize): void {
  if (typeof document === "undefined") return;
  const embedded = Boolean(window.__TEXLOOPER__?.embeddedInDesktopHost);
  const factor = embedded ? 1 : webkitCssPxPerDevicePx();
  const logicalW = Math.max(VIEWPORT_MIN, Math.floor(size.w));
  const logicalH = Math.max(VIEWPORT_MIN, Math.floor(size.h));

  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById("root");

  html.style.setProperty("--app-w", `${logicalW}px`);
  html.style.setProperty("--app-h", `${logicalH}px`);
  html.style.setProperty("--webkit-css-factor", String(factor));
  setImportant(html, "font-size", "14px");
  html.style.setProperty("--text-xs", "11px");
  html.style.setProperty("--text-sm", "12.5px");
  html.style.setProperty("--text-md", "14px");
  html.style.setProperty("--text-lg", "17px");
  html.style.setProperty("--nav-width", "220px");
  html.style.setProperty("--inspector-width", "280px");
  html.style.setProperty("--control-h", "28px");
  html.style.setProperty("--tool-size", "32px");
  html.style.setProperty("--bar-height", "36px");
  html.style.setProperty("--status-bar-h", "26px");

  if (embedded) {
    // Let the iframe viewport define size; only ensure full-bleed flex root.
    for (const el of [html, body, root]) {
      if (!el) continue;
      setImportant(el, "box-sizing", "border-box");
      setImportant(el, "margin", "0");
      setImportant(el, "padding", "0");
      setImportant(el, "overflow", "hidden");
      setImportant(el, "width", "100%");
      setImportant(el, "height", "100%");
    }
    if (root) {
      setImportant(root, "display", "flex");
      setImportant(root, "flex-direction", "column");
      setImportant(root, "transform", "none");
    }
    return;
  }

  for (const el of [html, body, root]) {
    if (!el) continue;
    pinBox(el, logicalW, logicalH);
  }

  if (body) {
    setImportant(body, "position", "relative");
  }

  if (root) {
    setImportant(root, "position", "fixed");
    setImportant(root, "left", "0");
    setImportant(root, "top", "0");
    setImportant(root, "right", "auto");
    setImportant(root, "bottom", "auto");
    setImportant(root, "display", "flex");
    setImportant(root, "flex-direction", "column");
    setImportant(root, "transform", "none");
  }

  void applyHostWebviewZoom(factor);
}

/** @deprecated use applyDesktopShellGeometry */
export function applyViewportCssVars(size: ViewportSize): void {
  applyDesktopShellGeometry(size);
}

/** POST layout JSON to the desktop loopback dump endpoint (no-op if absent). */
export function postLayoutDump(payload: unknown): void {
  if (typeof window === "undefined") return;
  if (window.__TEXLOOPER__?.profile !== "desktop") return;
  try {
    void fetch("/__texlooper__/layout-dump", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}
