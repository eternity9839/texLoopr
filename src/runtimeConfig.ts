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
  }
}

export function runtimeConfig(): TexLooperRuntime {
  if (typeof window === "undefined") return {};
  return window.__TEXLOOPER__ ?? {};
}

export function isEphemeral(): boolean {
  return Boolean(runtimeConfig().ephemeral);
}

/** Native Tauri shell (not browser / hosted demo). */
export function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  if (runtimeConfig().profile === "desktop") return true;
  return "__TAURI_INTERNALS__" in window;
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
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return "tauri-local";
  }
  if (getApiBaseUrl()) return "http-remote";
  return "js-fallback";
}
