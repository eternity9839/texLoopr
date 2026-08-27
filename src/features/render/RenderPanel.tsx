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
  previewRowIndex,
  project,
} from "../../state/store";
import { SegmentedControl, SelectField } from "../../ui/controls";
import { Icon } from "../../ui/icons";
import { t } from "../../i18n";

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

  const idx = Math.min(previewRowIndex.value, Math.max(rows.length - 1, 0));
  const selectedRows: DataRow[] = isStatic
    ? STATIC_ROW
    : rowScope === "all"
      ? rows
      : [rows[idx]!];

  const onGenerate = async () => {
    if (!renderOutput) {
      setError(t("renderNoPdfOutput"));
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
        output: renderOutput,
        includeZip: includeZip && selectedRows.length > 1,
        projectId: catalogProjectId.value,
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
      <p class="render-panel__lede muted">
        {renderOutput?.kind === "email"
          ? t("renderHintEmail")
          : isBatch
            ? t("renderHintBatch")
            : t("renderHintStatic")}
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
          <label class="render-panel__check">
            <input
              type="checkbox"
              checked={includeZip}
              onChange={(e) => setIncludeZip(e.currentTarget.checked)}
              disabled={rowScope !== "all"}
            />
            {t("renderIncludeZip")}
          </label>
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
                      mimeForOutputKind(renderOutput?.kind ?? "pdf"),
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
