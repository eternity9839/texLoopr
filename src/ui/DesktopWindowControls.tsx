/** Frameless desktop window controls (Tauri). Hidden on web. */

import { Icon } from "./icons";
import { isDesktopShell } from "../runtimeConfig";

type TauriWindow = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
};

function currentWindow(): TauriWindow | null {
  if (typeof window === "undefined") return null;
  const api = (
    window as Window & {
      __TAURI__?: { window?: { getCurrentWindow?: () => TauriWindow } };
    }
  ).__TAURI__?.window;
  try {
    return api?.getCurrentWindow?.() ?? null;
  } catch {
    return null;
  }
}

export function DesktopWindowControls() {
  if (!isDesktopShell()) return null;

  const run = (fn: (w: TauriWindow) => Promise<void>) => () => {
    const w = currentWindow();
    if (!w) return;
    void fn(w).catch(() => {});
  };

  return (
    <div class="window-controls" role="group" aria-label="Window">
      <button
        type="button"
        class="window-controls__btn"
        title="Minimize"
        aria-label="Minimize"
        onClick={run((w) => w.minimize())}
      >
        <span class="window-controls__glyph window-controls__glyph--min" />
      </button>
      <button
        type="button"
        class="window-controls__btn"
        title="Maximize"
        aria-label="Maximize"
        onClick={run((w) => w.toggleMaximize())}
      >
        <span class="window-controls__glyph window-controls__glyph--max" />
      </button>
      <button
        type="button"
        class="window-controls__btn window-controls__btn--close"
        title="Close"
        aria-label="Close"
        onClick={run((w) => w.close())}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}
