import { StudioLayout } from "../../ui/StudioLayout";
import { Icon } from "../../ui/icons";
import { HierarchyPanel } from "../tree/HierarchyPanel";
import { Toolbox } from "../editor/Toolbox";
import { EditorCanvas } from "../editor/EditorCanvas";
import { EditRibbon } from "../editor/EditRibbon";
import { OptionsBar } from "../editor/OptionsBar";
import { StatusBar } from "../editor/StatusBar";
import { DesignPanel } from "../properties/DesignPanel";
import { DataBindingsPanel } from "../properties/DataBindingsPanel";
import { MetadataPanel } from "../properties/PropertiesPanel";
import { CommentsPanel } from "../editor/CommentsPanel";
import { HistoryPanel } from "../properties/HistoryPanel";
import { INSPECTOR_TABS } from "./inspectorTabs";
import { t } from "../../i18n";
import {
  OUTPUT_KINDS,
  OUTPUT_KIND_LABEL,
  type OutputKind,
} from "../../model/workflow";
import {
  previewMode,
  dataRows,
  previewRowIndex,
  setPreviewRowIndex,
  project,
  setActiveOutputId,
  inspectorTab,
  prefs,
  updatePrefs,
  previewLanguageOverride,
  setPreviewLanguageOverride,
} from "../../state/store";
import { ensureProjectAutomation } from "../../model/document";
import {
  PREVIEW_LANGUAGE_OPTIONS,
  resolveDocumentLanguage,
} from "../../model/documentLanguage";

