import { useEffect } from "preact/hooks";
import { t } from "../../i18n";
import { Icon } from "../../ui/icons";
import {
  catalogReady,
  continueOffer,
  continueProject,
  prefs,
  refreshContinueOffer,
  showDocs,
  startBlankFromHub,
  startTourFromHub,
} from "../../state/store";

export function StartHub() {
  void prefs.value.locale;
  const ready = catalogReady.value;
  const offer = continueOffer.value;
  const canContinue = Boolean(offer);

  useEffect(() => {
    void refreshContinueOffer();
  }, [ready]);

  return (
    <div class="start-hub" data-theme={prefs.value.theme ?? "nova"}>
      <div class="start-hub__panel">
        <p class="start-hub__brand">texLooper</p>
        <h1 class="start-hub__title">{t("startHubTitle")}</h1>
        <p class="start-hub__lead">{t("startHubLead")}</p>
        <div class="start-hub__actions" role="group" aria-label={t("startHubTitle")}>
          <button type="button" class="btn start-hub__action" onClick={startBlankFromHub}>
            <Icon name="file" size={18} />
            <span>
              <strong>{t("startHubNew")}</strong>
              <span class="start-hub__hint">{t("startHubNewHint")}</span>
            </span>
          </button>
          <button
            type="button"
            class="btn btn--ghost start-hub__action"
            disabled={!canContinue}
            title={canContinue ? undefined : t("startHubContinueDisabled")}
            onClick={() => void continueProject()}
          >
            <Icon name="folder" size={18} />
            <span>
              <strong>{t("startHubContinue")}</strong>
              <span class="start-hub__hint">
                {canContinue
                  ? t("startHubContinueHint", { name: offer!.title })
                  : t("startHubContinueDisabled")}
              </span>
            </span>
          </button>
          <button
            type="button"
            class="btn btn--ghost start-hub__action"
            onClick={startTourFromHub}
          >
            <Icon name="book" size={18} />
            <span>
              <strong>{t("startHubTour")}</strong>
              <span class="start-hub__hint">{t("startHubTourHint")}</span>
            </span>
          </button>
          <button
            type="button"
            class="btn btn--ghost start-hub__action"
            onClick={showDocs}
          >
            <Icon name="info" size={18} />
            <span>
              <strong>{t("startHubDocs")}</strong>
              <span class="start-hub__hint">{t("startHubDocsHint")}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
