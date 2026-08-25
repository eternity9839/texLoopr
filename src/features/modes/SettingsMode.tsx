import {
  prefs,
  updatePrefs,
  createProject,
  setOverlay,
} from "../../state/store";
import type { UiTheme } from "../../model/document";

const THEMES: { id: UiTheme; label: string; blurb: string }[] = [
  { id: "stone", label: "Stone", blurb: "Warm paper studio (default)" },
  { id: "nova", label: "Nova", blurb: "Modern zinc chrome, crisp cyan" },
  { id: "mist", label: "Mist", blurb: "Cool gray chrome, same teal" },
  { id: "dusk", label: "Dusk", blurb: "Dark chrome around a light page" },
];

export function SettingsMode() {
  const p = prefs.value;

  return (
    <div class="settings-panel">
      <h3 class="panel-subtitle">Appearance</h3>
      <div class="field">
        <label for="theme">Theme</label>
        <select
          id="theme"
          value={p.theme ?? "stone"}
          onChange={(e) =>
            updatePrefs({ theme: e.currentTarget.value as UiTheme })
          }
        >
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} — {t.blurb}
            </option>
          ))}
        </select>
      </div>
      <div class="field">
        <label for="density">Density</label>
        <select
          id="density"
          value={p.density}
          onChange={(e) =>
            updatePrefs({
              density: e.currentTarget.value as "comfortable" | "compact",
            })
          }
        >
          <option value="comfortable">Comfortable (labels on studio switch)</option>
          <option value="compact">Compact (icon-only chrome)</option>
        </select>
      </div>

      <h3 class="panel-subtitle">Canvas</h3>
      <div class="field">
        <label>
          <input
            type="checkbox"
            checked={p.showGrid}
            onChange={(e) => updatePrefs({ showGrid: e.currentTarget.checked })}
          />{" "}
          Show board grid
        </label>
      </div>
      <div class="field">
        <label>
          <input
            type="checkbox"
            checked={p.snap}
            onChange={(e) => updatePrefs({ snap: e.currentTarget.checked })}
          />{" "}
          Snap position while moving (8px)
        </label>
      </div>
      <div class="field">
        <label>
          <input
            type="checkbox"
            checked={p.showRulers !== false}
            onChange={(e) =>
              updatePrefs({ showRulers: e.currentTarget.checked })
            }
          />{" "}
          Show rulers
        </label>
      </div>

      <h3 class="panel-subtitle">Rails</h3>
      <p class="muted" style={{ fontSize: "0.75rem" }}>
        Collapse rails to icon strips, or drag their edges to resize.
      </p>
      <div class="field">
        <label>
          <input
            type="checkbox"
            checked={Boolean(p.navCollapsed)}
            onChange={(e) =>
              updatePrefs({ navCollapsed: e.currentTarget.checked })
            }
          />{" "}
          Collapse outline
        </label>
      </div>
      <div class="field">
        <label>
          <input
            type="checkbox"
            checked={Boolean(p.toolsCollapsed)}
            onChange={(e) =>
              updatePrefs({ toolsCollapsed: e.currentTarget.checked })
            }
          />{" "}
          Collapse floating toolbox
        </label>
      </div>
      <div class="field">
        <label>
          <input
            type="checkbox"
            checked={Boolean(p.inspectorCollapsed)}
            onChange={(e) =>
              updatePrefs({ inspectorCollapsed: e.currentTarget.checked })
            }
          />{" "}
          Collapse inspector
        </label>
      </div>
      <div class="field">
        <label for="tools-orient">Floating toolbox</label>
        <select
          id="tools-orient"
          value={p.toolsOrientation ?? "horizontal"}
          onChange={(e) =>
            updatePrefs({
              toolsOrientation: e.currentTarget.value as
                | "vertical"
                | "horizontal",
            })
          }
        >
          <option value="horizontal">Horizontal strip</option>
          <option value="vertical">Vertical strip</option>
        </select>
      </div>

      <h3 class="panel-subtitle">Keyboard</h3>
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
          <kbd>Delete</kbd> Remove selection · <kbd>Arrows</kbd> Nudge (Shift =
          10px)
        </li>
        <li>
          <kbd>Esc</kbd> Clear selection / close overlay
        </li>
      </ul>

      <h3 class="panel-subtitle">Workspace</h3>
      <p class="muted" style={{ fontSize: "0.75rem" }}>
        Draft autosaves locally. Use Save to write the catalog copy.
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
      </div>
    </div>
  );
}
