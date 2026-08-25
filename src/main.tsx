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
import { hydrateFromCatalog, maybeAutoStartTour } from "./state/store";

void hydrateFromCatalog().finally(() => {
  render(<App />, document.getElementById("root")!);
  maybeAutoStartTour();
});
