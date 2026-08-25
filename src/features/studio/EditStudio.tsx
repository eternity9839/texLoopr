import { StudioLayout } from "../../ui/StudioLayout";
import { Icon } from "../../ui/icons";
import { Navigator } from "../tree/DocumentTree";
import { Toolbox } from "../editor/Toolbox";
import { EditorCanvas } from "../editor/EditorCanvas";
import { EditRibbon } from "../editor/EditRibbon";
import { PrebuildPicker } from "../editor/PrebuildPicker";
import { AppearanceBar } from "../properties/AppearanceBar";
import { PropertiesPanel, MetadataPanel } from "../properties/PropertiesPanel";
import { CommentsPanel } from "../editor/CommentsPanel";
import { INSPECTOR_TABS } from "./inspectorTabs";
import {
  previewMode,
  dataRows,
  previewRowIndex,
  setPreviewRowIndex,
  project,
  setActiveOutputId,
  inspectorTab,
  prefs,
} from "../../state/store";
import { ensureProjectAutomation } from "../../model/document";

export function EditStudio() {
  const preview = previewMode.value;
  const rows = dataRows.value;
  const idx = previewRowIndex.value;
  const proj = ensureProjectAutomation(project.value);
  const outputs = proj.outputs ?? [];
  const tab = inspectorTab.value;
  const inspCollapsed = Boolean(prefs.value.inspectorCollapsed);

  const inspectorBody = (() => {
    if (inspCollapsed) return <PropertiesPanel />;
    if (tab === "comments") return <CommentsPanel />;
    if (tab === "meta") return <MetadataPanel />;
    return <PropertiesPanel />;
  })();

  return (
    <StudioLayout
      variant="edit"
      navigator={<Navigator />}
      main={
        <div class="editor-workspace">
          {!preview && <EditRibbon />}
          {preview && (
            <div class="view-toolbar">
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
                >
                  {rows.map((row, i) => (
                    <option value={i} key={i}>
                      {i + 1}:{" "}
                      {row.name ?? row[Object.keys(row)[0]] ?? `Row ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={proj.activeOutputId ?? ""}
                onChange={(e) => setActiveOutputId(e.currentTarget.value)}
                aria-label="Preview output profile"
              >
                {outputs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.kind})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div class="editor-stage">
            {!preview && <Toolbox />}
            {!preview && <PrebuildPicker />}
            <EditorCanvas preview={preview} />
          </div>
        </div>
      }
      asideBottom={preview ? undefined : <AppearanceBar />}
      inspector={
        preview ? undefined : (
          <div data-tour="inspector" class="inspector-shell">
            {!inspCollapsed && (
              <div class="inspector-tabs" role="tablist" aria-label="Inspector">
                {INSPECTOR_TABS.map((t) => (
                  <button
                    type="button"
                    role="tab"
                    key={t.id}
                    class="inspector-tabs__btn inspector-tabs__btn--icon"
                    title={t.label}
                    aria-label={t.label}
                    aria-selected={tab === t.id}
                    onClick={() => {
                      inspectorTab.value = t.id;
                    }}
                  >
                    <Icon name={t.icon} size={14} />
                  </button>
                ))}
              </div>
            )}
            {inspectorBody}
          </div>
        )
      }
    />
  );
}
