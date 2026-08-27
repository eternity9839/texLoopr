import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./icons";
import { prefs, updatePrefs } from "../state/store";
import { t, type MessageKey } from "../i18n";

type ToggleKey =
  | "showToolsRail"
  | "showInspectorRail"
  | "showStatusBar"
  | "showGrid"
  | "showRulers"
  | "showComments"
  | "showMarginGuides"
  | "showBlockOutlines"
  | "showPinIndicators"
  | "showPageChrome"
  | "showPageBounds";

const TOGGLES: {
  key: ToggleKey;
  labelKey: MessageKey;
  hintKey: MessageKey;
}[] = [
  { key: "showToolsRail", labelKey: "tools", hintKey: "toolsHint" },
  { key: "showInspectorRail", labelKey: "inspector", hintKey: "inspectorHint" },
  { key: "showStatusBar", labelKey: "statusBar", hintKey: "statusBarHint" },
  { key: "showGrid", labelKey: "grid", hintKey: "gridHint" },
  { key: "showRulers", labelKey: "rulers", hintKey: "rulersHint" },
  { key: "showMarginGuides", labelKey: "margins", hintKey: "marginsHint" },
  {
    key: "showBlockOutlines",
    labelKey: "blockOutlines",
    hintKey: "blockOutlinesHint",
  },
  {
    key: "showPinIndicators",
    labelKey: "pinIndicators",
    hintKey: "pinIndicatorsHint",
  },
  {
    key: "showPageChrome",
    labelKey: "pageChromeOverlay",
    hintKey: "pageChromeOverlayHint",
  },
  {
    key: "showPageBounds",
    labelKey: "pageBounds",
    hintKey: "pageBoundsHint",
  },
  { key: "showComments", labelKey: "comments", hintKey: "commentsHint" },
];

function isOn(key: ToggleKey): boolean {
  const p = prefs.value;
  switch (key) {
    case "showToolsRail":
      return p.showToolsRail !== false;
    case "showInspectorRail":
      return p.showInspectorRail !== false;
    case "showStatusBar":
      return p.showStatusBar !== false;
    case "showGrid":
      return Boolean(p.showGrid);
    case "showRulers":
      return p.showRulers !== false;
    case "showComments":
      return p.showComments !== false;
    case "showMarginGuides":
      return p.showMarginGuides === true;
    case "showBlockOutlines":
      return p.showBlockOutlines === true;
    case "showPinIndicators":
      return p.showPinIndicators === true;
    case "showPageChrome":
      return p.showPageChrome === true;
    case "showPageBounds":
      return p.showPageBounds === true;
  }
}

/** Compact chrome Appearance popover (ContextBar). */
export function AppearanceMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  void prefs.value.locale;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const root = rootRef.current;
    if (!panel || !root) return;
    const pad = 8;
    // Reset to CSS default (below the trigger) before measuring.
    panel.style.top = "";
    panel.style.bottom = "";
    panel.style.maxHeight = "";
    const trigger = root.getBoundingClientRect();
    const rect = panel.getBoundingClientRect();
    const spaceBelow = window.innerHeight - trigger.bottom - pad;
    if (rect.height > spaceBelow && trigger.top > spaceBelow) {
      panel.style.top = "auto";
      panel.style.bottom = "calc(100% + 0.35rem)";
    }
    const after = panel.getBoundingClientRect();
    if (after.top < pad) {
      panel.style.top = `${pad - trigger.top}px`;
      panel.style.bottom = "auto";
    }
    const finalTop = panel.getBoundingClientRect().top;
    panel.style.maxHeight = `${Math.max(120, window.innerHeight - finalTop - pad)}px`;
    panel.style.overflowY = "auto";
  }, [open]);

  return (
    <div class="appearance-menu" ref={rootRef}>
      <button
        type="button"
        class={
          open
            ? "btn btn--small btn--icon"
            : "btn btn--ghost btn--small btn--icon"
        }
        title={t("appearance")}
        aria-label={t("appearance")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="sliders" size={15} />
      </button>
      {open && (
        <div
          ref={panelRef}
          class="appearance-menu__panel"
          role="menu"
          aria-label={t("appearance")}
        >
          <p class="appearance-menu__title">{t("appearance")}</p>
          {TOGGLES.map((row) => {
            const on = isOn(row.key);
            return (
              <label
                key={row.key}
                class="appearance-menu__row"
                title={t(row.hintKey)}
                role="menuitemcheckbox"
                aria-checked={on}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => updatePrefs({ [row.key]: !on })}
                />
                <span>{t(row.labelKey)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
