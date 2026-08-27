import { useEffect } from "preact/hooks";
import {
  activeOutputProfile,
  canvasViewScale,
  prefs,
  project,
} from "../state/store";
import { canvasSizeForSession } from "../model/canvasView";
import { isRulerUnit } from "../model/rulerUnits";
import { outputToCtx } from "../model/workflow";
import { isLayoutDebugEnabled } from "../runtimeConfig";
import { observeResize } from "./observeResize";
import { takeAndPublishLayoutSnapshot } from "./layoutDiagnostics";
import { postLayoutDump } from "./viewportMetrics";

/**
 * When layout debug is on, snapshot chrome + canvas sizes to the console.
 * Enable via ?layoutDebug=1, TEXLOOPER_LAYOUT_DEBUG, or __TEXLOOPER__.layoutDebug.
 */
export function LayoutDiagnosticsHost() {
  useEffect(() => {
    if (!isLayoutDebugEnabled()) return;

    const collect = () => {
      const p = prefs.value;
      const size = canvasSizeForSession(project.value, p);
      const scale = canvasViewScale.value || 1;
      const zoomMode = p.canvasZoomMode ?? "fit";
      const output = activeOutputProfile();
      const deviceCtx = output ? outputToCtx(output).device : {};
      const rulerUnit = isRulerUnit(p.rulerUnit) ? p.rulerUnit : "px";

      takeAndPublishLayoutSnapshot(
        {
          pageW: size.w,
          pageH: size.h,
          scale,
          zoomMode,
          fitW: Math.round(size.w * scale),
          fitH: Math.round(size.h * scale),
          rulerUnit,
        },
        {
          prefs: {
            density: p.density,
            rulerUnit: p.rulerUnit,
            canvasPreset: p.canvasPreset ?? project.value.artboard,
          },
          artboard: project.value.artboard ?? p.canvasPreset,
          outputDevice: {
            media:
              typeof deviceCtx.media === "string" ? deviceCtx.media : null,
            dpi: typeof deviceCtx.dpi === "number" ? deviceCtx.dpi : null,
          },
        },
      );
      const last = window.__TEXLOOPER_LAYOUT__?.last;
      if (last) postLayoutDump({ tag: "spa-snapshot", ...last });
    };

    collect();
    const t1 = window.setTimeout(collect, 500);
    const t2 = window.setTimeout(collect, 1500);

    let debounce = 0;
    const onResize = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(collect, 250);
    };

    const root = document.getElementById("root");
    const scroll = document.querySelector(".editor-board__scroll");
    const stopRoot = root ? observeResize(root, onResize) : () => {};
    const stopScroll = scroll
      ? observeResize(scroll, onResize)
      : () => {};
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(debounce);
      window.removeEventListener("resize", onResize);
      stopRoot();
      stopScroll();
    };
  }, []);

  return null;
}
