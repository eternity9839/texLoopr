import { useEffect, useMemo, useState } from "preact/hooks";
import { ensureProjectAutomation } from "../../model/document";
import type { DataRow } from "../../model/bindings";
import type { OutputProfile } from "../../model/workflow";
import {
  downloadBase64,
  mimeForOutputKind,
} from "../../model/download";
import { OUTPUT_KIND_LABEL } from "../../model/workflow";
import {
  catalogProjectId,
  dataRows,
  prefs,
  previewConditionOverrides,
  previewLanguageOverride,
  previewRowIndex,
  project,
} from "../../state/store";
import { SegmentedControl, SelectField } from "../../ui/controls";
import { Icon } from "../../ui/icons";
import { t } from "../../i18n";
import { ErrorCodes } from "../../model/appErrors";
import {
  hideLoading,
  reportAppError,
  showLoading,
} from "../../state/appFeedback";
import { log } from "../../debug/logger";

type RowScope = "current" | "all";

const STATIC_ROW: DataRow[] = [{}];

function isRenderableOutput(kind: string | undefined): boolean {
  return kind === "pdf" || kind === "print" || kind === "email";
}

function renderableOutputs(outputs: OutputProfile[] | undefined): OutputProfile[] {
  return (outputs ?? []).filter((o) => isRenderableOutput(o.kind));
}

