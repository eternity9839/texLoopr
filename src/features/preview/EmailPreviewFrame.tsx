import { useMemo } from "preact/hooks";
import {
  activeOutputProfile,
  catalogProjectId,
  dataRows,
  previewLanguageOverride,
  previewConditionOverrides,
  previewRowIndex,
  project,
} from "../../state/store";
import { ensureProjectAutomation } from "../../model/document";
import { buildEmailArtifacts } from "../../model/email";
import { downloadBytes, mimeForOutputKind } from "../../model/download";
import { t } from "../../i18n";

/** HTML email client frame shown in Preview when output.kind === email. */
export function EmailPreviewFrame() {
  const proj = ensureProjectAutomation(project.value);
  const rows = dataRows.value;
  const idx = Math.min(previewRowIndex.value, Math.max(rows.length - 1, 0));
  const row = rows[idx] ?? {};
  const output = activeOutputProfile();
  const langOverride = previewLanguageOverride.value;
  const conditionOverrides = previewConditionOverrides.value;
  const projectId = catalogProjectId.value;

  const artifacts = useMemo(() => {
    if (!output || output.kind !== "email") return null;
    try {
      return buildEmailArtifacts({
        project: proj,
        row,
        output,
        languageOverride: langOverride,
        conditionOverrides,
        projectId,
      });
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : String(err),
      } as const;
    }
  }, [proj, row, output, langOverride, conditionOverrides, projectId]);

  if (!output || output.kind !== "email") return null;

  if (!artifacts || "error" in artifacts) {
    return (
      <div class="email-preview" role="status">
        <p class="muted">
          {artifacts && "error" in artifacts
            ? artifacts.error
            : t("emailPreviewEmpty")}
        </p>
      </div>
    );
  }

  const onDownload = () => {
    const bytes = new TextEncoder().encode(artifacts.eml);
    const safe = artifacts.subject.replace(/[^\w.-]+/g, "_").slice(0, 48);
    downloadBytes(bytes, `${safe || "message"}.eml`, mimeForOutputKind("email"));
  };

  return (
    <div class="email-preview">
      <div class="email-preview__chrome">
        <div class="email-preview__meta">
          <div>
            <span class="email-preview__label">{t("emailPreviewSubject")}</span>{" "}
            <strong>{artifacts.subject}</strong>
          </div>
          <div class="muted">
            {t("emailPreviewHint")} · {artifacts.language.toUpperCase()}
          </div>
        </div>
        <button type="button" class="btn btn--ghost btn--small" onClick={onDownload}>
          {t("emailDownloadEml")}
        </button>
      </div>
      <div class="email-preview__frame">
        <iframe
          class="email-preview__iframe"
          title={t("emailPreviewTitle")}
          sandbox=""
          srcDoc={artifacts.html}
        />
      </div>
    </div>
  );
}
