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
