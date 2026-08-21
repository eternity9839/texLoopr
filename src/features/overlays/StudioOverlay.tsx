import { useEffect, useRef } from "preact/hooks";
import { Icon } from "../../ui/icons";
import { overlay, setOverlay } from "../../state/store";
import { SettingsMode } from "../modes/SettingsMode";
import { AboutMode } from "../modes/AboutMode";
import { CatalogPanel } from "../catalog/CatalogPanel";
import { AutomationPanel } from "../automation/AutomationPanel";
import { SamplesPanel } from "../samples/SamplesPanel";

export function StudioOverlay() {
  const current = overlay.value;
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
      ? "Settings"
      : current === "about"
        ? "About"
        : current === "automation"
          ? "Automation"
          : current === "samples"
            ? "Sample documents"
            : "Catalog";

  const wide =
    current === "automation" ||
    current === "catalog" ||
    current === "samples";

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
            title="Close"
            aria-label="Close"
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
        ) : (
          <CatalogPanel />
        )}
      </div>
    </div>
  );
}
