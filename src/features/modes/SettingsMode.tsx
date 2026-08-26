import {
  prefs,
  updatePrefs,
  updateProjectMeta,
  createProject,
  setOverlay,
  hydrateFromCatalog,
  catalogReady,
  catalogBackend,
  catalogProjectId,
  settingsSection,
  type SettingsSection,
} from "../../state/store";
import type { UiTheme, PageViewMode, CanvasPresetId, BindingPreviewMode } from "../../model/document";
import { CANVAS_PRESETS } from "../../model/document";
import { Section, SelectField } from "../../ui/controls";
import { t, localeLabel, type LocaleId } from "../../i18n";
import { SHORTCUT_SECTIONS } from "../editor/editorShortcuts";

const SECTIONS: { id: SettingsSection; labelKey: "general" | "sectionAppearance" | "sectionPage" | "sectionEditor" }[] =
  [
    { id: "general", labelKey: "general" },
    { id: "appearance", labelKey: "sectionAppearance" },
    { id: "page", labelKey: "sectionPage" },
    { id: "editor", labelKey: "sectionEditor" },
  ];

export function SettingsMode() {
  const p = prefs.value;
  const section = settingsSection.value;
  const backend = catalogBackend.value;
  const ready = catalogReady.value;
  const linked = catalogProjectId.value;

  return (
    <div class="settings-panel">
      <nav class="settings-nav" aria-label={t("settings")}>
        {SECTIONS.map((s) => (
          <button
            type="button"
            key={s.id}
            class={
              section === s.id
                ? "settings-nav__btn settings-nav__btn--active"
                : "settings-nav__btn"
            }
            aria-current={section === s.id ? "page" : undefined}
            onClick={() => {
              settingsSection.value = s.id;
            }}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </nav>

      {section === "general" && (
        <>
          <Section defaultOpen title={t("preferences")}>
            <SelectField
              id="settings-locale"
              label={t("language")}
              value={p.locale ?? "en"}
              options={[
                { value: "fr", label: localeLabel("fr") },
                { value: "en", label: localeLabel("en") },
              ]}
              onChange={(v) => updatePrefs({ locale: v as LocaleId })}
            />
            <SelectField
              id="settings-theme"
              label={t("theme")}
              value={p.theme ?? "nova"}
              options={[
                { value: "nova", label: t("themeNova") },
                { value: "stone", label: t("themeStone") },
                { value: "mist", label: t("themeMist") },
                { value: "dusk", label: t("themeDusk") },
              ]}
              onChange={(v) => updatePrefs({ theme: v as UiTheme })}
            />
            <SelectField
              id="settings-density"
              label={t("displaySize")}
              value={p.density}
              options={[
                { value: "comfortable", label: t("comfortable") },
                { value: "compact", label: t("compact") },
              ]}
              onChange={(v) =>
                updatePrefs({ density: v as "comfortable" | "compact" })
              }
              hint={t("densityHint")}
            />
          </Section>

          <Section defaultOpen title={t("connections")}>
            <div class="settings-conn">
              <div class="settings-conn__row">
                <span class="muted">{t("storage")}</span>
                <strong>
                  {!ready
                    ? t("notConnected")
                    : backend === "tauri"
                      ? t("desktopLibrary")
                      : t("browserLibrary")}
                </strong>
              </div>
              <div class="settings-conn__row">
                <span class="muted">{t("linkedProject")}</span>
                <strong>{linked ? `#${linked.slice(0, 8)}` : "—"}</strong>
              </div>
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() => void hydrateFromCatalog()}
              >
                {ready ? t("refreshConnection") : t("connectLibrary")}
              </button>
            </div>
          </Section>

          <Section defaultOpen title={t("keyboardShortcuts")}>
            {SHORTCUT_SECTIONS.map((section) => (
              <div class="settings-keys-group" key={section.titleKey}>
                <h4 class="settings-keys-group__title">
                  {t(section.titleKey as Parameters<typeof t>[0])}
                </h4>
                <dl class="settings-keys">
                  {section.rows.map((row) => (
                    <div class="settings-keys__row" key={row.keys}>
                      <dt>
                        <kbd>{row.keys}</kbd>
                      </dt>
                      <dd>{t(row.actionKey as Parameters<typeof t>[0])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </Section>

          <Section defaultOpen title={t("workspace")}>
            <p class="muted settings-hint">{t("workspaceHint")}</p>
            <div class="field-row">
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() => {
                  createProject();
                  setOverlay(null);
                }}
              >
                {t("newBlankProject")}
              </button>
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() => setOverlay("samples")}
              >
                {t("sampleDocuments")}
              </button>
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() => setOverlay("about")}
              >
                {t("about")}…
              </button>
            </div>
          </Section>
        </>
      )}

      {section === "appearance" && (
        <Section defaultOpen title={t("sectionAppearance")}>
          <p class="muted settings-hint">{t("sectionAppearanceHint")}</p>
          <ToggleRow
            label={t("tools")}
            checked={p.showToolsRail !== false}
            onChange={(v) => updatePrefs({ showToolsRail: v })}
          />
          <ToggleRow
            label={t("inspector")}
            checked={p.showInspectorRail !== false}
            onChange={(v) => updatePrefs({ showInspectorRail: v })}
          />
          <ToggleRow
            label={t("statusBar")}
            checked={p.showStatusBar !== false}
            onChange={(v) => updatePrefs({ showStatusBar: v })}
          />
          <ToggleRow
            label={t("comments")}
            checked={p.showComments !== false}
            onChange={(v) => updatePrefs({ showComments: v })}
          />
        </Section>
      )}

      {section === "page" && (
        <Section defaultOpen title={t("sectionPage")}>
          <p class="muted settings-hint">{t("sectionPageHint")}</p>
          <SelectField
            id="settings-page-view"
            label={t("view")}
            value={p.pageViewMode ?? "single"}
            options={[
              { value: "single", label: t("onePage") },
              { value: "continuous", label: t("continuous") },
              { value: "spread", label: t("twoUp") },
            ]}
            onChange={(v) =>
              updatePrefs({ pageViewMode: v as PageViewMode })
            }
          />
          <SelectField
            id="settings-canvas-preset"
            label={t("canvasPreset")}
            value={p.canvasPreset ?? "document"}
            options={(Object.keys(CANVAS_PRESETS) as CanvasPresetId[]).map(
              (id) => ({
                value: id,
                label: CANVAS_PRESETS[id].label,
              }),
            )}
            onChange={(v) => {
              const next = v as CanvasPresetId;
              updatePrefs({ canvasPreset: next });
              updateProjectMeta({ artboard: next });
            }}
          />
          <SelectField
            id="settings-board-rotate"
            label={t("boardRotation")}
            value={String(p.canvasRotate ?? 0)}
            options={[
              { value: "0", label: "0°" },
              { value: "90", label: "90°" },
              { value: "180", label: "180°" },
              { value: "270", label: "270°" },
            ]}
            onChange={(v) =>
              updatePrefs({
                canvasRotate: Number(v) as 0 | 90 | 180 | 270,
              })
            }
          />
          <ToggleRow
            label={t("margins")}
            checked={p.showMarginGuides !== false}
            onChange={(v) => updatePrefs({ showMarginGuides: v })}
          />
          <ToggleRow
            label={t("rulers")}
            checked={p.showRulers !== false}
            onChange={(v) => updatePrefs({ showRulers: v })}
          />
          <SelectField
            id="settings-ruler-unit"
            label={t("rulerUnit")}
            hint={t("rulerUnitHint")}
            value={p.rulerUnit ?? "px"}
            options={[
              { value: "px", label: t("rulerUnitPx") },
              { value: "mm", label: t("rulerUnitMm") },
              { value: "cm", label: t("rulerUnitCm") },
              { value: "in", label: t("rulerUnitIn") },
            ]}
            onChange={(v) =>
              updatePrefs({
                rulerUnit: v as "px" | "mm" | "cm" | "in",
              })
            }
          />
          <ToggleRow
            label="Formats in Layers tree"
            checked={p.showFormatsInTree === true}
            onChange={(v) => updatePrefs({ showFormatsInTree: v })}
          />
        </Section>
      )}

      {section === "editor" && (
        <Section defaultOpen title={t("sectionEditor")}>
          <p class="muted settings-hint">{t("sectionEditorHint")}</p>
          <ToggleRow
            label={t("grid")}
            checked={Boolean(p.showGrid)}
            onChange={(v) => updatePrefs({ showGrid: v })}
          />
          <ToggleRow
            label={t("snap")}
            checked={Boolean(p.snap)}
            onChange={(v) => updatePrefs({ snap: v })}
          />
          <ToggleRow
            label={t("gridLock")}
            checked={p.gridLock === true}
            onChange={(v) => updatePrefs({ gridLock: v })}
          />
          <SelectField
            id="settings-binding-preview"
            label={t("bindingPreviewMode")}
            hint={t("bindingPreviewHint")}
            value={p.bindingPreviewMode ?? "popup"}
            options={[
              { value: "popup", label: t("bindingPreviewPopup") },
              { value: "inline", label: t("bindingPreviewInline") },
            ]}
            onChange={(v) =>
              updatePrefs({ bindingPreviewMode: v as BindingPreviewMode })
            }
          />
          <ToggleRow
            label={t("editContrastAssist")}
            checked={p.editContrastAssist !== false}
            onChange={(v) => updatePrefs({ editContrastAssist: v })}
          />
          <p class="muted settings-hint">{t("editContrastAssistHint")}</p>
          <ToggleRow
            label={t("showInactiveBranches")}
            checked={p.showInactiveBranches === true}
            onChange={(v) => updatePrefs({ showInactiveBranches: v })}
          />
          <p class="muted settings-hint">{t("showInactiveBranchesHint")}</p>
          <ToggleRow
            label={t("textExpansions")}
            checked={p.textExpansionsEnabled !== false}
            onChange={(v) => updatePrefs({ textExpansionsEnabled: v })}
          />
          <p class="muted settings-hint">{t("textExpansionsHint")}</p>
        </Section>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label class="settings-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
