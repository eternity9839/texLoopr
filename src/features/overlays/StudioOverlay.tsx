import { useEffect, useRef } from "preact/hooks";
import { Icon } from "../../ui/icons";
import { overlay, prefs, setOverlay } from "../../state/store";
import { SettingsMode } from "../modes/SettingsMode";
import { AboutMode } from "../modes/AboutMode";
import { CatalogPanel } from "../catalog/CatalogPanel";
import { AutomationPanel } from "../automation/AutomationPanel";
import { RenderPanel } from "../render/RenderPanel";
import { SamplesPanel } from "../samples/SamplesPanel";
import { t } from "../../i18n";

export function StudioOverlay() {
  const current = overlay.value;
  void prefs.value.locale;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!current) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = dialogRef.current;
    const focusable = root?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOverlay(null);
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const nodes = [
        ...root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => !el.hasAttribute("disabled"));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [current]);

  if (!current) return null;

  const title =
    current === "settings"
      ? t("settings")
      : current === "about"
        ? t("about")
        : current === "automation"
          ? t("automation")
          : current === "samples"
          ? t("sampleDocuments")
          : current === "render"
            ? t("render")
            : t("catalog");

  const wide =
    current === "automation" ||
    current === "catalog" ||
    current === "samples" ||
    current === "render";

  return (
    <div
      class="overlay-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOverlay(null);
      }}
    >
      <div
        class={wide ? "overlay-dialog overlay-dialog--wide" : "overlay-dialog"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="overlay-title"
        ref={dialogRef}
      >
        <div class="overlay-dialog__header">
          <h2 id="overlay-title">{title}</h2>
          <button
            type="button"
            class="btn btn--ghost btn--small btn--icon"
            title={t("close")}
            aria-label={t("close")}
            onClick={() => setOverlay(null)}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
        {current === "settings" ? (
          <SettingsMode />
        ) : current === "about" ? (
          <AboutMode />
        ) : current === "automation" ? (
          <AutomationPanel />
        ) : current === "samples" ? (
          <SamplesPanel />
        ) : current === "render" ? (
          <RenderPanel />
        ) : (
          <CatalogPanel />
        )}
      </div>
    </div>
  );
}
