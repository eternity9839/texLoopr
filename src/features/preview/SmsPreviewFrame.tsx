import { useMemo } from "preact/hooks";
import type { ComponentChild } from "preact";
import {
  activeOutputProfile,
  dataRows,
  previewLanguageOverride,
  previewConditionOverrides,
  previewRowIndex,
  project,
} from "../../state/store";
import { ensureProjectAutomation } from "../../model/document";
import { buildSmsArtifacts } from "../../model/email";
import { t } from "../../i18n";

/** Fair SMS handset preview — message body, not the document canvas. */
export function SmsPreviewFrame() {
  const proj = ensureProjectAutomation(project.value);
  const rows = dataRows.value;
  const idx = Math.min(previewRowIndex.value, Math.max(rows.length - 1, 0));
  const row = rows[idx] ?? {};
  const output = activeOutputProfile();
  const langOverride = previewLanguageOverride.value;
  const conditionOverrides = previewConditionOverrides.value;

  const artifacts = useMemo(() => {
    if (!output || output.kind !== "sms") return null;
    try {
      return buildSmsArtifacts({
        project: proj,
        row,
        output,
        languageOverride: langOverride,
        conditionOverrides,
      });
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : String(err),
      } as const;
    }
  }, [proj, row, output, langOverride, conditionOverrides]);

  if (!output || output.kind !== "sms") return null;

  if (!artifacts || "error" in artifacts) {
    return (
      <div class="channel-preview channel-preview--sms" role="status">
        <p class="muted">
          {artifacts && "error" in artifacts
            ? artifacts.error
            : t("smsPreviewEmpty")}
        </p>
      </div>
    );
  }

  const lines = artifacts.text.split(/\n+/).filter((l) => l.length > 0);

  return (
    <div class="channel-preview channel-preview--sms">
      <div class="sms-phone" aria-label={t("smsPreviewTitle")}>
        <div class="sms-phone__bezel">
          <div class="sms-phone__notch" aria-hidden="true" />
          <header class="sms-phone__status">
            <span>{t("smsPreviewTo")}</span>
            <strong>{artifacts.to}</strong>
          </header>
          <div class="sms-phone__thread">
            <div class="sms-bubble" role="article">
              {lines.map((line, i) => (
                <p key={`${i}-${line.slice(0, 12)}`} class="sms-bubble__line">
                  {renderSmsLine(line)}
                </p>
              ))}
            </div>
          </div>
          <footer class="sms-phone__meta">
            <span>
              {t("smsPreviewHint")} · {artifacts.language.toUpperCase()}
            </span>
            <span>{artifacts.segmentHint}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

/** Highlight unresolved {{fields}} inside the SMS bubble. */
function renderSmsLine(line: string) {
  const nodes: ComponentChild[] = [];
  const re = /\{\{\s*[^}]+\s*\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) nodes.push(line.slice(last, m.index));
    nodes.push(
      <mark key={`f-${key++}`} class="sms-field sms-field--missing">
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) nodes.push(line.slice(last));
  return nodes.length ? nodes : line;
}
