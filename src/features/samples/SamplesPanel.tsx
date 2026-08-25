import { DEMO_LIBRARY } from "../../model/demos/library";
import { loadDemoSample, prefs } from "../../state/store";
import { t } from "../../i18n";

export function SamplesPanel() {
  void prefs.value.locale;
  return (
    <div class="samples-panel panel-pad">
      <p class="muted samples-panel__lead">{t("samplesLead")}</p>
      <ul class="samples-list">
        {DEMO_LIBRARY.map((demo) => (
          <li key={demo.id} class="sample-row">
            <div class="sample-row__body">
              <span class="sample-row__cat">{demo.category}</span>
              <span class="sample-row__title">{demo.title}</span>
              <span class="sample-row__blurb muted">{demo.blurb}</span>
            </div>
            <button
              type="button"
              class="btn btn--small btn--ghost"
              onClick={() => loadDemoSample(demo.id)}
            >
              {t("openSample")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