export function EditStudio() {
  const preview = previewMode.value;
  const rows = dataRows.value;
  const idx = previewRowIndex.value;
  const proj = ensureProjectAutomation(project.value);
  const outputs = (proj.outputs ?? []).filter((o) => o.enabled !== false);
  const tab = inspectorTab.value;
  const p = prefs.value;
  const inspCollapsed = Boolean(p.inspectorCollapsed);
  const showTools = p.showToolsRail !== false;
  const showInspector = p.showInspectorRail !== false;
  const showStatus = p.showStatusBar !== false;

  const activeKind =
    outputs.find((o) => o.id === proj.activeOutputId)?.kind ??
    outputs[0]?.kind;

  const langOverride = previewLanguageOverride.value;
  const rowLang = resolveDocumentLanguage(
    proj,
    rows[idx],
    null,
  );

  const selectKind = (kind: OutputKind) => {
    const match =
      outputs.find((o) => o.id === proj.activeOutputId && o.kind === kind) ??
      outputs.find((o) => o.kind === kind);
    if (match) setActiveOutputId(match.id);
  };

  const inspectorBody = (() => {
    if (inspCollapsed) return null;
    switch (tab) {
      case "layers":
        return <HierarchyPanel />;
      case "design":
        return <DesignPanel />;
      case "data":
        return <DataBindingsPanel />;
      case "comments":
        return <CommentsPanel />;
      case "history":
        return <HistoryPanel />;
      case "meta":
        return <MetadataPanel />;
      default:
        return <DesignPanel />;
    }
  })();

  return (
    <StudioLayout
      variant="edit"
      tools={preview || !showTools ? undefined : <Toolbox />}
      main={
        <div class="editor-workspace">
          {!preview && <OptionsBar />}
          {!preview && <EditRibbon />}
          {preview && (
            <div class="view-toolbar" aria-label="Preview">
              <Icon name="eye" size={15} title="Preview" />
              {rows.length === 0 ? (
                <span class="muted">Load data in the Data view first.</span>
              ) : (
                <select
                  value={idx}
                  onChange={(e) =>
                    setPreviewRowIndex(Number(e.currentTarget.value))
                  }
                  aria-label="Preview data row"
                  title="Previous/next: [ ] or Alt+← →"
                >
                  {rows.map((row, i) => (
                    <option value={i} key={i}>
                      {i + 1}:{" "}
                      {String(
                        row.headline ??
                          row.name ??
                          row[Object.keys(row)[0] ?? ""] ??
                          `Row ${i + 1}`,
                      ).slice(0, 48)}
                    </option>
                  ))}
                </select>
              )}
              <div
                class="preview-kinds"
                role="group"
                aria-label="Document language"
                title="Override language for conditions (or use From row)"
              >
                <button
                  type="button"
                  class={
                    langOverride == null
                      ? "preview-kinds__btn preview-kinds__btn--on"
                      : "preview-kinds__btn"
                  }
                  title={`From row (${rowLang})`}
                  aria-pressed={langOverride == null}
                  onClick={() => setPreviewLanguageOverride(null)}
                >
                  Row
                </button>
                {PREVIEW_LANGUAGE_OPTIONS.map((code) => {
                  const active = langOverride === code;
                  return (
                    <button
                      type="button"
                      key={code}
                      class={
                        active
                          ? "preview-kinds__btn preview-kinds__btn--on"
                          : "preview-kinds__btn"
                      }
                      title={`Language ${code.toUpperCase()}`}
                      aria-label={`Language ${code}`}
                      aria-pressed={active}
                      onClick={() => setPreviewLanguageOverride(code)}
                    >
                      {code.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <div
                class="preview-kinds"
                role="group"
                aria-label="Output kind"
                title="Previous/next output: Shift+[ ]"
              >
                {OUTPUT_KINDS.map((kind) => {
                  const enabled = outputs.some((o) => o.kind === kind);
                  const active = enabled && activeKind === kind;
                  return (
                    <button
                      type="button"
                      key={kind}
                      class={
                        active
                          ? "preview-kinds__btn preview-kinds__btn--on"
                          : enabled
                            ? "preview-kinds__btn"
                            : "preview-kinds__btn preview-kinds__btn--off"
                      }
                      disabled={!enabled}
                      title={
                        enabled
                          ? `${OUTPUT_KIND_LABEL[kind]} preview`
                          : `No ${OUTPUT_KIND_LABEL[kind]} output yet`
                      }
                      aria-label={OUTPUT_KIND_LABEL[kind]}
                      aria-pressed={active}
                      onClick={() => selectKind(kind)}
                    >
                      {OUTPUT_KIND_LABEL[kind]}
                    </button>
                  );
                })}
              </div>
              {activeKind && (
                <span class="muted preview-kind-hint">
                  {(langOverride ?? rowLang).toUpperCase()} ·{" "}
                  {OUTPUT_KIND_LABEL[activeKind]} · [ ] row · Shift+[ ] output
                </span>
              )}
            </div>
          )}          <div class="editor-stage">
            <EditorCanvas preview={preview} />
          </div>
          {showStatus && <StatusBar />}
        </div>
      }
      inspector={
        preview || !showInspector ? undefined : (
          <div data-tour="inspector" class="inspector-shell">
            <div class="inspector-tabs" role="tablist" aria-label={t("inspector")}>
              {INSPECTOR_TABS.map((tabDef) => (
                <button
                  type="button"
                  role="tab"
                  key={tabDef.id}
                  class="inspector-tabs__btn inspector-tabs__btn--icon"
                  title={t(tabDef.labelKey)}
                  aria-label={t(tabDef.labelKey)}
                  aria-selected={tab === tabDef.id}
                  onClick={() => {
                    inspectorTab.value = tabDef.id;
                    if (prefs.value.inspectorCollapsed) {
                      updatePrefs({ inspectorCollapsed: false });
                    }
                  }}
                >
                  <Icon name={tabDef.icon} size={14} />
                </button>
              ))}
            </div>
            {inspCollapsed ? (
              <div class="insp-icons" aria-label={t("inspector")}>
                {INSPECTOR_TABS.map((tabDef) => (
                  <button
                    type="button"
                    key={tabDef.id}
                    class={
                      tab === tabDef.id
                        ? "nav-icon-btn nav-icon-btn--on"
                        : "nav-icon-btn"
                    }
                    title={t(tabDef.labelKey)}
                    aria-label={t(tabDef.labelKey)}
                    onClick={() => {
                      inspectorTab.value = tabDef.id;
                      updatePrefs({ inspectorCollapsed: false });
                    }}
                  >
                    <Icon name={tabDef.icon} size={14} />
                  </button>
                ))}
              </div>
            ) : (
              inspectorBody
            )}
          </div>
        )
      }
    />
  );
}
