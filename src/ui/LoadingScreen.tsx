import { t } from "../i18n";
import type { LoadingKind } from "../state/appFeedback";

const KIND_TITLE: Record<LoadingKind, () => string> = {
  boot: () => t("loadingBoot"),
  render: () => t("loadingRender"),
  import: () => t("loadingImport"),
  generic: () => t("loadingGeneric"),
};

export function LoadingScreen({
  kind,
  message,
}: {
  kind: LoadingKind;
  message?: string;
}) {
  return (
    <div
      class="app-feedback-modal"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="app-loading-title"
    >
      <div class="app-feedback-modal__card">
        <p class="app-feedback-modal__title" id="app-loading-title">
          {KIND_TITLE[kind]()}
        </p>
        <p class="app-feedback-modal__status">
          {message || t("loadingWorking")}
        </p>
        <div class="app-feedback-modal__bar" aria-hidden="true" />
      </div>
    </div>
  );
}
