import { t } from "../i18n";
import {
  formatErrorForClipboard,
  type AppErrorReport,
} from "../model/appErrors";
import { clearAppError } from "../state/appFeedback";
import { isDebugFileLoggerEnabled } from "../runtimeConfig";
import { log } from "../debug/logger";

export function ErrorWindow({ error }: { error: AppErrorReport }) {
  const onCopy = async () => {
    const text = formatErrorForClipboard(error);
    try {
      await navigator.clipboard.writeText(text);
      log.info("ui", "copied error report", { id: error.id });
    } catch (e) {
      log.warn("ui", "clipboard copy failed", {
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onOpenLog = async () => {
    if (!isDebugFileLoggerEnabled()) return;
    try {
      const { invoke } = await import("../platform/tauri");
      await invoke("open_debug_log");
    } catch (e) {
      log.warn("ui", "open debug log failed", {
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <div
      class="app-feedback-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="app-error-title"
      aria-describedby="app-error-body"
    >
      <div class="app-feedback-modal__card app-feedback-modal__card--error">
        <p class="app-feedback-modal__title" id="app-error-title">
          {t("errorWindowTitle")}
        </p>
        <p class="app-feedback-modal__code" id="app-error-body">
          <span class="app-feedback-modal__code-label">{t("errorCode")}</span>{" "}
          <code>{error.code}</code>
          <span class="muted"> · {error.id}</span>
        </p>
        <p class="app-feedback-modal__error">{error.message}</p>
        {error.detail ? (
          <pre class="app-feedback-modal__detail">{error.detail}</pre>
        ) : null}
        <div class="app-feedback-modal__actions">
          <button type="button" class="btn btn--ghost btn--small" onClick={() => void onCopy()}>
            {t("errorCopy")}
          </button>
          {isDebugFileLoggerEnabled() ? (
            <button
              type="button"
              class="btn btn--ghost btn--small"
              onClick={() => void onOpenLog()}
            >
              {t("errorOpenLog")}
            </button>
          ) : null}
          <button type="button" class="btn btn--small" onClick={() => clearAppError()}>
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
