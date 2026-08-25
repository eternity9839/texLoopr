import { render } from "preact";
import "@fontsource/sora/400.css";
import "@fontsource/sora/600.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
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
