import {
  prefs,
  updatePrefs,
  createProject,
  setOverlay,
  hydrateFromCatalog,
  catalogReady,
  catalogBackend,
  catalogProjectId,
} from "../../state/store";
import type { UiTheme } from "../../model/document";
import { Section, SelectField } from "../../ui/controls";
const THEMES: { value: UiTheme; label: string }[] = [
  { value: "stone", label: "Stone — warm paper studio (default)" },
  { value: "nova", label: "Nova — modern zinc, crisp cyan" },
  { value: "mist", label: "Mist — cool gray chrome, same teal" },
  { value: "dusk", label: "Dusk — dark chrome around a light page" },
];

export function SettingsMode() {
  const p = prefs.value;
  const backend = catalogBackend.value;
  const ready = catalogReady.value;
  const linked = catalogProjectId.value;

  return (
    <div class="settings-panel">
      <Section title="Preferences">
        <SelectField
          id="settings-theme"
          label="Theme"
          value={p.theme ?? "stone"}
          options={THEMES}
          onChange={(v) => updatePrefs({ theme: v as UiTheme })}
        />
        <SelectField
          id="settings-density"
          label="Display size of options"
          value={p.density}
          options={[
            { value: "comfortable", label: "Comfortable — labels on studio switch" },
            { value: "compact", label: "Compact — icon-only chrome" },
          ]}
          onChange={(v) =>
            updatePrefs({ density: v as "comfortable" | "compact" })
          }
          hint="Canvas tools (grid, snapping) live in the editor toolbar."
        />
      </Section>

      <Section title="Connections">
        <div class="settings-conn">
          <div class="settings-conn__row">
            <span class="muted">Storage</span>
            <strong>
              {!ready
                ? "Not connected"
                : backend === "tauri"
                  ? "Desktop library (Tauri)"
                  : "Browser library"}
            </strong>
          </div>
          <div class="settings-conn__row">
            <span class="muted">Linked project</span>
            <strong>{linked ? `#${linked.slice(0, 8)}` : "—"}</strong>
          </div>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => void hydrateFromCatalog()}
          >
            {ready ? "Refresh connection" : "Connect library"}
          </button>
        </div>
      </Section>

      <Section title="Keyboard shortcuts">
        <ul class="settings-keys muted">
          <li>
            <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>.</kbd> Preview toggle
          </li>
          <li>
            <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd> / <kbd>Shift</kbd>+
            <kbd>Z</kbd> Undo / Redo
          </li>
          <li>
            <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>X</kbd>
            <kbd>C</kbd>
            <kbd>V</kbd>
            <kbd>D</kbd> Cut / Copy / Paste / Duplicate
          </li>
          <li>
            <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>G</kbd> Group ·{" "}
            <kbd>Shift</kbd>+<kbd>G</kbd> Ungroup
          </li>
          <li>
            <kbd>Delete</kbd> Remove selection · <kbd>Arrows</kbd> Nudge (
            <kbd>Shift</kbd> = 10px)
          </li>
          <li>
            <kbd>Esc</kbd> Clear selection / close overlay
          </li>
        </ul>
      </Section>

      <Section title="Workspace">
        <p class="muted settings-hint">
          Draft autosaves locally. Use Save in the header to write the catalog
          copy.
        </p>
        <div class="field-row">
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => {
              createProject();
              setOverlay(null);
            }}
          >
            New blank project
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => setOverlay("samples")}
          >
            Sample documents…
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => setOverlay("about")}
          >
            About texLoopr…
          </button>
        </div>
      </Section>
    </div>
  );
}
