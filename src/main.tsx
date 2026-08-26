import { render } from "preact";
import "@fontsource/sora/400.css";
import "@fontsource/sora/600.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
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
import { buildYassinResume } from "./projects/yassinResume";

function maybeLoadPersonalProject(): void {
  if (typeof location === "undefined") return;
  const load = new URLSearchParams(location.search).get("load");
  if (load === "yassin-resume") {
    // Keep ?load= in the URL so Vite full-reloads re-apply the builder
    // instead of restoring a stale localStorage draft.
    loadImportedProject(buildYassinResume());
  }
}

void hydrateFromCatalog().finally(() => {
  syncDocumentLocale(
    prefs.value.locale === "fr" || prefs.value.locale === "en"
      ? prefs.value.locale
      : "en",
  );
  maybeLoadPersonalProject();
  render(<App />, document.getElementById("root")!);
  maybeAutoStartTour();
});
