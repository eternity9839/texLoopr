import { useState } from "preact/hooks";
import { Icon } from "../../ui/icons";
import { gridSpacing } from "../../model/canvasView";
import {
  canvasViewScale,
  nudgeCanvasZoom,
  prefs,
  selectedBlock,
  setCanvasZoomFit,
  setCanvasZoomManual,
  updatePrefs,
} from "../../state/store";
import { t } from "../../i18n";
import { IssuesStatusControl } from "./IssuesStatusControl";
import {
  ZOOM_PRESETS,
  formatZoomPercent,
  type CanvasZoomMode,
} from "./canvasScale";

/** Thin bottom strip — view prefs + selection summary (not property forms). */
export function StatusBar() {
  const p = prefs.value;
  void p.locale;
  const block = selectedBlock.value;
  const [gridMenu, setGridMenu] = useState(false);
  const spacing = gridSpacing(p);
  const zoomMode = (p.canvasZoomMode ?? "fit") as CanvasZoomMode;
  const zoomPref = p.canvasZoom ?? 1;
  const displayScale = canvasViewScale.value || zoomPref;

  return (
    <div class="status-bar" role="status" aria-label={t("status")}>
      <div class="status-bar__group">
        <IssuesStatusControl />
        <button
          type="button"
          class={
            p.showGrid ? "status-bar__btn status-bar__btn--on" : "status-bar__btn"
          }
          title={t("toggleGrid")}
          aria-label={t("toggleGrid")}
          aria-pressed={p.showGrid}
          onClick={() => updatePrefs({ showGrid: !p.showGrid })}
        >
          <Icon name="grid" size={12} />
        </button>
        <button
          type="button"
          class={
            p.snap ? "status-bar__btn status-bar__btn--on" : "status-bar__btn"
          }
          title={t("toggleSnap")}
          aria-label={t("toggleSnap")}
          aria-pressed={p.snap}
          onClick={() => updatePrefs({ snap: !p.snap })}
        >
          <Icon name="crosshair" size={12} />
        </button>
        <button
          type="button"
          class={
            p.gridLock
              ? "status-bar__btn status-bar__btn--on"
              : "status-bar__btn"
          }
          title={t("lockToGrid")}
          aria-label={t("lockToGrid")}
          aria-pressed={p.gridLock === true}
          onClick={() => updatePrefs({ gridLock: p.gridLock !== true })}
        >
          <Icon name="magnet" size={12} />
        </button>
        <button
          type="button"
          class={
            p.showRulers !== false
              ? "status-bar__btn status-bar__btn--on"
              : "status-bar__btn"
          }
          title={t("toggleRulers")}
          aria-label={t("toggleRulers")}
          aria-pressed={p.showRulers !== false}
          onClick={() =>
            updatePrefs({ showRulers: prefs.value.showRulers === false })
          }
        >
          <Icon name="ruler" size={12} />
        </button>
        <span class="status-bar__pop-anchor">
          <button
            type="button"
            class={
              gridMenu
                ? "status-bar__btn status-bar__btn--on"
                : "status-bar__btn"
            }
            title={t("gridSettings")}
            aria-label={t("gridSettings")}
            aria-expanded={gridMenu}
            onClick={() => setGridMenu((v) => !v)}
          >
            <Icon name="settings" size={12} />
          </button>
          {gridMenu && (
            <div class="status-bar__pop" role="menu">
              <label class="status-bar__row">
                <span>X</span>
                <input
                  type="number"
                  min={4}
                  max={64}
                  step={2}
                  value={spacing.x}
                  onChange={(e) =>
                    updatePrefs({
                      gridSizeX: Math.max(
                        4,
                        Math.min(64, Number(e.currentTarget.value) || 16),
                      ),
                      gridSize: Math.max(
                        4,
                        Math.min(64, Number(e.currentTarget.value) || 16),
                      ),
                    })
                  }
                />
              </label>
              <label class="status-bar__row">
                <span>Y</span>
                <input
                  type="number"
                  min={4}
                  max={64}
                  step={2}
                  value={spacing.y}
                  onChange={(e) =>
                    updatePrefs({
                      gridSizeY: Math.max(
                        4,
                        Math.min(64, Number(e.currentTarget.value) || 16),
                      ),
                    })
                  }
                />
              </label>
              <label class="status-bar__row">
                <span>{t("color")}</span>
                <input
                  type="color"
                  value={p.gridColor ?? "#c8c2b6"}
                  onInput={(e) =>
                    updatePrefs({ gridColor: e.currentTarget.value })
                  }
                />
              </label>
              <label class="status-bar__row">
                <span>{t("style")}</span>
                <select
                  value={p.gridStyle ?? "lines"}
                  onChange={(e) =>
                    updatePrefs({
                      gridStyle:
                        e.currentTarget.value === "dots" ? "dots" : "lines",
                    })
                  }
                >
                  <option value="lines">{t("lines")}</option>
                  <option value="dots">{t("dots")}</option>
                </select>
              </label>
              <label class="status-bar__row status-bar__row--check">
                <input
                  type="checkbox"
                  checked={p.showMarginGuides !== false}
                  onChange={(e) =>
                    updatePrefs({
                      showMarginGuides: e.currentTarget.checked,
                    })
                  }
                />
                <span>{t("margins")}</span>
              </label>
            </div>
          )}
        </span>
      </div>

      <div class="status-bar__group status-bar__zoom">
        <button
          type="button"
          class="status-bar__btn"
          title={t("zoomOut")}
          aria-label={t("zoomOut")}
          onClick={() => nudgeCanvasZoom(-1, displayScale)}
        >
          −
        </button>
        <select
          class="status-bar__zoom-select"
          aria-label={t("zoom")}
          value={
            zoomMode === "fit"
              ? "fit"
              : String(
                  ZOOM_PRESETS.find((z) => Math.abs(z - zoomPref) < 0.01) ??
                    zoomPref,
                )
          }
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v === "fit") setCanvasZoomFit();
            else setCanvasZoomManual(Number(v));
          }}
        >
          <option value="fit">{t("zoomFit")}</option>
          {ZOOM_PRESETS.map((z) => (
            <option value={String(z)} key={z}>
              {formatZoomPercent(z)}
            </option>
          ))}
        </select>
        <button
          type="button"
          class="status-bar__btn"
          title={t("zoomIn")}
          aria-label={t("zoomIn")}
          onClick={() => nudgeCanvasZoom(1, displayScale)}
        >
          +
        </button>
      </div>

      <div class="status-bar__meta">
        {block ? (
          <span title={block.name}>
            {block.name} · {Math.round(block.w)}×{Math.round(block.h)} · (
            {Math.round(block.x)}, {Math.round(block.y)})
          </span>
        ) : (
          <span class="muted">{t("noSelection")}</span>
        )}
      </div>
    </div>
  );
}