export function RenderPanel() {
  const proj = ensureProjectAutomation(project.value);
  const rows = dataRows.value;
  const pdfEngine = prefs.value.pdfEngine ?? "browser";
  const pdfOutputs = useMemo(
    () => renderableOutputs(proj.outputs),
    [proj.outputs],
  );
  const [renderOutputId, setRenderOutputId] = useState(
    () => pdfOutputs[0]?.id ?? "",
  );
  const [rowScope, setRowScope] = useState<RowScope>("current");
  const [includeZip, setIncludeZip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [result, setResult] = useState<
    import("../../model/backend").RenderBatchResult | null
  >(null);

  useEffect(() => {
    if (pdfOutputs.some((o) => o.id === renderOutputId)) return;
    setRenderOutputId(pdfOutputs[0]?.id ?? "");
  }, [pdfOutputs, renderOutputId]);

  const renderOutput = pdfOutputs.find((o) => o.id === renderOutputId);
  const isStatic = rows.length === 0;
  const isBatch = rows.length > 1;
  const useBrowserPdf =
    pdfEngine === "browser" &&
    (renderOutput?.kind === "pdf" || renderOutput?.kind === "print");

  const idx = Math.min(previewRowIndex.value, Math.max(rows.length - 1, 0));
  const selectedRows: DataRow[] = isStatic
    ? STATIC_ROW
    : rowScope === "all"
      ? rows
      : [rows[idx]!];

  const onGenerate = async () => {
    if (!renderOutput) {
      reportAppError({
        code: ErrorCodes.RENDER_NO_OUTPUT,
        message: t("renderNoPdfOutput"),
      });
      setError(t("renderNoPdfOutput"));
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(null);
    setSavedPath(null);
    setResult(null);
    showLoading("render", t("renderRunning"));
    log.info("render", "batch start", {
      outputId: renderOutput.id,
      kind: renderOutput.kind,
      engine: useBrowserPdf ? "browser" : "rust",
      rows: selectedRows.length,
    });
    try {
      if (useBrowserPdf) {
        const { printBrowserPdf } = await import("./BrowserPdfPrint");
        await printBrowserPdf({
          project: proj,
          rows: selectedRows,
          output: renderOutput,
          languageOverride: previewLanguageOverride.value,
          conditionOverrides: previewConditionOverrides.value,
        });
        setStatus(t("renderBrowserDone"));
        log.info("render", "browser print done");
        return;
      }

      const { renderBatchBackend } = await import("../../model/backend");
      const batch = await renderBatchBackend({
        project: proj,
        rows: selectedRows,
        output: renderOutput,
        includeZip: includeZip && selectedRows.length > 1,
        projectId: catalogProjectId.value,
      });
      setResult(batch);
      if (batch.errors.length > 0 && batch.files.length === 0) {
        const detail = batch.errors.join("\n");
        setError(detail);
        reportAppError({
          code: ErrorCodes.RENDER_EMPTY,
          message: t("renderFailed"),
          detail,
        });
      } else {
        log.info("render", "batch done", { files: batch.files.length });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      reportAppError({
        code: ErrorCodes.RENDER_BATCH,
        message: t("renderFailed"),
        cause: e,
      });
    } finally {
      setBusy(false);
      hideLoading();
    }
  };

  const zipName = `${proj.name || "render"}-batch.zip`.replace(/[^\w.-]+/g, "_");

  const saveFile = (base64: string, name: string, mime: string) => {
    void downloadBase64(base64, name, mime)
      .then((path) => {
        if (path) setSavedPath(path);
        log.info("save", "export saved", { name, path: path ?? "(browser)" });
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        reportAppError({
          code: ErrorCodes.SAVE_DOWNLOAD,
          message: t("saveFailed"),
          cause: e,
        });
      });
  };

  return (
    <div class="render-panel panel-pad">
      <p class="render-panel__lede muted">
        {renderOutput?.kind === "email"
          ? t("renderHintEmail")
          : useBrowserPdf
            ? t("renderBrowserHint")
            : isBatch
              ? t("renderHintBatch")
              : t("renderHintStatic")}
      </p>
      <p class="muted prop-hint">
        {t("pdfEngine")}:{" "}
        {pdfEngine === "rust" ? t("pdfEngineRust") : t("pdfEngineBrowser")}
      </p>

      <div class="render-panel__card">
        {pdfOutputs.length === 0 ? (
          <p class="render-panel__warn" role="status">
            {t("renderNoPdfOutput")}
          </p>
        ) : (
          <SelectField
            id="render-output-pick"
            label={t("renderOutput")}
            value={renderOutputId}
            options={pdfOutputs.map((o) => ({
              value: o.id,
              label: `${o.name} (${OUTPUT_KIND_LABEL[o.kind] ?? o.kind})`,
            }))}
            onChange={setRenderOutputId}
          />
        )}
      </div>

      {isBatch && (
        <div class="render-panel__batch">
          <span class="render-panel__card-label">{t("renderRows")}</span>
          <SegmentedControl<RowScope>
            ariaLabel={t("renderRows")}
            value={rowScope}
            options={[
              {
                value: "current",
                label: `${t("renderRowCurrent")} (${idx + 1}/${rows.length})`,
              },
              {
                value: "all",
                label: `${t("renderRowAll")} (${rows.length})`,
              },
            ]}
            onChange={setRowScope}
          />
          {!useBrowserPdf && (
            <label class="render-panel__check">
              <input
                type="checkbox"
                checked={includeZip}
                onChange={(e) => setIncludeZip(e.currentTarget.checked)}
                disabled={rowScope !== "all"}
              />
              {t("renderIncludeZip")}
            </label>
          )}
        </div>
      )}

      <div class="render-panel__actions">
        <button
          type="button"
          class="btn"
          disabled={busy || !renderOutput}
          onClick={() => void onGenerate()}
        >
          <Icon name="play" size={14} />
          {busy ? t("renderRunning") : t("renderGenerate")}
        </button>
      </div>

      {status && (
        <p class="render-panel__saved muted" role="status">
          {status}
        </p>
      )}

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
                  saveFile(result.zipBase64!, zipName, "application/zip")
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
                    saveFile(
                      file.bytesBase64,
                      file.name,
                      mimeForOutputKind(renderOutput?.kind ?? "pdf"),
                    )
                  }
                >
                  <Icon name="save" size={14} />
                </button>
              </li>
            ))}
          </ul>
          {savedPath && (
            <p class="render-panel__saved muted" role="status">
              {t("renderSavedTo")}: <code>{savedPath}</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
