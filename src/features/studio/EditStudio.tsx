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
import { EmailPreviewFrame } from "../preview/EmailPreviewFrame";
import { INSPECTOR_TABS } from "./inspectorTabs";
import { t } from "../../i18n";
import {
  PREVIEW_OUTPUT_KINDS,
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
  previewConditionOverrides,
  setPreviewConditionOverride,
} from "../../state/store";
import { ensureProjectAutomation } from "../../model/document";
import { resolveDocumentLanguage } from "../../model/documentLanguage";
import {
  conditionChipValues,
  resolveConditionValue,
} from "../../model/documentConditions";

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

  const row = rows[idx];
  const rowLang = resolveDocumentLanguage(proj, row, null);
  const conditionAxes = proj.conditions ?? [];
  const overrides = previewConditionOverrides.value;

  const previewKinds = PREVIEW_OUTPUT_KINDS.filter((kind) =>
    outputs.some((o) => o.kind === kind),
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
                  {rows.map((r, i) => (
                    <option value={i} key={i}>
                      {i + 1}:{" "}
                      {String(
                        r.headline ??
                          r.name ??
                          r[Object.keys(r)[0] ?? ""] ??
                          `Row ${i + 1}`,
                      ).slice(0, 48)}
                    </option>
                  ))}
                </select>
              )}
              {conditionAxes.map((cond) => {
                const axisKey = cond.id;
                const ov = overrides[axisKey] ?? overrides[cond.var];
                const followRow = ov === undefined || ov === null;
                const chips = conditionChipValues(cond, rows);
                const resolved = resolveConditionValue(
                  cond,
                  row,
                  typeof ov === "string" ? ov : undefined,
                );
                return (
                  <div
                    class="preview-kinds"
                    role="group"
                    aria-label={cond.name || cond.var}
                    title={`${cond.name}: override vars.${cond.var} (or follow row)`}
                    key={cond.id}
                  >
                    <button
                      type="button"
                      class={
                        followRow
                          ? "preview-kinds__btn preview-kinds__btn--on"
                          : "preview-kinds__btn"
                      }
                      title={`From row (${resolved || "—"})`}
                      aria-pressed={followRow}
                      onClick={() => setPreviewConditionOverride(axisKey, null)}
                    >
                      Row
                    </button>
                    {chips.map((chip) => {
                      const active = !followRow && ov === chip.value;
                      return (
                        <button
                          type="button"
                          key={chip.value}
                          class={
                            active
                              ? "preview-kinds__btn preview-kinds__btn--on"
                              : "preview-kinds__btn"
                          }
                          title={`${cond.name}: ${chip.label}`}
                          aria-label={`${cond.name} ${chip.label}`}
                          aria-pressed={active}
                          onClick={() =>
                            setPreviewConditionOverride(axisKey, chip.value)
                          }
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <div
                class="preview-kinds"
                role="group"
                aria-label="Output kind"
                title="Previous/next output: Shift+[ ]"
              >
                {previewKinds.map((kind) => {
                  const active = activeKind === kind;
                  return (
                    <button
                      type="button"
                      key={kind}
                      class={
                        active
                          ? "preview-kinds__btn preview-kinds__btn--on"
                          : "preview-kinds__btn"
                      }
                      title={
                        kind === "email"
                          ? `${OUTPUT_KIND_LABEL[kind]} — HTML email preview`
                          : `${OUTPUT_KIND_LABEL[kind]} preview`
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
                  {rowLang.toUpperCase()} · {OUTPUT_KIND_LABEL[activeKind]}
                  {activeKind === "email" ? " · HTML" : ""} · [ ] row · Shift+[ ]
                  output
                </span>
              )}
            </div>
          )}
          <div class="editor-stage">
            {preview && activeKind === "email" ? (
              <EmailPreviewFrame />
            ) : (
              <EditorCanvas preview={preview} />
            )}
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
                    class="insp-icons__btn"
                    title={t(tabDef.labelKey)}
                    aria-label={t(tabDef.labelKey)}
                    aria-pressed={tab === tabDef.id}
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
              <div class="inspector-body">{inspectorBody}</div>
            )}
          </div>
        )
      }
    />
  );
}
