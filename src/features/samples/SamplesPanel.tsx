import { DEMO_LIBRARY } from "../../model/demos/library";
import { loadDemoSample } from "../../state/store";

export function SamplesPanel() {
  return (
    <div class="samples-panel panel-pad">
      <p class="muted" style={{ marginTop: 0 }}>
        Conventional templates with merge fields, tables, and images. Opening a
        sample replaces the active draft and loads matching Data rows.
      </p>
      <div class="samples-grid">
        {DEMO_LIBRARY.map((demo) => (
          <article key={demo.id} class="sample-card">
            <p class="sample-card__cat">{demo.category}</p>
            <h3 class="sample-card__title">{demo.title}</h3>
            <p class="sample-card__blurb">{demo.blurb}</p>
            <button
              type="button"
              class="btn btn--small"
              onClick={() => loadDemoSample(demo.id)}
            >
              Open sample
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
