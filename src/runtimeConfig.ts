/** Runtime flags injected by `/config.js` (nginx) before the app bundle. */

export type TexLooperRuntime = {
  /** Hosted demo: no localStorage autosave, no catalog writes. */
  ephemeral?: boolean;
};

declare global {
  interface Window {
    __TEXLOOPER__?: TexLooperRuntime;
  }
}

export function isEphemeral(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.__TEXLOOPER__?.ephemeral);
}
