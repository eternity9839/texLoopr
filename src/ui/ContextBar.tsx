import { useEffect, useRef, useState } from "preact/hooks";
import type { StudioView } from "../model/document";
import { Icon, type IconName } from "./icons";
import {
  project,
  studioView,
  setStudioView,
  setOverlay,
  updateProjectMeta,
  stampSaved,
  previewMode,
  setPreviewMode,
  startTour,
  catalogProjectId,
  prefs,
} from "../state/store";

const VIEWS: { id: StudioView; label: string; icon: IconName }[] = [
  { id: "edit", label: "Edit", icon: "edit" },
  { id: "data", label: "Data", icon: "database" },
];

export function ContextBar() {
  const proj = project.value;
  const view = studioView.value;
  const isPreview = previewMode.value;
  const inCatalog = Boolean(catalogProjectId.value);
  const density = prefs.value.density;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const savedLabel = proj.lastSaved
    ? inCatalog
      ? `Catalog · ${new Date(proj.lastSaved).toLocaleString()}`
      : `Saved · ${new Date(proj.lastSaved).toLocaleString()}`
    : "Autosaved locally";

  const saveTitle = inCatalog
    ? "Save to catalog"
    : "Save draft to catalog";

  return (
    <header class="context-bar" role="banner">
      <div class="context-bar__brand">texLoopr</div>
      <input
        class="context-bar__title"
        aria-label="Project name"
        value={proj.name}
        onInput={(e) => updateProjectMeta({ name: e.currentTarget.value })}
      />
      <span class="context-bar__meta" title={savedLabel}>
        {savedLabel}
      </span>
      <button
        type="button"
        class="btn btn--ghost btn--small btn--icon"
        title={saveTitle}
        aria-label={saveTitle}
        onClick={() => stampSaved()}
      >
        <Icon name="save" size={15} />
      </button>

      <nav class="studio-switch" aria-label="Studio views">
        {VIEWS.map((v) => (
          <button
            type="button"
            class="studio-switch__btn studio-switch__btn--icon"
            key={v.id}
            title={v.label}
            aria-label={v.label}
            aria-current={view === v.id ? "page" : undefined}
            onClick={() => setStudioView(v.id)}
          >
            <Icon name={v.icon} size={15} />
            {density === "comfortable" && (
              <span class="studio-switch__label">{v.label}</span>
            )}
          </button>
        ))}
      </nav>

      {view === "edit" && (
        <button
          type="button"
          class={
            isPreview
              ? "btn btn--small btn--icon"
              : "btn btn--ghost btn--small btn--icon"
          }
          title={
            isPreview
              ? "Exit preview (Ctrl+.)"
              : "Preview (Ctrl+.)"
          }
          aria-label={isPreview ? "Exit preview" : "Preview"}
          aria-pressed={isPreview}
          data-tour="preview-toggle"
          onClick={() => setPreviewMode(!isPreview)}
        >
          <Icon name={isPreview ? "eyeOff" : "eye"} size={15} />
        </button>
      )}

      <div class="context-bar__overflow" ref={menuRef}>
        <button
          type="button"
          class="overflow-trigger"
          aria-label="More"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Icon name="moreHorizontal" size={16} />
        </button>
        {menuOpen && (
          <div class="overflow-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOverlay("settings");
                setMenuOpen(false);
              }}
            >
              <Icon name="settings" size={14} />
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOverlay("automation");
                setMenuOpen(false);
              }}
            >
              <Icon name="workflow" size={14} />
              Automation
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOverlay("catalog");
                setMenuOpen(false);
              }}
            >
              <Icon name="folder" size={14} />
              Catalog
            </button>
            <hr class="overflow-menu__sep" />
            <button
              type="button"
              role="menuitem"
              class="overflow-menu__quiet"
              onClick={() => {
                setOverlay("samples");
                setMenuOpen(false);
              }}
            >
              <Icon name="sparkles" size={14} />
              Samples…
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                startTour();
                setMenuOpen(false);
              }}
            >
              <Icon name="book" size={14} />
              Edition tour
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOverlay("about");
                setMenuOpen(false);
              }}
            >
              <Icon name="info" size={14} />
              About
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
