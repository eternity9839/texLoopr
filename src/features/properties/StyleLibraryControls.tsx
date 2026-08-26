import { useState } from "preact/hooks";
import {
  applyDocumentStyle,
  applyTextStyleToSelection,
  deleteDocumentStyle,
  deleteTextStyle,
  project,
  saveDocumentStyleFromCurrent,
  saveTextStyleFromSelection,
  selectedBlock,
} from "../../state/store";
import {
  listDocumentStyles,
  listTextStyles,
} from "../../model/styleLibrary";
import { t } from "../../i18n";
import { Field, SelectField } from "../../ui/controls";

export function TextStyleLibrary() {
  const styles = listTextStyles(project.value);
  const [selectedId, setSelectedId] = useState(styles[0]?.id ?? "");
  const [saveName, setSaveName] = useState("");
  const hasSelection = Boolean(selectedBlock.value);

  const userStyles = (project.value.textStyles ?? []).filter((s) => !s.builtin);

  return (
    <div class="style-library">
      <SelectField
        id="text-style-pick"
        label={t("textStylePreset")}
        value={selectedId}
        options={styles.map((s) => ({
          value: s.id,
          label: s.builtin ? s.name : `${s.name} ★`,
        }))}
        onChange={setSelectedId}
      />
      <div class="style-library__actions">
        <button
          type="button"
          class="btn btn--small"
          disabled={!selectedId || !hasSelection}
          onClick={() => selectedId && applyTextStyleToSelection(selectedId)}
        >
          {t("applyTextStyle")}
        </button>
      </div>
      <Field label={t("saveTextStyleAs")} forId="text-style-save-name" compact>
        <div class="style-library__save-row">
          <input
            id="text-style-save-name"
            placeholder={t("textStyleNamePlaceholder")}
            value={saveName}
            onInput={(e) => setSaveName(e.currentTarget.value)}
            disabled={!hasSelection}
          />
          <button
            type="button"
            class="btn btn--ghost btn--small"
            disabled={!hasSelection || !saveName.trim()}
            onClick={() => {
              const saved = saveTextStyleFromSelection(saveName.trim());
              if (saved) {
                setSelectedId(saved.id);
                setSaveName("");
              }
            }}
          >
            {t("saveStyle")}
          </button>
        </div>
      </Field>
      {userStyles.length > 0 && (
        <ul class="style-library__user-list">
          {userStyles.map((s) => (
            <li key={s.id}>
              <span>{s.name}</span>
              <button
                type="button"
                class="btn btn--ghost btn--small btn--icon"
                title={t("deleteStyle")}
                aria-label={t("deleteStyle")}
                onClick={() => {
                  deleteTextStyle(s.id);
                  if (selectedId === s.id) {
                    setSelectedId(styles[0]?.id ?? "");
                  }
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DocumentStyleLibrary() {
  const styles = listDocumentStyles(project.value);
  const [selectedId, setSelectedId] = useState(styles[0]?.id ?? "");
  const [saveName, setSaveName] = useState("");
  const preset = styles.find((s) => s.id === selectedId);
  const userStyles = (project.value.documentStyles ?? []).filter(
    (s) => !s.builtin,
  );

  return (
    <div class="style-library">
      <SelectField
        id="doc-style-pick"
        label={t("documentStylePreset")}
        value={selectedId}
        options={styles.map((s) => ({
          value: s.id,
          label: s.builtin ? s.name : `${s.name} ★`,
        }))}
        onChange={setSelectedId}
      />
      <div class="style-library__actions">
        <button
          type="button"
          class="btn btn--small"
          disabled={!selectedId}
          onClick={() => selectedId && applyDocumentStyle(selectedId)}
        >
          {t("applyDocumentStyle")}
        </button>
      </div>
      {preset?.colorPalette && preset.colorPalette.length > 0 && (
        <div class="style-library__palette">
          <span class="style-library__palette-label">{t("colorPalette")}</span>
          <div class="style-library__swatches" role="list">
            {preset.colorPalette.map((color) => (
              <span
                key={color}
                role="listitem"
                class="style-library__swatch"
                title={color}
                style={{ background: color }}
              />
            ))}
          </div>
        </div>
      )}
      {preset?.groupStyle?.layout === "flex" && (
        <p class="muted prop-hint">
          {t("documentStyleFlexHint")} — {preset.groupStyle.direction ?? "column"}
          , gap {preset.groupStyle.gap ?? 0}px
        </p>
      )}
      <Field label={t("saveDocumentStyleAs")} forId="doc-style-save-name" compact>
        <div class="style-library__save-row">
          <input
            id="doc-style-save-name"
            placeholder={t("documentStyleNamePlaceholder")}
            value={saveName}
            onInput={(e) => setSaveName(e.currentTarget.value)}
          />
          <button
            type="button"
            class="btn btn--ghost btn--small"
            disabled={!saveName.trim()}
            onClick={() => {
              const saved = saveDocumentStyleFromCurrent(saveName.trim());
              if (saved) {
                setSelectedId(saved.id);
                setSaveName("");
              }
            }}
          >
            {t("saveStyle")}
          </button>
        </div>
      </Field>
      {userStyles.length > 0 && (
        <ul class="style-library__user-list">
          {userStyles.map((s) => (
            <li key={s.id}>
              <span>{s.name}</span>
              <button
                type="button"
                class="btn btn--ghost btn--small btn--icon"
                title={t("deleteStyle")}
                aria-label={t("deleteStyle")}
                onClick={() => {
                  deleteDocumentStyle(s.id);
                  if (selectedId === s.id) {
                    setSelectedId(styles[0]?.id ?? "");
                  }
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
