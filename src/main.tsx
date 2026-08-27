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
  loadImportedProject,
  maybeAutoStartTour,
  prefs,
} from "./state/store";
import { syncDocumentLocale } from "./i18n";
import { loadBundledProjectJson } from "./features/import/ProjectJsonImport";
import { buildYassinResume } from "./projects/yassinResume";
import { suppressBenignResizeObserverError } from "./ui/observeResize";
import {
  applyLayoutDeviceAttrs,
  detectLayoutDevice,
  subscribeLayoutDevice,
} from "./ui/layoutDevice";
import { isLayoutDebugEnabled } from "./runtimeConfig";

suppressBenignResizeObserverError();

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

async function maybeLoadQueryProject(): Promise<void> {
  if (typeof location === "undefined") return;
  const load = new URLSearchParams(location.search).get("load");
  if (!load) return;
  if (load === "yassin-resume") {
    loadImportedProject(buildYassinResume());
    return;
  }
  if (load.endsWith(".json")) {
    await loadBundledProjectJson(load);
  }
}

void (async () => {
  await hydrateFromCatalog();
  syncDocumentLocale(
    prefs.value.locale === "fr" || prefs.value.locale === "en"
      ? prefs.value.locale
      : "en",
  );
  await maybeLoadQueryProject();
  render(<App />, document.getElementById("root")!);
  maybeAutoStartTour();
})();
