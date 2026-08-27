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

/** Fair HTML email client preview (not the canvas, not raw EML). */
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
      <div class="channel-preview channel-preview--email" role="status">
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
    void downloadBytes(bytes, `${safe || "message"}.eml`, mimeForOutputKind("email"));
  };

  return (
    <div class="channel-preview channel-preview--email">
      <div class="mail-client" aria-label={t("emailPreviewTitle")}>
        <header class="mail-client__chrome">
          <div class="mail-client__rows">
            <div class="mail-client__row">
              <span class="mail-client__key">{t("emailPreviewFrom")}</span>
              <span class="mail-client__val">{artifacts.from}</span>
            </div>
            <div class="mail-client__row">
              <span class="mail-client__key">{t("emailPreviewTo")}</span>
              <span class="mail-client__val">{artifacts.to}</span>
            </div>
            {artifacts.replyTo ? (
              <div class="mail-client__row">
                <span class="mail-client__key">{t("emailPreviewReplyTo")}</span>
                <span class="mail-client__val">{artifacts.replyTo}</span>
              </div>
            ) : null}
            {artifacts.cc ? (
              <div class="mail-client__row">
                <span class="mail-client__key">{t("emailPreviewCc")}</span>
                <span class="mail-client__val">{artifacts.cc}</span>
              </div>
            ) : null}
            {artifacts.bcc ? (
              <div class="mail-client__row mail-client__row--muted">
                <span class="mail-client__key">{t("emailPreviewBcc")}</span>
                <span class="mail-client__val">{artifacts.bcc}</span>
              </div>
            ) : null}
            <div class="mail-client__row">
              <span class="mail-client__key">{t("emailPreviewSubject")}</span>
              <strong class="mail-client__val">{artifacts.subject}</strong>
            </div>
            {artifacts.preheader ? (
              <div class="mail-client__row mail-client__row--muted">
                <span class="mail-client__key">{t("emailPreviewPreheader")}</span>
                <span class="mail-client__val">{artifacts.preheader}</span>
              </div>
            ) : null}
            {artifacts.extraHeaders.length > 0 ? (
              <div class="mail-client__headers">
                {artifacts.extraHeaders.map((h) => (
                  <div class="mail-client__row mail-client__row--muted" key={h.name}>
                    <span class="mail-client__key">{h.name}</span>
                    <span class="mail-client__val">{h.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div class="mail-client__actions">
            <span class="muted mail-client__hint">
              {t("emailPreviewHint")} · {artifacts.language.toUpperCase()}
            </span>
            <button
              type="button"
              class="btn btn--ghost btn--small"
              onClick={onDownload}
              title={t("emailDownloadEml")}
            >
              {t("emailDownloadEml")}
            </button>
          </div>
        </header>
        <div class="mail-client__body">
          <iframe
            class="mail-client__iframe"
            title={t("emailPreviewTitle")}
            sandbox=""
            srcDoc={artifacts.html}
          />
        </div>
      </div>
    </div>
  );
}
