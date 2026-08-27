/** Runtime flags injected by `/config.js` (nginx) before the app bundle. */

export type BackendTransport = "tauri-local" | "http-remote" | "js-fallback";

export type TexLooperRuntime = {
  /** Hosted demo: no localStorage autosave, no catalog writes. */
  ephemeral?: boolean;
  /** Prefer remote Rust API (ADR 0016). Example: `https://api.texlooper.example` */
  apiBaseUrl?: string;
  /** Optional API key for non-loopback / official / in-house */
  apiKey?: string;
  /**
   * Force transport. Default: tauri if present → http if apiBaseUrl → js-fallback.
   */
  transport?: BackendTransport;
  /** Deploy profile label for diagnostics */
  profile?: "desktop" | "official" | "inhouse" | "ephemeral" | "dev";
  /** Emit layout size snapshots to console (desktop debugging). */
  layoutDebug?: boolean;
  /**
   * Logical window size from the Tauri host (WebKitGTK often reports
   * corrupt innerWidth/innerHeight — prefer this when present).
   */
  windowSize?: { w: number; h: number };
  /**
   * Inflated CSS viewport (logical × factor) when WebKit dpr ≈ ±1/96.
   * Used by the desktop host iframe scaler.
   */
  cssWindowSize?: { w: number; h: number; factor: number };
  /** True when running inside the desktop iframe host. */
  embeddedInDesktopHost?: boolean;
  hostScale?: number;
};

declare global {
  interface Window {
    __TEXLOOPER__?: TexLooperRuntime;
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  }
}

export function runtimeConfig(): TexLooperRuntime {
  if (typeof window === "undefined") return {};
  return window.__TEXLOOPER__ ?? {};
}

export function isEphemeral(): boolean {
  return Boolean(runtimeConfig().ephemeral);
}

/**
 * Copy Tauri IPC globals from the outer desktop host into this frame.
 * Release builds load the SPA in a same-origin iframe; `__TAURI_*` is
 * injected on the parent webview only.
 */
export function bridgeTauriIpcFromParent(): boolean {
  if (typeof window === "undefined") return false;
  const hasOwn =
    "__TAURI_INTERNALS__" in window || window.__TAURI__ != null;
  if (hasOwn) return true;
  try {
    const parentWin = window.parent;
    if (!parentWin || parentWin === window) return false;
    if (parentWin.__TAURI_INTERNALS__ != null) {
      window.__TAURI_INTERNALS__ = parentWin.__TAURI_INTERNALS__;
    }
    if (parentWin.__TAURI__ != null) {
      window.__TAURI__ = parentWin.__TAURI__;
    }
    return "__TAURI_INTERNALS__" in window || window.__TAURI__ != null;
  } catch {
    return false;
  }
}

/** True when Tauri IPC is usable in this browsing context (after optional bridge). */
export function hasTauriIpc(): boolean {
  if (typeof window === "undefined") return false;
  if ("__TAURI_INTERNALS__" in window || window.__TAURI__ != null) return true;
  return bridgeTauriIpcFromParent();
}

/** Native Tauri shell (not browser / hosted demo). */
export function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  if (runtimeConfig().profile === "desktop") return true;
  if (runtimeConfig().embeddedInDesktopHost) return true;
  return hasTauriIpc();
}

/** Opt-in layout diagnostics (console + window.__TEXLOOPER_LAYOUT__). */
export function isLayoutDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (runtimeConfig().layoutDebug) return true;
  try {
    if (sessionStorage.getItem("texlooper:layoutDebug") === "1") return true;
    if (new URLSearchParams(location.search).get("layoutDebug") === "1") {
      sessionStorage.setItem("texlooper:layoutDebug", "1");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Local debug file logger.
 * ON: Vite/dev profile, TEXLOOPER_DEBUG_LOG (via Rust), or ?debugLog=1.
 * OFF: ephemeral/official hosted and release packages by default.
 */
let rustDebugLogEnabled: boolean | null = null;

export function setRustDebugLogEnabled(on: boolean): void {
  rustDebugLogEnabled = on;
}

export function isDebugFileLoggerEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (isEphemeral()) return false;
  if (runtimeConfig().profile === "ephemeral") return false;
  if (runtimeConfig().profile === "official") return false;
  if (rustDebugLogEnabled === true) return true;
  try {
    if (sessionStorage.getItem("texlooper:debugLog") === "1") return true;
    if (new URLSearchParams(location.search).get("debugLog") === "1") {
      sessionStorage.setItem("texlooper:debugLog", "1");
      return true;
    }
  } catch {
    /* ignore */
  }
  if (import.meta.env.DEV) return true;
  if (runtimeConfig().profile === "dev") return true;
  return false;
}

/** Ask Rust whether the file logger is active (debug build or TEXLOOPER_DEBUG_LOG). */
export async function syncDebugLogFlagFromRust(): Promise<void> {
  if (!hasTauriIpc()) return;
  try {
    const { invoke } = await import("./platform/tauri");
    const on = await invoke<boolean>("debug_log_enabled_cmd");
    setRustDebugLogEnabled(Boolean(on));
  } catch {
    setRustDebugLogEnabled(false);
  }
}

export function getApiBaseUrl(): string | null {
  const u = runtimeConfig().apiBaseUrl?.trim();
  return u || null;
}

export function getApiKey(): string | null {
  const k = runtimeConfig().apiKey?.trim();
  return k || null;
}

export function resolveBackendTransport(): BackendTransport {
  const forced = runtimeConfig().transport;
  if (forced) return forced;
  if (hasTauriIpc()) return "tauri-local";
  // Framed desktop SPA: prefer Tauri even before the host finishes bridging IPC.
  if (
    runtimeConfig().profile === "desktop" ||
    runtimeConfig().embeddedInDesktopHost
  ) {
    return "tauri-local";
  }
  if (getApiBaseUrl()) return "http-remote";
  return "js-fallback";
}
