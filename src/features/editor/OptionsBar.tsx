import type { ComponentChildren } from "preact";
import {
  CANVAS_PRESETS,
  CANVAS_PRESET_ORDER,
  type CanvasPresetId,
  type PageViewMode,
} from "../../model/document";
import { gridSpacing } from "../../model/canvasView";
import {
  activePage,
  activeTool,
  canvasViewScale,
  nudgeCanvasZoom,
  prefs,
  project,
  selectedBlock,
  setCanvasZoomFit,
  setCanvasZoomManual,
  updateBlock,
  updatePrefs,
  updatePage,
  updateProjectMeta,
} from "../../state/store";
import { t } from "../../i18n";
import { PlaceToolOptions } from "./PlaceToolOptions";
import {
  ZOOM_PRESETS,
  formatZoomPercent,
  type CanvasZoomMode,
} from "./canvasScale";

/** Photoshop-style contextual options strip above the canvas. */
export function OptionsBar() {
  const p = prefs.value;
  void p.locale;
  const block = selectedBlock.value;
  const page = activePage.value;
  const spacing = gridSpacing(p);
  const preset = (project.value.artboard ??
    p.canvasPreset ??
    "document") as CanvasPresetId;
  const viewMode = (p.pageViewMode ?? "single") as PageViewMode;
  const rotate = p.canvasRotate ?? 0;
  const pageCount = project.value.pages.length;
  const placing = Boolean(activeTool.value);
  const zoomMode = (p.canvasZoomMode ?? "fit") as CanvasZoomMode;
  const zoomPref = p.canvasZoom ?? 1;
  const displayScale = canvasViewScale.value || zoomPref;

  return (
    <div class="options-bar" role="toolbar" aria-label={t("documentOptions")}>
      <Group label={t("view")}>
        <select
          aria-label={t("pageArrangement")}
          value={viewMode}
          onChange={(e) =>
            updatePrefs({
              pageViewMode: e.currentTarget.value as PageViewMode,
            })
          }
        >
          <option value="single">{t("onePage")}</option>
          <option value="continuous">{t("continuous")}</option>
          <option value="spread">{t("twoUp")}</option>
        </select>
        <select
          aria-label={t("canvasPreset")}
          value={preset}
          onChange={(e) => {
            const next = e.currentTarget.value as CanvasPresetId;
            updatePrefs({ canvasPreset: next });
            updateProjectMeta({ artboard: next });
          }}
        >
          {(["Print", "Devices", "Social"] as const).map((group) => (
            <optgroup key={group} label={group}>
              {CANVAS_PRESET_ORDER.filter(
                (id) => CANVAS_PRESETS[id].group === group,
              ).map((id) => (
                <option value={id} key={id}>
                  {CANVAS_PRESETS[id].label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          aria-label={t("boardRotation")}
          value={String(rotate)}
          onChange={(e) =>
            updatePrefs({
              canvasRotate: Number(e.currentTarget.value) as 0 | 90 | 180 | 270,
            })
          }
        >
          <option value="0">0°</option>
          <option value="90">90°</option>
          <option value="180">180°</option>
          <option value="270">270°</option>
        </select>
      </Group>

      <Group label={t("zoom")}>
        <button
          type="button"
          class={
            zoomMode === "fit"
              ? "options-bar__chip options-bar__chip--on"
              : "options-bar__chip"
          }
          aria-pressed={zoomMode === "fit"}
          title={t("zoomFit")}
          onClick={() => setCanvasZoomFit()}
        >
          {t("zoomFit")}
        </button>
        <button
          type="button"
          class="options-bar__chip"
          title={t("zoomOut")}
          aria-label={t("zoomOut")}
          onClick={() => nudgeCanvasZoom(-1, displayScale)}
        >
          −
        </button>
        <select
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
          class="options-bar__chip"
          title={t("zoomIn")}
          aria-label={t("zoomIn")}
          onClick={() => nudgeCanvasZoom(1, displayScale)}
        >
          +
        </button>
        {zoomMode === "manual" && (
          <span class="options-bar__meta">{formatZoomPercent(zoomPref)}</span>
        )}
      </Group>

      <Group label={t("grid")}>
        <label class="options-bar__num" title={t("gridX")}>
          X
          <input
            type="number"
            min={4}
            max={64}
            value={spacing.x}
            onChange={(e) =>
              updatePrefs({
                gridSizeX: Math.max(4, Number(e.currentTarget.value) || 16),
                gridSize: Math.max(4, Number(e.currentTarget.value) || 16),
              })
            }
          />
        </label>
        <label class="options-bar__num" title={t("gridY")}>
          Y
          <input
            type="number"
            min={4}
            max={64}
            value={spacing.y}
            onChange={(e) =>
              updatePrefs({
                gridSizeY: Math.max(4, Number(e.currentTarget.value) || 16),
              })
            }
          />
        </label>
        <input
          type="color"
          aria-label={t("gridColor")}
          title={t("gridColor")}
          value={p.gridColor ?? "#c8c2b6"}
          onInput={(e) => updatePrefs({ gridColor: e.currentTarget.value })}
        />
        <button
          type="button"
          class={
            p.showGrid
              ? "options-bar__chip options-bar__chip--on"
              : "options-bar__chip"
          }
          aria-pressed={p.showGrid}
          onClick={() => updatePrefs({ showGrid: !p.showGrid })}
        >
          {t("grid")}
        </button>
        <button
          type="button"
          class={
            p.snap
              ? "options-bar__chip options-bar__chip--on"
              : "options-bar__chip"
          }
          aria-pressed={p.snap}
          onClick={() => updatePrefs({ snap: !p.snap })}
        >
          {t("snap")}
        </button>
      </Group>

      {placing ? (
        <PlaceToolOptions />
      ) : (
        <>
          {page && !block && (
            <Group label={t("surface")}>
              <input
                type="color"
                aria-label={t("pageBackground")}
                title={t("pageBackground")}
                value={page.background ?? "#ffffff"}
                onInput={(e) =>
                  updatePage(page.id, { background: e.currentTarget.value })
                }
              />
              <button
                type="button"
                class="options-bar__chip"
                onClick={() =>
                  updatePage(page.id, {
                    watermark: {
                      ...(page.watermark ?? {}),
                      text: page.watermark?.text || "CONFIDENTIAL",
                      opacity: page.watermark?.opacity ?? 0.12,
                      angle: page.watermark?.angle ?? -30,
                      layout: page.watermark?.layout ?? "centered",
                    },
                  })
                }
              >
                {t("watermark")}
              </button>
              <span class="options-bar__meta muted">
                {pageCount}{" "}
                {pageCount === 1 ? t("pageSingular") : t("pagePlural")}
              </span>
            </Group>
          )}

          {block && (
            <Group label={t("selection")}>
              <span class="options-bar__meta">
                {block.name} · {Math.round(block.w)}×{Math.round(block.h)}
              </span>
              <label class="options-bar__num" title={t("opacity")}>
                Op
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={block.style.opacity ?? 1}
                  onChange={(e) =>
                    updateBlock(block.id, {
                      style: {
                        opacity: Math.min(
                          1,
                          Math.max(0, Number(e.currentTarget.value) || 1),
                        ),
                      },
                    })
                  }
                />
              </label>
            </Group>
          )}
        </>
      )}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: ComponentChildren;
}) {
  return (
    <div class="options-bar__group" role="group" aria-label={label}>
      <span class="options-bar__label">{label}</span>
      {children}
    </div>
  );
}
