import { render } from "preact";
import "@fontsource/sora/400.css";
import "@fontsource/sora/600.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/controls.css";
import "./styles/layout.css";
import "./styles/editor.css";
import App from "./App";
import {
  hydrateFromCatalog,
  maybeAutoStartTour,
  prefs,
} from "./state/store";
import { syncDocumentLocale } from "./i18n";
import { loadBundledProjectJson } from "./features/import/ProjectJsonImport";
import { suppressBenignResizeObserverError } from "./ui/observeResize";
import {
  applyLayoutDeviceAttrs,
  detectLayoutDevice,
  subscribeLayoutDevice,
} from "./ui/layoutDevice";
import {
  isLayoutDebugEnabled,
  bridgeTauriIpcFromParent,
  syncDebugLogFlagFromRust,
} from "./runtimeConfig";
import { AppFeedbackHost } from "./ui/AppFeedbackHost";
import {
  hideLoading,
  reportAppError,
  showLoading,
} from "./state/appFeedback";
import { ErrorCodes } from "./model/appErrors";
import { log } from "./debug/logger";

suppressBenignResizeObserverError();
bridgeTauriIpcFromParent();

if (typeof document !== "undefined") {
  try {
    if (new URLSearchParams(location.search).get("layoutDebug") === "1") {
      sessionStorage.setItem("texlooper:layoutDebug", "1");
    }
  } catch {
    /* ignore */
  }
  applyLayoutDeviceAttrs(detectLayoutDevice());
  subscribeLayoutDevice(() => {});
  if (isLayoutDebugEnabled()) {
    console.info("[texlooper:layout] diagnostics enabled");
  }
}

function BootRoot() {
  return (
    <>
      <AppFeedbackHost />
    </>
  );
}

async function maybeLoadQueryProject(): Promise<void> {
  if (typeof location === "undefined") return;
  const load = new URLSearchParams(location.search).get("load");
  if (!load) return;
  if (load.endsWith(".json")) {
    await loadBundledProjectJson(load);
  }
}

function dismissHostSplash(): void {
  try {
    window.parent?.postMessage({ type: "texlooper-spa-ready" }, "*");
  } catch {
    /* ignore */
  }
  const el = document.getElementById("texlooper-boot-splash");
  el?.remove();
}

void (async () => {
  const root = document.getElementById("root")!;
  render(<BootRoot />, root);
  showLoading("boot");
  log.info("boot", "starting");
  try {
    await syncDebugLogFlagFromRust();
    await hydrateFromCatalog();
    syncDocumentLocale(
      prefs.value.locale === "fr" || prefs.value.locale === "en"
        ? prefs.value.locale
        : "en",
    );
    await maybeLoadQueryProject();
    log.info("boot", "ready");
    render(
      <>
        <App />
        <AppFeedbackHost />
      </>,
      root,
    );
    hideLoading();
    dismissHostSplash();
    maybeAutoStartTour();
  } catch (e) {
    hideLoading();
    reportAppError({
      code: ErrorCodes.BOOT_HYDRATE,
      message: "Failed to start texLooper",
      cause: e,
    });
    dismissHostSplash();
    log.error("boot", "startup failed", {
      detail: e instanceof Error ? e.message : String(e),
    });
  }
})();
