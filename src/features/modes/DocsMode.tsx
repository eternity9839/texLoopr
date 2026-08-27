import { t } from "../../i18n";
import { prefs, showStartHub } from "../../state/store";

export function DocsMode() {
  void prefs.value.locale;
  return (
    <div class="start-hub start-hub--docs" data-theme={prefs.value.theme ?? "nova"}>
      <div class="start-hub__panel start-hub__panel--narrow">
        <p class="start-hub__brand">texLooper</p>
        <h1 class="start-hub__title">{t("docsTitle")}</h1>
        <p class="start-hub__lead">{t("docsComingSoon")}</p>
        <button type="button" class="btn btn--ghost" onClick={showStartHub}>
          {t("docsBack")}
        </button>
      </div>
    </div>
  );
}
