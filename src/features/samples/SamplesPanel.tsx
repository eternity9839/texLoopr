import {
  DEMO_LIBRARY,
  DEMO_BUCKET_LABEL,
  DEMO_BUCKET_ORDER,
  type DemoBucket,
  type DemoEntry,
} from "../../model/demos/library";
import { loadDemoSample, prefs } from "../../state/store";
import { t } from "../../i18n";

function demosByBucket(): { bucket: DemoBucket; label: string; demos: DemoEntry[] }[] {
  return DEMO_BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: DEMO_BUCKET_LABEL[bucket],
    demos: DEMO_LIBRARY.filter((d) => d.bucket === bucket),
  })).filter((g) => g.demos.length > 0);
}

export function SamplesPanel() {
  void prefs.value.locale;
  const groups = demosByBucket();
  return (
    <div class="samples-panel panel-pad">
      <p class="muted samples-panel__lead">{t("samplesLead")}</p>
      {groups.map((group) => (
        <section key={group.bucket} class="samples-section">
          <h3 class="samples-section__title">{group.label}</h3>
          <ul class="samples-list">
            {group.demos.map((demo) => (
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
        </section>
      ))}
    </div>
  );
}
