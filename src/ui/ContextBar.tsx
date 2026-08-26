import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { StudioView } from "../model/document";
import { AppearanceMenu } from "./AppearanceMenu";
import { Icon, type IconName } from "./icons";
import { t } from "../i18n";
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
  createProject,
  openSettings,
  prefs,
  selection,
  selectedBlock,
  activePage,
  select,
  setGroupIsolation,
} from "../state/store";
import { findBlockAncestors } from "../model/outlineTree";
import { isEphemeral } from "../runtimeConfig";
import { usePdfImport } from "../features/import/PdfImportControl";

const VIEWS: { id: StudioView; labelKey: "edit" | "data"; icon: IconName }[] = [
  { id: "edit", labelKey: "edit", icon: "edit" },
  { id: "data", labelKey: "data", icon: "database" },
];

function MenuItem({
  icon,
  children,
  onClick,
}: {
  icon: IconName;
  children: ComponentChildren;
  onClick: () => void;
}) {
  return (
    <button type="button" role="menuitem" onClick={onClick}>
      <span class="overflow-menu__icon" aria-hidden="true">
        <Icon name={icon} size={14} />
      </span>
      <span class="overflow-menu__label">{children}</span>
    </button>
  );
}

export function ContextBar() {
  const proj = project.value;
  const view = studioView.value;
  const isPreview = previewMode.value;
  const inCatalog = Boolean(catalogProjectId.value);
  const ephemeral = isEphemeral();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  void prefs.value.locale;

  useEffect(() => {
    if (!projectMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(e.target as Node)
      ) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [projectMenuOpen]);

  const savedLabel = ephemeral
    ? t("demoNotSaved")
    : proj.lastSaved
      ? inCatalog
        ? `${t("catalogSaved")} · ${new Date(proj.lastSaved).toLocaleString()}`
        : `${t("localSaved")} · ${new Date(proj.lastSaved).toLocaleString()}`
      : t("autosavedLocally");

  const page = activePage.value;
  const block = selectedBlock.value;
  const sel = selection.value;
  const breadcrumb =
    view === "edit" && sel?.kind === "block" && block && page
      ? [
          { id: page.id, label: page.name, kind: "page" as const },
          ...findBlockAncestors(page.blocks, block.id).map((g) => ({
            id: g.id,
            label: g.name,
            kind: "block" as const,
          })),
          { id: block.id, label: block.name, kind: "block" as const },
        ]
      : null;

  const saveTitle = ephemeral
    ? t("demoNotSaved")
    : inCatalog
      ? t("saveToCatalog")
      : t("saveDraftToCatalog");
  const closeProjectMenu = () => setProjectMenuOpen(false);
  const pdfImport = usePdfImport(closeProjectMenu);

  return (
    <header class="context-bar" role="banner">
      {pdfImport.fileInput}
      {pdfImport.modal}
      <div class="context-bar__brand-wrap" ref={projectMenuRef}>
        <button
          type="button"
          class="context-bar__brand"
          aria-label={t("projectMenu")}
          aria-haspopup="menu"
          aria-expanded={projectMenuOpen}
          title={t("projectMenu")}
          onClick={() => setProjectMenuOpen((o) => !o)}
        >
          texLooper
        </button>
        {projectMenuOpen && (
          <div class="overflow-menu context-bar__project-menu" role="menu">
            <MenuItem
              icon="file"
              onClick={() => {
                createProject();
                closeProjectMenu();
              }}
            >
              {t("newProject")}
            </MenuItem>
            <MenuItem
              icon="folder"
              onClick={() => {
                setOverlay("catalog");
                closeProjectMenu();
              }}
            >
              {t("open")}
            </MenuItem>
            <MenuItem
              icon="file"
              onClick={() => {
                pdfImport.openPicker();
                closeProjectMenu();
              }}
            >
              {t("importPdf")}
            </MenuItem>
            {!ephemeral && (
              <MenuItem
                icon="save"
                onClick={() => {
                  stampSaved();
                  closeProjectMenu();
                }}
              >
                {t("save")}
              </MenuItem>
            )}
            <hr class="overflow-menu__sep" />
            <MenuItem
              icon="sparkles"
              onClick={() => {
                setOverlay("samples");
                closeProjectMenu();
              }}
            >
              {t("samples")}
            </MenuItem>
            <MenuItem
              icon="workflow"
              onClick={() => {
                setOverlay("automation");
                closeProjectMenu();
              }}
            >
              {t("automation")}
            </MenuItem>
            <MenuItem
              icon="play"
              onClick={() => {
                setOverlay("render");
                closeProjectMenu();
              }}
            >
              {t("render")}
            </MenuItem>
            <MenuItem
              icon="settings"
              onClick={() => {
                openSettings("general");
                closeProjectMenu();
              }}
            >
              {t("settings")}
            </MenuItem>
            <MenuItem
              icon="book"
              onClick={() => {
                startTour();
                closeProjectMenu();
              }}
            >
              {t("editionTour")}
            </MenuItem>
            <hr class="overflow-menu__sep" />
            <MenuItem
              icon="info"
              onClick={() => {
                setOverlay("about");
                closeProjectMenu();
              }}
            >
              {t("about")}
            </MenuItem>
          </div>
        )}
      </div>
      <input
        class="context-bar__title"
        aria-label={t("newProject")}
        value={proj.name}
        onInput={(e) => updateProjectMeta({ name: e.currentTarget.value })}
      />
      <span
        class="context-bar__pill"
        title={savedLabel}
        aria-label={savedLabel}
      >
        {ephemeral ? t("demo") : proj.lastSaved ? t("saved") : t("draft")}
      </span>
      {breadcrumb && breadcrumb.length > 1 && (
        <nav class="context-bar__crumb" aria-label="Selection path">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} class="context-bar__crumb-item">
              {i > 0 && <span class="context-bar__crumb-sep">›</span>}
              {i < breadcrumb.length - 1 ? (
                <button
                  type="button"
                  class="context-bar__crumb-link"
                  onClick={() => {
                    if (crumb.kind === "page") {
                      select({ kind: "page", id: crumb.id });
                      setGroupIsolation(null);
                    } else {
                      select({ kind: "block", id: crumb.id });
                      if (page) {
                        const chain = findBlockAncestors(page.blocks, crumb.id);
                        if (chain.length > 0) {
                          setGroupIsolation(chain[chain.length - 1]!.id);
                        } else {
                          setGroupIsolation(crumb.id);
                        }
                      }
                    }
                  }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span class="context-bar__crumb-current">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {!ephemeral && (
        <button
          type="button"
          class="btn btn--ghost btn--small btn--icon"
          title={saveTitle}
          aria-label={saveTitle}
          onClick={() => stampSaved()}
        >
          <Icon name="save" size={15} />
        </button>
      )}

      <nav class="studio-switch" aria-label={t("edit")}>
        {VIEWS.map((v) => (
          <button
            type="button"
            class="studio-switch__btn studio-switch__btn--icon"
            key={v.id}
            title={t(v.labelKey)}
            aria-label={t(v.labelKey)}
            aria-current={view === v.id ? "page" : undefined}
            onClick={() => setStudioView(v.id)}
          >
            <Icon name={v.icon} size={15} />
          </button>
        ))}
      </nav>

      {view === "edit" && (
        <button
          type="button"
          class="btn btn--small btn--icon"
          title={t("render")}
          aria-label={t("render")}
          data-tour="render"
          onClick={() => setOverlay("render")}
        >
          <Icon name="play" size={15} />
        </button>
      )}

      {view === "edit" && (
        <button
          type="button"
          class={
            isPreview
              ? "btn btn--small btn--icon"
              : "btn btn--ghost btn--small btn--icon"
          }
          title={isPreview ? t("exitPreview") : t("preview")}
          aria-label={isPreview ? t("exitPreview") : t("preview")}
          aria-pressed={isPreview}
          data-tour="preview-toggle"
          onClick={() => setPreviewMode(!isPreview)}
        >
          <Icon name={isPreview ? "eyeOff" : "eye"} size={15} />
        </button>
      )}

      {view === "edit" && <AppearanceMenu />}
    </header>
  );
}
