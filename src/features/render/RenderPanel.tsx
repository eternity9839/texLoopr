import { useState } from "preact/hooks";
import { ensureProjectAutomation } from "../../model/document";
import {
  downloadBase64,
  mimeForOutputKind,
} from "../../model/download";
import { OUTPUT_KIND_LABEL } from "../../model/workflow";
import {
  activeOutputProfile,
  dataRows,
  previewRowIndex,
  project,
  setStudioView,
} from "../../state/store";
import { Icon } from "../../ui/icons";
import { t } from "../../i18n";

type RowScope = "current" | "all";

function isRustRenderable(kind: string | undefined): boolean {
  return kind === "pdf" || kind === "print";
}

export function RenderPanel() {
  const proj = ensureProjectAutomation(project.value);
  const rows = dataRows.value;
  const activeOutput = activeOutputProfile();
  const [rowScope, setRowScope] = useState<RowScope>("current");
  const [includeZip, setIncludeZip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    import("../../model/backend").RenderBatchResult | null
  >(null);

  const renderable = isRustRenderable(activeOutput?.kind);

  const idx = Math.min(previewRowIndex.value, Math.max(rows.length - 1, 0));
  const selectedRows =
    rows.length === 0
      ? []
      : rowScope === "all"
        ? rows
        : [rows[idx]!];

  const onGenerate = async () => {
    if (!activeOutput) {
      setError(t("renderNoOutput"));
      return;
    }
    if (!renderable) {
      setError(t("renderUnsupportedOutput"));
      return;
    }
    if (selectedRows.length === 0) {
      setError(t("renderNoRows"));
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { renderBatchBackend } = await import("../../model/backend");
      const batch = await renderBatchBackend({
        project: proj,
        rows: selectedRows,
        output: activeOutput,
        includeZip: includeZip && selectedRows.length > 1,
      });
      setResult(batch);
      if (batch.errors.length > 0 && batch.files.length === 0) {
        setError(batch.errors.join("\n"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const zipName = `${proj.name || "render"}-batch.zip`.replace(/[^\w.-]+/g, "_");

  return (
    <div class="render-panel panel-pad">
      <p class="muted" style={{ marginTop: 0 }}>
        {t("renderHint")}
      </p>

      <div class="render-panel__grid">
        <div class="field">
          <span class="field__label">{t("renderOutput")}</span>
          <div class="render-panel__output-active">
            <span>
              {activeOutput
                ? `${activeOutput.name} (${OUTPUT_KIND_LABEL[activeOutput.kind] ?? activeOutput.kind})`
                : t("renderNoOutput")}
            </span>
            <button
              type="button"
              class="btn btn--ghost btn--small"
              onClick={() => setStudioView("data")}
            >
              {t("renderChangeOutput")}
            </button>
          </div>
          <p class="muted prop-hint" style={{ margin: "0.35rem 0 0" }}>
            {t("renderOutputFromData")}
          </p>
        </div>

        {!renderable && activeOutput && (
          <p class="render-panel__warn" role="status">
            {t("renderUnsupportedOutput")}
          </p>
        )}

        <fieldset class="field">
          <legend class="field__label">{t("renderRows")}</legend>
          <div class="render-panel__radio-row">
            <label class="render-panel__radio">
              <input
                type="radio"
                name="render-scope"
                checked={rowScope === "current"}
                onChange={() => setRowScope("current")}
              />
              {t("renderRowCurrent")} ({Math.min(previewRowIndex.value, Math.max(rows.length - 1, 0)) + 1}
              /{Math.max(rows.length, 1)})
            </label>
            <label class="render-panel__radio">
              <input
                type="radio"
                name="render-scope"
                checked={rowScope === "all"}
                onChange={() => setRowScope("all")}
                disabled={rows.length <= 1}
              />
              {t("renderRowAll")} ({rows.length})
            </label>
          </div>
        </fieldset>

        <label class="render-panel__check">
          <input
            type="checkbox"
            checked={includeZip}
            onChange={(e) => setIncludeZip(e.currentTarget.checked)}
            disabled={selectedRows.length <= 1}
          />
          {t("renderIncludeZip")}
        </label>
      </div>

      <div class="render-panel__actions">
        <button
          type="button"
          class="btn btn--small"
          disabled={busy || !renderable || selectedRows.length === 0}
          onClick={() => void onGenerate()}
        >
          <Icon name="play" size={14} />
          {busy ? t("renderRunning") : t("renderGenerate")}
        </button>
      </div>

      {error && (
        <pre class="render-panel__log render-panel__log--error" role="alert">
          {error}
        </pre>
      )}

      {result && (
        <div class="render-panel__results">
          <div class="render-panel__results-head">
            <h3>{t("renderResults")}</h3>
            {result.zipBase64 && (
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() =>
                  downloadBase64(result.zipBase64!, zipName, "application/zip")
                }
              >
                <Icon name="files" size={14} />
                {t("renderDownloadZip")}
              </button>
            )}
          </div>

          {result.errors.length > 0 && (
            <pre class="render-panel__log render-panel__log--warn">
              {result.errors.join("\n")}
            </pre>
          )}

          <ul class="render-panel__file-list">
            {result.files.map((file) => (
              <li key={`${file.rowIndex}-${file.name}`}>
                <span class="render-panel__file-name">{file.name}</span>
                <button
                  type="button"
                  class="btn btn--ghost btn--small btn--icon"
                  title={t("renderDownloadFile")}
                  aria-label={t("renderDownloadFile")}
                  onClick={() =>
                    downloadBase64(
                      file.bytesBase64,
                      file.name,
                      mimeForOutputKind(activeOutput?.kind ?? "pdf"),
                    )
                  }
                >
                  <Icon name="save" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
