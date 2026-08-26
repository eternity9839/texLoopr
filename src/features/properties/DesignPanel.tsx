import {
  selectedBlock,
  selectedBlocks,
  selection,
  activePage,
  updateBlock,
  updatePage,
  updatePrefs,
  prefs,
  dataRows,
  project,
  addNamedDataset,
  setStudioView,
  updateProject,
  nudgeZOrder,
  updatePageChromeBand,
  clearPageChromeBand,
  promoteSelectionToChrome,
} from "../../state/store";
import {
  LIST_STYLES,
  SHAPE_VARIANTS,
  normalizeMargins,
  type BlockStyle,
  type ListStyle,
  type PageMargins,
  type ShapeVariant,
} from "../../model/document";
import { ensurePageChrome } from "../../model/pageChrome";
import { MIN_BLOCK_H, MIN_BLOCK_W, px } from "../../model/geometry";
import { effectiveZ, stackIndexAmongSiblings } from "../../model/layerStack";
import { dataColumnNames } from "../../model/bindings";
import { resizeTableCells } from "../../model/placeTools";
import { fieldKeyFromHeader, isLiteralColumnTemplate, toLiteralColumnTemplate, fromLiteralColumnTemplate } from "../../model/tableData";
import {
  TABLE_HEADER_STYLES,
  applyTableHeaderStyle,
  type TableHeaderStyleId,
} from "../../model/tableHeaderStyles";
import { t } from "../../i18n";
import {
  CheckRow,
  ColorField,
  Field,
  Grid2,
  NumField,
  Section,
  SegmentedControl,
  SelectField,
} from "../../ui/controls";
import {
  ClearFormatButton,
  FontFamilySelect,
  SizeStepper,
  BIUToggle,
  AlignPicker,
  LineHeightSelect,
  TransformSelect,
  type AppearanceCtx,
} from "./appearance";
import { BlockAssociations } from "./BlockAssociations";
import {
  DocumentStyleLibrary,
  TextStyleLibrary,
} from "./StyleLibraryControls";
import { LANGUAGE_CONDITION_PRESETS } from "../../model/documentLanguage";
import {
  conditionHasClause,
  toggleConditionClause,
} from "../../model/conditionCompose";
import { OUTPUT_KINDS, OUTPUT_KIND_LABEL } from "../../model/workflow";

const TYPE_LABELS: Record<string, string> = {
  paragraph: "Paragraph",
  text: "Text",
  data: "Data field",
  link: "Link",
  list: "List",
  picture: "Picture",
  shape: "Shape",
  table: "Table",
  files: "Files",
  prebuild: "Prebuild",
  group: "Group",
  repeat: "Repeat",
};

const TEXTISH = new Set(["paragraph", "text", "list"]);

function applyStyle(patch: Partial<BlockStyle>, ids: string[]): void {
  for (const id of ids) updateBlock(id, { style: patch });
}

/* ------------------------------ component ------------------------------ */

export function ComponentProps() {
  const sel = selectedBlock.value;
  if (!sel) return null;
  const ids = selectedBlocks.value.map((b) => b.id);
  const style = sel.style;
  const clamp0 = (v: number) => Math.max(0, v);
  const typoCtx: AppearanceCtx = {
    block: sel,
    setStyle: (patch) => {
      // Multi-select: apply typography patches to every selected block
      applyStyle(patch, ids);
    },
  };
  const isContainer = sel.type === "group" || sel.type === "repeat";
  const showTypo = TEXTISH.has(sel.type) || isContainer;
  const rowDir = (style.direction ?? "column") === "row";
  const page = activePage.value;
  const stack =
    page != null ? stackIndexAmongSiblings(page.blocks, sel.id) : null;

  return (
    <>
      <BlockAssociations compact />
      <Section title="Identity">
        <Field label="Name" forId="design-block-name" compact>
          <input
            id="design-block-name"
            value={sel.name}
            onInput={(e) =>
              updateBlock(sel.id, { name: e.currentTarget.value })
            }
          />
        </Field>
      </Section>

      <Section title="Stack">
        <div class="prop-grid prop-grid--2">
          <NumField
            id="design-z-index"
            label="Z-index"
            compact
            value={sel.zIndex ?? effectiveZ(sel)}
            min={0}
            onValue={(v) => updateBlock(sel.id, { zIndex: Math.max(0, px(v)) })}
          />
          {stack && (
            <Field label="Order" forId="design-stack-pos" compact>
              <span id="design-stack-pos" class="muted">
                {stack.index} of {stack.total}
              </span>
            </Field>
          )}
        </div>
        <div class="prop-row prop-row--actions" style={{ marginTop: "0.35rem" }}>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => nudgeZOrder("front")}
          >
            Front
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => nudgeZOrder("forward")}
          >
            Forward
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => nudgeZOrder("backward")}
          >
            Backward
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => nudgeZOrder("back")}
          >
            Back
          </button>
        </div>
      </Section>

      <Section title="Geometry">
        <div class="prop-grid prop-grid--2">
          {(
            [
              ["x", sel.x],
              ["y", sel.y],
              ["w", sel.w],
              ["h", sel.h],
            ] as const
          ).map(([key, val]) => (
            <NumField
              key={key}
              id={`geo-${key}`}
              label={key.toUpperCase()}
              compact
              value={Math.round(val)}
              min={key === "w" ? MIN_BLOCK_W : key === "h" ? MIN_BLOCK_H : 0}
              onValue={(v) => {
                const next =
                  key === "w"
                    ? Math.max(MIN_BLOCK_W, px(v))
                    : key === "h"
                      ? Math.max(MIN_BLOCK_H, px(v))
                      : Math.max(0, px(v));
                updateBlock(sel.id, { [key]: next });
              }}
            />
          ))}
          <NumField
            id="geo-rotate"
            label="Rotate °"
            compact
            value={style.rotate ?? 0}
            min={-180}
            max={180}
            step={1}
            onValue={(v) =>
              applyStyle(
                { rotate: Math.abs(v) < 0.01 ? undefined : v },
                ids,
              )
            }
          />
        </div>
        <div class="prop-grid prop-grid--2" style={{ marginTop: "0.35rem" }}>
          <CheckRow
            checked={Boolean(style.mirrorX)}
            onChange={(v) =>
              applyStyle({ mirrorX: v || undefined }, ids)
            }
          >
            Mirror H
          </CheckRow>
          <CheckRow
            checked={Boolean(style.mirrorY)}
            onChange={(v) =>
              applyStyle({ mirrorY: v || undefined }, ids)
            }
          >
            Mirror V
          </CheckRow>
        </div>
      </Section>

      <Section title="Pin to surface">
        <p class="muted prop-hint">
          Glue edges for one-off rails. For repeating letterhead/footer use{" "}
          <strong>Page chrome</strong> below (or promote selection).
        </p>
        <div class="pin-presets">
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => {
              for (const id of ids) {
                updateBlock(id, {
                  pin: { top: true, left: true, right: true },
                });
              }
            }}
          >
            Pin top
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => {
              for (const id of ids) {
                updateBlock(id, {
                  pin: { bottom: true, left: true, right: true },
                });
              }
            }}
          >
            Pin bottom
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => {
              for (const id of ids) {
                updateBlock(id, {
                  pin: { left: true, top: true, bottom: true },
                });
              }
            }}
          >
            Left rail
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => {
              for (const id of ids) {
                updateBlock(id, {
                  pin: { right: true, top: true, bottom: true },
                });
              }
            }}
          >
            Right rail
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => {
              for (const id of ids) updateBlock(id, { pin: null });
            }}
          >
            Clear
          </button>
        </div>
        <div class="prop-grid prop-grid--2" style={{ marginTop: "0.35rem" }}>
          {(
            [
              ["top", "Top"],
              ["bottom", "Bottom"],
              ["left", "Left"],
              ["right", "Right"],
            ] as const
          ).map(([edge, label]) => {
            const on = Boolean(sel.pin?.[edge]);
            return (
              <CheckRow
                key={edge}
                checked={on}
                onChange={(v) => {
                  for (const id of ids) {
                    const cur = selectedBlocks.value.find((b) => b.id === id);
                    const next = { ...(cur?.pin ?? {}), [edge]: v || undefined };
                    const active =
                      next.top || next.bottom || next.left || next.right;
                    updateBlock(id, { pin: active ? next : null });
                  }
                }}
              >
                {label}
              </CheckRow>
            );
          })}
        </div>
      </Section>

      {showTypo && (
        <Section title="Typography">
          <TextStyleLibrary />
          <div class="design-typo">
            <FontFamilySelect ctx={typoCtx} />
            <SizeStepper ctx={typoCtx} />
            <BIUToggle ctx={typoCtx} />
            <AlignPicker ctx={typoCtx} />
            <ClearFormatButton ctx={typoCtx} />
          </div>
          <div class="prop-grid prop-grid--2">
            <NumField
              id="prop-indent"
              label="Indent"
              compact
              value={style.textIndent ?? 0}
              min={0}
              max={200}
              onValue={(v) => applyStyle({ textIndent: clamp0(v) }, ids)}
            />
            <NumField
              id="prop-tracking"
              label="Tracking"
              compact
              value={style.letterSpacing ?? 0}
              min={-4}
              max={40}
              step={0.5}
              onValue={(v) => applyStyle({ letterSpacing: v }, ids)}
            />
            <Field label="Leading" compact>
              <LineHeightSelect ctx={typoCtx} />
            </Field>
            <Field label="Case" compact>
              <TransformSelect ctx={typoCtx} />
            </Field>
            <SelectField
              id="prop-whitespace"
              label="Line returns"
              value={String(style.whiteSpace ?? "pre-wrap")}
              options={[
                { value: "pre-wrap", label: "Keep returns + wrap" },
                { value: "normal", label: "Collapse returns" },
                { value: "nowrap", label: "Single line" },
                { value: "pre", label: "Keep returns, no wrap" },
              ]}
              onChange={(v) =>
                applyStyle(
                  {
                    whiteSpace: v as
                      | "pre-wrap"
                      | "normal"
                      | "nowrap"
                      | "pre",
                  },
                  ids,
                )
              }
            />
          </div>
        </Section>
      )}

      <Section title="Fill">
        <div class="prop-grid prop-grid--2">
          <ColorField
            id="prop-color"
            label="Color"
            compact
            value={style.color}
            fallback="#2a2622"
            onValue={(v) => applyStyle({ color: v }, ids)}
          />
          <ColorField
            id="prop-bg"
            label="Background"
            compact
            value={style.background ?? "#ffffff"}
            fallback="#ffffff"
            onValue={(v) => applyStyle({ background: v }, ids)}
          />
        </div>
      </Section>

      <Section title="Stroke">
        <div class="prop-grid prop-grid--2">
          <NumField
            id="prop-border"
            label="Width"
            compact
            value={style.borderWidth ?? 0}
            min={0}
            max={40}
            onValue={(v) => applyStyle({ borderWidth: clamp0(v) }, ids)}
          />
          <ColorField
            id="prop-border-color"
            label="Color"
            compact
            value={style.borderColor ?? "#000000"}
            fallback="#000000"
            onValue={(v) => applyStyle({ borderColor: v }, ids)}
          />
          <NumField
            id="prop-radius"
            label="Radius"
            compact
            value={style.borderRadius ?? 0}
            min={0}
            max={999}
            onValue={(v) => applyStyle({ borderRadius: clamp0(v) }, ids)}
          />
        </div>
        <p class="muted small">
          On a square, raise Radius toward half the side (or pick Circle) to get
          a full circle.
        </p>
        <CheckRow
          checked={Boolean(style.shadow)}
          onChange={(v) => applyStyle({ shadow: v || undefined }, ids)}
        >
          Drop shadow
        </CheckRow>
      </Section>

      {sel.type === "shape" && (
        <Section title="Shape">
          <SelectField
            id="prop-shape-form"
            label="Form"
            compact
            value={String(
              (sel.content.variant as string) ??
                (sel.content.shape as string) ??
                "rect",
            )}
            options={SHAPE_VARIANTS.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
            onChange={(v) => {
              const form = v as ShapeVariant;
              const patch: {
                content: Record<string, unknown>;
                style?: BlockStyle;
                w?: number;
                h?: number;
              } = {
                content: { variant: form, shape: form },
              };
              if (form === "circle") {
                const side = Math.round(Math.min(sel.w, sel.h));
                patch.w = side;
                patch.h = side;
                patch.style = { borderRadius: Math.ceil(side / 2) };
              } else if (form === "rounded" && !(sel.style.borderRadius ?? 0)) {
                patch.style = { borderRadius: 16 };
              } else if (form === "rect") {
                // keep radius — user may still round toward a circle
              }
              updateBlock(sel.id, patch);
            }}
          />
          <CheckRow
            checked={Boolean(sel.content.filled)}
            onChange={(v) => {
              updateBlock(sel.id, {
                content: { filled: v },
                style: {
                  background: v
                    ? sel.style.background &&
                      sel.style.background !== "transparent"
                      ? sel.style.background
                      : "#e3ddd3"
                    : "transparent",
                  borderWidth: v
                    ? (sel.style.borderWidth ?? 0)
                    : Math.max(1, sel.style.borderWidth ?? 1.5),
                },
              });
            }}
          >
            Fill shape
          </CheckRow>
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={() => {
              const side = Math.round(Math.min(sel.w, sel.h));
              updateBlock(sel.id, {
                w: side,
                h: side,
                content: { variant: "circle", shape: "circle" },
                style: { borderRadius: Math.ceil(side / 2) },
              });
            }}
          >
            Make circle
          </button>
        </Section>
      )}

      <Section title="Spacing">
        <div class="prop-grid prop-grid--2">
          <NumField
            id="prop-padding"
            label="Padding"
            compact
            value={style.padding ?? 0}
            min={0}
            max={200}
            onValue={(v) => applyStyle({ padding: clamp0(v) }, ids)}
          />
          <NumField
            id="prop-margin"
            label="Margin"
            compact
            value={style.margin ?? 0}
            min={0}
            max={200}
            onValue={(v) => applyStyle({ margin: clamp0(v) }, ids)}
          />
          <NumField
            id="prop-opacity"
            label="Opacity"
            compact
            value={style.opacity ?? 1}
            min={0}
            max={1}
            step={0.05}
            onValue={(v) =>
              applyStyle({ opacity: Math.min(1, Math.max(0, v)) }, ids)
            }
          />
          {(TEXTISH.has(sel.type) ||
            sel.type === "shape" ||
            sel.type === "picture") && (
            <SelectField
              id="prop-valign"
              label="V-align"
              compact
              value={style.verticalAlign ?? "top"}
              options={[
                { value: "top", label: "Top" },
                { value: "middle", label: "Middle" },
                { value: "bottom", label: "Bottom" },
              ]}
              onChange={(v) =>
                applyStyle(
                  {
                    verticalAlign: v as BlockStyle["verticalAlign"],
                  },
                  ids,
                )
              }
            />
          )}
        </div>
      </Section>

      {isContainer && (
        <Section title="Layout">
          <Field label="Mode" compact>
            <SegmentedControl
              ariaLabel="Child layout"
              value={style.layout === "flex" ? "flex" : "absolute"}
              options={[
                { value: "absolute", label: "Absolute" },
                { value: "flex", label: "Flex" },
              ]}
              onChange={(v) =>
                applyStyle(
                  { layout: v === "flex" ? "flex" : undefined },
                  ids,
                )
              }
            />
          </Field>
          {style.layout === "flex" && (
            <>
              <Field label="Direction" compact>
                <SegmentedControl
                  ariaLabel="Flex direction"
                  value={style.direction ?? "column"}
                  options={[
                    { value: "column", label: "Column" },
                    { value: "row", label: "Row" },
                  ]}
                  onChange={(v) =>
                    applyStyle(
                      { direction: v as BlockStyle["direction"] },
                      ids,
                    )
                  }
                />
              </Field>
              <Field label="Align items" compact>
                <SegmentedControl
                  ariaLabel="Flex cross-axis alignment"
                  value={style.alignItems ?? "stretch"}
                  options={[
                    { value: "stretch", label: "Fill" },
                    {
                      value: "start",
                      label: rowDir ? "Start" : "Top",
                    },
                    { value: "center", label: "Mid" },
                    {
                      value: "end",
                      label: rowDir ? "End" : "Bot",
                    },
                  ]}
                  onChange={(v) =>
                    applyStyle(
                      { alignItems: v as BlockStyle["alignItems"] },
                      ids,
                    )
                  }
                />
              </Field>
              <Field label="Distribute" compact>
                <SegmentedControl
                  ariaLabel="Flex main-axis distribution"
                  value={style.justify ?? "start"}
                  options={[
                    { value: "start", label: "Start" },
                    { value: "center", label: "Center" },
                    { value: "end", label: "End" },
                    { value: "space-between", label: "Space" },
                  ]}
                  onChange={(v) =>
                    applyStyle({ justify: v as BlockStyle["justify"] }, ids)
                  }
                />
              </Field>
              <NumField
                id="flex-gap"
                label="Gap"
                compact
                value={style.gap ?? 0}
                min={0}
                max={120}
                onValue={(v) => applyStyle({ gap: clamp0(v) }, ids)}
              />
            </>
          )}
        </Section>
      )}

      {sel.type === "list" && (
        <Section title="List">
          <SelectField
            id="prop-list-style"
            label="Marker"
            value={style.listStyle ?? "disc"}
            options={[...LIST_STYLES].map((s) => ({
              value: s.value as ListStyle as string,
              label: s.label,
            }))}
            onChange={(v) =>
              updateBlock(sel.id, { style: { listStyle: v as ListStyle } })
            }
          />
        </Section>
      )}

      {sel.type === "table" && (
        <Section title="Table">
          <Grid2>
            <NumField
              id="table-rows"
              label="Rows"
              compact
              value={Number(
                sel.content.rows ??
                  ((sel.content.cells as string[][]) ?? []).length ??
                  3,
              )}
              min={1}
              max={32}
              onValue={(v) => {
                const rows = Math.round(v);
                const cols = Number(
                  sel.content.cols ??
                    ((sel.content.cells as string[][]) ?? [])[0]?.length ??
                    3,
                );
                updateBlock(sel.id, {
                  content: {
                    rows,
                    cols,
                    cells: resizeTableCells(
                      (sel.content.cells as string[][]) ?? [],
                      rows,
                      cols,
                    ),
                  },
                });
              }}
            />
            <NumField
              id="table-cols"
              label="Columns"
              compact
              value={Number(
                sel.content.cols ??
                  ((sel.content.cells as string[][]) ?? [])[0]?.length ??
                  3,
              )}
              min={1}
              max={16}
              onValue={(v) => {
                const cols = Math.round(v);
                const rows = Number(
                  sel.content.rows ??
                    ((sel.content.cells as string[][]) ?? []).length ??
                    3,
                );
                updateBlock(sel.id, {
                  content: {
                    rows,
                    cols,
                    cells: resizeTableCells(
                      (sel.content.cells as string[][]) ?? [],
                      rows,
                      cols,
                    ),
                  },
                });
              }}
            />
          </Grid2>
          <CheckRow
            checked={sel.content.header === true}
            onChange={(v) => updateBlock(sel.id, { content: { header: v } })}
          >
            Header row
          </CheckRow>
          <SelectField
            id="table-height-mode"
            label="Row height"
            value={String(sel.content.heightMode ?? "fixed")}
            options={[
              { value: "fixed", label: "Fixed (stretch in frame)" },
              { value: "auto", label: "Auto (fit content)" },
            ]}
            onChange={(v) => {
              updateBlock(sel.id, { content: { heightMode: v } });
              if (v === "auto") {
                // Nudge measure on next paint via tiny height bump trigger
                updateBlock(sel.id, { h: sel.h });
              }
            }}
          />
          <Grid2>
            <NumField
              id="table-row-min"
              label="Min row"
              compact
              value={Number(sel.content.rowMinHeight ?? 28)}
              min={16}
              max={200}
              onValue={(v) =>
                updateBlock(sel.id, {
                  content: { rowMinHeight: Math.round(v) },
                })
              }
            />
            <NumField
              id="table-row-max"
              label="Max row (0=∞)"
              compact
              value={Number(sel.content.rowMaxHeight ?? 0)}
              min={0}
              max={800}
              onValue={(v) =>
                updateBlock(sel.id, {
                  content: { rowMaxHeight: Math.round(v) },
                })
              }
            />
          </Grid2>
          <CheckRow
            checked={Boolean(sel.content.zebra)}
            onChange={(v) => updateBlock(sel.id, { content: { zebra: v } })}
          >
            Zebra stripes
          </CheckRow>
          <CheckRow
            checked={sel.content.showBorders !== false}
            onChange={(v) =>
              updateBlock(sel.id, { content: { showBorders: v } })
            }
          >
            Show borders
          </CheckRow>
          {sel.content.showBorders !== false && (
            <Grid2>
              <CheckRow
                checked={sel.content.borderHorizontal !== false}
                onChange={(v) =>
                  updateBlock(sel.id, { content: { borderHorizontal: v } })
                }
              >
                Horizontal lines
              </CheckRow>
              <CheckRow
                checked={sel.content.borderVertical !== false}
                onChange={(v) =>
                  updateBlock(sel.id, { content: { borderVertical: v } })
                }
              >
                Vertical lines
              </CheckRow>
            </Grid2>
          )}
          <Grid2>
            <NumField
              id="table-cell-pad"
              label="Cell pad"
              compact
              value={Number(sel.content.cellPadding ?? 6)}
              min={0}
              max={48}
              onValue={(v) =>
                updateBlock(sel.id, {
                  content: { cellPadding: Math.round(v) },
                })
              }
            />
            <ColorField
              id="table-border"
              label="Border"
              value={String(sel.content.borderColor ?? "#cfc8bc")}
              fallback="#cfc8bc"
              onValue={(v) =>
                updateBlock(sel.id, { content: { borderColor: v } })
              }
            />
          </Grid2>
          <Grid2>
            <NumField
              id="table-row-gap"
              label="Row gap"
              compact
              value={Number(sel.content.rowGap ?? 0)}
              min={0}
              max={48}
              onValue={(v) =>
                updateBlock(sel.id, { content: { rowGap: Math.round(v) } })
              }
            />
            <NumField
              id="table-col-gap"
              label="Col gap"
              compact
              value={Number(sel.content.colGap ?? 0)}
              min={0}
              max={48}
              onValue={(v) =>
                updateBlock(sel.id, { content: { colGap: Math.round(v) } })
              }
            />
          </Grid2>
          <SelectField
            id="table-header-style"
            label="Header style"
            value={String(sel.content.headerStyle ?? "default")}
            options={[
              ...TABLE_HEADER_STYLES.map((s) => ({
                value: s.id,
                label: s.label,
              })),
              { value: "custom", label: "Custom" },
            ]}
            onChange={(v) => {
              const id = v as TableHeaderStyleId;
              updateBlock(sel.id, {
                content: applyTableHeaderStyle(id),
              });
            }}
          />
          <Grid2>
            <ColorField
              id="table-header-bg"
              label="Header fill"
              value={String(sel.content.headerBackground ?? "#f0ebe3")}
              fallback="#f0ebe3"
              onValue={(v) =>
                updateBlock(sel.id, {
                  content: {
                    headerBackground: v,
                    headerStyle: "custom",
                  },
                })
              }
            />
            <ColorField
              id="table-header-color"
              label="Header ink"
              value={String(sel.content.headerColor || "#2a2622")}
              fallback="#2a2622"
              onValue={(v) =>
                updateBlock(sel.id, {
                  content: { headerColor: v, headerStyle: "custom" },
                })
              }
            />
          </Grid2>
          <Grid2>
            <NumField
              id="table-header-weight"
              label="Header weight"
              compact
              value={Number(sel.content.headerFontWeight ?? 600)}
              min={400}
              max={800}
              step={100}
              onValue={(v) =>
                updateBlock(sel.id, {
                  content: {
                    headerFontWeight: Math.round(v),
                    headerStyle: "custom",
                  },
                })
              }
            />
            <NumField
              id="table-header-size"
              label="Header size"
              compact
              value={Number(sel.content.headerFontSize ?? 0)}
              min={0}
              max={48}
              onValue={(v) =>
                updateBlock(sel.id, {
                  content: {
                    headerFontSize: Math.round(v),
                    headerStyle: "custom",
                  },
                })
              }
            />
          </Grid2>
          <SelectField
            id="table-header-align"
            label="Header align"
            value={String(sel.content.headerTextAlign ?? "left")}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            onChange={(v) =>
              updateBlock(sel.id, {
                content: {
                  headerTextAlign: v,
                  headerStyle: "custom",
                },
              })
            }
          />
          <CheckRow
            checked={Boolean(sel.content.headerRule)}
            onChange={(v) =>
              updateBlock(sel.id, {
                content: { headerRule: v, headerStyle: "custom" },
              })
            }
          >
            Header rule (thicker bottom)
          </CheckRow>
          <Field
            label="Rows from"
            forId="prop-table-mode"
            compact
            hint="Static cells, a JSON array on the preview row, or a named dataset (paste CSV/JSON in Data)."
          >
            <select
              id="prop-table-mode"
              value={
                String(sel.content.datasetName ?? "").trim()
                  ? "dataset"
                  : String(sel.content.sourcePath ?? "").trim()
                    ? "path"
                    : "static"
              }
              onChange={(e) => {
                const mode = e.currentTarget.value;
                if (mode === "static") {
                  updateBlock(sel.id, {
                    content: { datasetName: "", sourcePath: "" },
                  });
                } else if (mode === "path") {
                  updateBlock(sel.id, {
                    content: {
                      datasetName: "",
                      sourcePath:
                        String(sel.content.sourcePath ?? "").trim() ||
                        "line_items",
                    },
                  });
                } else {
                  const first = project.value.datasets?.[0]?.name ?? "";
                  updateBlock(sel.id, {
                    content: {
                      sourcePath: "",
                      datasetName:
                        String(sel.content.datasetName ?? "").trim() || first,
                    },
                  });
                }
              }}
            >
              <option value="static">Static cells</option>
              <option value="path">Field on row (JSON array)</option>
              <option value="dataset">Named dataset</option>
            </select>
          </Field>
          {String(sel.content.datasetName ?? "").trim() ? (
            <>
              <SelectField
                id="prop-table-dataset"
                label="Dataset"
                value={String(sel.content.datasetName ?? "")}
                options={[
                  { value: "", label: "— choose —" },
                  ...(project.value.datasets ?? []).map((d) => ({
                    value: d.name,
                    label: d.keyField
                      ? `${d.name} (key: ${d.keyField})`
                      : d.name,
                  })),
                ]}
                onChange={(v) =>
                  updateBlock(sel.id, {
                    content: { datasetName: v, sourcePath: "" },
                  })
                }
              />
              <div class="design-table-actions">
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() => {
                    const headers =
                      ((sel.content.cells as string[][]) ?? [])[0] ?? [];
                    const name = `lines_${(project.value.datasets?.length ?? 0) + 1}`;
                    const id = addNamedDataset({
                      name,
                      keyField: "",
                      bindTableId: sel.id,
                    });
                    if (headers.length) {
                      const blank: Record<string, unknown> = {};
                      for (const h of headers) {
                        blank[fieldKeyFromHeader(String(h)) || String(h)] = "";
                      }
                      updateProject((draft) => {
                        const ds = draft.datasets?.find((d) => d.id === id);
                        if (ds) ds.rows = [blank];
                        return draft;
                      });
                    }
                    setStudioView("data");
                  }}
                >
                  + New dataset
                </button>
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() => setStudioView("data")}
                >
                  Edit in Data
                </button>
              </div>
              <p class="muted small">
                When the dataset has a key field that matches a column on the
                preview row, only matching rows are shown.
              </p>
            </>
          ) : String(sel.content.sourcePath ?? "").trim() ? (
            <Field
              label="Field path"
              forId="prop-table-source"
              compact
              hint="JSON array on the primary row (e.g. line_items)."
            >
              <input
                id="prop-table-source"
                list="prop-source-cols"
                placeholder="e.g. line_items"
                value={String(sel.content.sourcePath ?? "")}
                onInput={(e) =>
                  updateBlock(sel.id, {
                    content: {
                      sourcePath: e.currentTarget.value,
                      datasetName: "",
                    },
                  })
                }
              />
              <datalist id="prop-source-cols">
                {dataColumnNames(dataRows.value).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          ) : (
            <TableCellsEditor
              blockId={sel.id}
              cells={(sel.content.cells as string[][]) ?? []}
            />
          )}
          {(String(sel.content.datasetName ?? "").trim() ||
            String(sel.content.sourcePath ?? "").trim()) && (
            <TableTemplateEditor
              blockId={sel.id}
              cells={(sel.content.cells as string[][]) ?? []}
              header={sel.content.header === true}
            />
          )}
        </Section>
      )}
    </>
  );
}

/* -------------------------------- surface --------------------------------- */

function TableCellsEditor({
  blockId,
  cells,
}: {
  blockId: string;
  cells: string[][];
}) {
  if (!cells.length) {
    return (
      <p class="muted small">Add rows/columns above, then edit cells here.</p>
    );
  }
  return (
    <Field label="Cells" forId="table-cells-grid" compact>
      <div class="table-cells-editor" id="table-cells-grid">
        {cells.map((row, ri) => (
          <div class="table-cells-editor__row" key={ri}>
            {row.map((cell, ci) => (
              <input
                key={ci}
                aria-label={`R${ri + 1} C${ci + 1}`}
                value={cell}
                onInput={(e) => {
                  const next = cells.map((r) => [...r]);
                  next[ri]![ci] = e.currentTarget.value;
                  updateBlock(blockId, {
                    content: {
                      cells: next,
                      rows: next.length,
                      cols: next[0]?.length ?? 0,
                    },
                  });
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </Field>
  );
}

/** Header + template row for bound tables. */
function TableTemplateEditor({
  blockId,
  cells,
  header,
}: {
  blockId: string;
  cells: string[][];
  header: boolean;
}) {
  const headers = cells[0] ?? [];
  const templates =
    header && cells[1]
      ? cells[1]
      : headers.map((h) => `{{${fieldKeyFromHeader(String(h))}}}`);

  const write = (nextHeaders: string[], nextTpl: string[]) => {
    const rest = cells.slice(header ? 2 : 1);
    const next = header
      ? [nextHeaders, nextTpl, ...rest]
      : [nextTpl, ...rest];
    updateBlock(blockId, {
      content: {
        cells: next,
        rows: next.length,
        cols: nextHeaders.length || nextTpl.length,
        header: true,
      },
    });
  };

  const addColumn = (literal: boolean) => {
    const n = headers.length + 1;
    const nextH = [...headers, `Col ${n}`];
    const nextT = [
      ...templates,
      literal ? toLiteralColumnTemplate("") : `{{field_${n}}}`,
    ];
    write(nextH, nextT);
  };

  if (!headers.length && !templates.length) {
    return (
      <div class="design-table-actions">
        <p class="muted small">
          Set columns first — or add a bound / literal column.
        </p>
        <button
          type="button"
          class="btn btn--ghost btn--small"
          onClick={() => addColumn(false)}
        >
          + Field column
        </button>
        <button
          type="button"
          class="btn btn--ghost btn--small"
          onClick={() => addColumn(true)}
        >
          + Literal column
        </button>
      </div>
    );
  }

  return (
    <Field
      label="Columns"
      forId="table-col-map"
      compact
      hint="Template: {{field}} merges, or Literal (=text) for fixed cells unbound from data."
    >
      <div class="table-cells-editor" id="table-col-map">
        <div class="table-cells-editor__row">
          {headers.map((h, ci) => (
            <input
              key={`h-${ci}`}
              aria-label={`Header ${ci + 1}`}
              value={h}
              onInput={(e) => {
                const nextH = [...headers];
                nextH[ci] = e.currentTarget.value;
                write(nextH, templates);
              }}
            />
          ))}
        </div>
        <div class="table-cells-editor__row">
          {templates.map((t, ci) => {
            const literal = isLiteralColumnTemplate(t);
            return (
              <input
                key={`t-${ci}`}
                aria-label={`Template ${ci + 1}`}
                value={literal ? fromLiteralColumnTemplate(t) : t}
                placeholder={literal ? "Fixed text" : "{{field}}"}
                onInput={(e) => {
                  const nextT = [...templates];
                  const v = e.currentTarget.value;
                  nextT[ci] = literal ? toLiteralColumnTemplate(v) : v;
                  write(
                    headers.length ? headers : nextT.map(() => "Col"),
                    nextT,
                  );
                }}
              />
            );
          })}
        </div>
        <div class="table-cells-editor__row table-cells-editor__row--flags">
          {templates.map((t, ci) => {
            const literal = isLiteralColumnTemplate(t);
            return (
              <label key={`lit-${ci}`} class="table-col-literal">
                <input
                  type="checkbox"
                  checked={literal}
                  onChange={(e) => {
                    const nextT = [...templates];
                    const on = e.currentTarget.checked;
                    const cur = fromLiteralColumnTemplate(String(t));
                    nextT[ci] = on
                      ? toLiteralColumnTemplate(cur.replace(/^\{\{|\}\}$/g, ""))
                      : cur.includes("{{")
                        ? cur
                        : `{{${fieldKeyFromHeader(cur) || "field"}}}`;
                    write(headers, nextT);
                  }}
                />
                Literal
              </label>
            );
          })}
        </div>
      </div>
      <div class="design-table-actions">
        <button
          type="button"
          class="btn btn--ghost btn--small"
          onClick={() => addColumn(false)}
        >
          + Field column
        </button>
        <button
          type="button"
          class="btn btn--ghost btn--small"
          onClick={() => addColumn(true)}
        >
          + Literal column
        </button>
      </div>
    </Field>
  );
}

function MarginFields({
  margins,
  pageId,
}: {
  margins: ReturnType<typeof normalizeMargins>;
  pageId: string;
}) {
  const entries: [keyof PageMargins, string][] = [
    ["top", "Top"],
    ["right", "Right"],
    ["bottom", "Bottom"],
    ["left", "Left"],
  ];
  return (
    <>
      {entries.map(([key, label]) => (
        <NumField
          key={key}
          id={`margin-${key}`}
          label={label}
          compact
          min={0}
          max={360}
          value={margins[key]}
          onValue={(v) =>
            updatePage(pageId, {
              // Partial only — updatePage merges onto current margins.
              margins: { [key]: Math.max(0, v) },
            })
          }
        />
      ))}
    </>
  );
}

export function PageSetup() {
  const page = activePage.value;
  if (!page) return null;
  const margins = normalizeMargins(page.margins);
  const wm = page.watermark ?? {};
  const setWm = (patch: Partial<typeof wm>) =>
    updatePage(page.id, { watermark: { ...wm, ...patch } });

  return (
    <>
      <Section title={t("documentStyles")}>
        <DocumentStyleLibrary />
      </Section>
      <Section title="Page chrome">
        {(() => {
          const chrome = ensurePageChrome(project.value.pageChrome);
          const header = chrome.header!;
          const footer = chrome.footer!;
          return (
            <>
              <p class="muted prop-hint">
                Shared header/footer on every page. Promote selection to move
                body blocks into a band.
              </p>
              <CheckRow
                checked={header.enabled}
                onChange={(v) => updatePageChromeBand("header", { enabled: v })}
              >
                Header band
              </CheckRow>
              <NumField
                id="chrome-header-h"
                label="Header height"
                compact
                value={header.height}
                min={24}
                max={400}
                onValue={(v) =>
                  updatePageChromeBand("header", { height: Math.round(v) })
                }
              />
              <ColorField
                id="chrome-header-bg"
                label="Header fill"
                compact
                value={header.background ?? ""}
                fallback="#ffffff"
                onValue={(v) =>
                  updatePageChromeBand("header", { background: v })
                }
              />
              <div class="pin-presets">
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() => promoteSelectionToChrome("header")}
                >
                  Promote → header
                </button>
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() => clearPageChromeBand("header")}
                >
                  Clear header
                </button>
              </div>
              <CheckRow
                checked={footer.enabled}
                onChange={(v) => updatePageChromeBand("footer", { enabled: v })}
              >
                Footer band
              </CheckRow>
              <NumField
                id="chrome-footer-h"
                label="Footer height"
                compact
                value={footer.height}
                min={24}
                max={400}
                onValue={(v) =>
                  updatePageChromeBand("footer", { height: Math.round(v) })
                }
              />
              <ColorField
                id="chrome-footer-bg"
                label="Footer fill"
                compact
                value={footer.background ?? ""}
                fallback="#ffffff"
                onValue={(v) =>
                  updatePageChromeBand("footer", { background: v })
                }
              />
              <div class="pin-presets">
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() => promoteSelectionToChrome("footer")}
                >
                  Promote → footer
                </button>
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() => clearPageChromeBand("footer")}
                >
                  Clear footer
                </button>
              </div>
              <p class="muted prop-hint">
                Header blocks: {header.blocks.length} · Footer blocks:{" "}
                {footer.blocks.length}
              </p>
            </>
          );
        })()}
      </Section>
      <Section title={t("pageVisibility")}>
        <Field
          label={t("pageCondition")}
          forId="page-condition"
          hint={t("pageConditionHint")}
          compact
        >
          <input
            id="page-condition"
            placeholder="vars.language == 'fr' && output.kind == 'pdf'"
            value={page.condition ?? ""}
            onInput={(e) =>
              updatePage(page.id, {
                condition: e.currentTarget.value || undefined,
              })
            }
          />
        </Field>
        <div class="condition-presets" role="group" aria-label={t("pageCondition")}>
          {[
            ...LANGUAGE_CONDITION_PRESETS,
            ...OUTPUT_KINDS.map((kind) => ({
              label: OUTPUT_KIND_LABEL[kind],
              value: `output.kind == '${kind}'`,
            })),
          ].map((p) => {
            const on = conditionHasClause(page.condition, p.value);
            return (
              <button
                type="button"
                key={p.value}
                class={
                  on
                    ? "condition-presets__btn condition-presets__btn--on"
                    : "condition-presets__btn"
                }
                title={`${on ? "Remove" : "Add"}: ${p.value}`}
                aria-pressed={on}
                onClick={() =>
                  updatePage(page.id, {
                    condition:
                      toggleConditionClause(page.condition, p.value) ||
                      undefined,
                  })
                }
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            class="condition-presets__btn"
            onClick={() => updatePage(page.id, { condition: undefined })}
          >
            Clear
          </button>
        </div>
      </Section>
      <Section title={t("margins")}>
        <div class="prop-grid prop-grid--2">
          <MarginFields margins={margins} pageId={page.id} />
        </div>
        <ColorField
          id="page-bg"
          label="Surface background"
          compact
          value={page.background ?? "#ffffff"}
          fallback="#ffffff"
          onValue={(v) => updatePage(page.id, { background: v })}
        />
      </Section>

      <Section title={t("transform")}>
        <div class="prop-grid prop-grid--2">
          <NumField
            id="page-rotate"
            label="Rotate °"
            compact
            value={page.rotate ?? 0}
            min={-180}
            max={180}
            step={1}
            onValue={(v) =>
              updatePage(page.id, {
                rotate: Math.abs(v) < 0.01 ? undefined : v,
              })
            }
          />
        </div>
        <CheckRow
          checked={Boolean(page.mirrorX)}
          onChange={(v) =>
            updatePage(page.id, { mirrorX: v || undefined })
          }
        >
          Mirror horizontally
        </CheckRow>
        <CheckRow
          checked={Boolean(page.mirrorY)}
          onChange={(v) =>
            updatePage(page.id, { mirrorY: v || undefined })
          }
        >
          Mirror vertically
        </CheckRow>
        <p class="muted prop-hint">
          Surface transform is visual — layout AABBs stay axis-aligned.
        </p>
      </Section>

      <Section title={t("watermark")}>
        <SelectField
          id="wm-kind"
          label="Preset"
          value={String(wm.kind ?? "text")}
          options={[
            { value: "text", label: "Custom text" },
            { value: "draft", label: "DRAFT" },
            { value: "confidential", label: "CONFIDENTIAL" },
          ]}
          onChange={(v) =>
            setWm({
              kind: v as "text" | "draft" | "confidential",
              text:
                v === "draft"
                  ? "DRAFT"
                  : v === "confidential"
                    ? "CONFIDENTIAL"
                    : wm.text,
            })
          }
        />
        <Field label="Text" forId="wm-text" compact>
          <input
            id="wm-text"
            placeholder="CONFIDENTIAL"
            value={wm.text ?? ""}
            onInput={(e) => setWm({ text: e.currentTarget.value, kind: "text" })}
          />
        </Field>
        <Field label="Image URL / upload" forId="wm-src" compact>
          <input
            id="wm-src"
            placeholder="https://… or data URL"
            value={wm.src ?? ""}
            onInput={(e) => setWm({ src: e.currentTarget.value })}
          />
        </Field>
        <input
          type="file"
          accept="image/*"
          aria-label="Upload watermark image"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              window.alert("Image exceeds 2 MB limit.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () =>
              setWm({ src: String(reader.result ?? "") });
            reader.readAsDataURL(file);
          }}
        />
        <SelectField
          id="wm-layout"
          label="Layout"
          value={String(wm.layout ?? "centered")}
          options={[
            { value: "centered", label: "Centered" },
            { value: "repeated", label: "Repeated tile" },
            { value: "diffuse", label: "Diffuse (soft scatter)" },
          ]}
          onChange={(v) =>
            setWm({ layout: v as "centered" | "repeated" | "diffuse" })
          }
        />
        <SelectField
          id="wm-layer"
          label="Layer"
          value={String(wm.layer ?? "behind")}
          options={[
            { value: "behind", label: "Behind content" },
            { value: "front", label: "On top of everything" },
          ]}
          onChange={(v) =>
            setWm({ layer: v as "behind" | "front" })
          }
        />
        <div class="prop-grid prop-grid--2">
          <NumField
            id="wm-size"
            label="Text size"
            compact
            min={12}
            max={400}
            value={wm.fontSize ?? 96}
            onValue={(v) => setWm({ fontSize: Math.max(12, v) })}
          />
          <NumField
            id="wm-scale"
            label="Image scale"
            compact
            min={0.1}
            max={2}
            step={0.05}
            value={wm.scale ?? 0.45}
            onValue={(v) => setWm({ scale: v })}
          />
          <NumField
            id="wm-angle"
            label="Angle °"
            compact
            min={-90}
            max={90}
            step={5}
            value={wm.angle ?? -30}
            onValue={(v) => setWm({ angle: v })}
          />
          <NumField
            id="wm-opacity"
            label="Opacity"
            compact
            min={0.02}
            max={1}
            step={0.02}
            value={wm.opacity ?? 0.12}
            onValue={(v) => setWm({ opacity: Math.min(1, Math.max(0.02, v)) })}
          />
          <ColorField
            id="wm-color"
            label="Color"
            compact
            value={wm.color}
            fallback="#2a2622"
            onValue={(v) => setWm({ color: v })}
          />
        </div>
        <button
          type="button"
          class="btn btn--ghost btn--small"
          onClick={() => updatePage(page.id, { watermark: null })}
        >
          Clear watermark
        </button>
      </Section>

      <Section title={t("gridGuides")}>
        <CheckRow
          checked={Boolean(prefs.value.gridLock)}
          onChange={(v) => updatePrefs({ gridLock: v })}
        >
          Grid lock — stick to grid
        </CheckRow>
        <div class="prop-grid prop-grid--2">
          <NumField
            id="grid-x"
            label="Grid X (px)"
            compact
            min={4}
            max={64}
            value={prefs.value.gridSizeX ?? prefs.value.gridSize ?? 16}
            onValue={(v) =>
              updatePrefs({
                gridSizeX: Math.round(v),
                gridSize: Math.round(v),
              })
            }
          />
          <NumField
            id="grid-y"
            label="Grid Y (px)"
            compact
            min={4}
            max={64}
            value={prefs.value.gridSizeY ?? prefs.value.gridSize ?? 16}
            onValue={(v) => updatePrefs({ gridSizeY: Math.round(v) })}
          />
        </div>
        <ColorField
          id="grid-color"
          label="Grid color"
          compact
          value={prefs.value.gridColor ?? "#c8c2b6"}
          fallback="#c8c2b6"
          onValue={(v) => updatePrefs({ gridColor: v })}
        />
        <SelectField
          id="grid-style-prop"
          label="Style"
          value={String(prefs.value.gridStyle ?? "lines")}
          options={[
            { value: "lines", label: "Lines" },
            { value: "dots", label: "Dots" },
          ]}
          onChange={(v) =>
            updatePrefs({ gridStyle: v === "dots" ? "dots" : "lines" })
          }
        />
      </Section>
    </>
  );
}

/** Inspector Design tab — appearance when a block is selected, else surface setup. */
export function DesignPanel() {
  const sel = selectedBlock.value;
  const isComponent = sel != null && selection.value?.kind === "block";
  const count = selectedBlocks.value.length;
  const title = isComponent
    ? `${TYPE_LABELS[sel!.type] ?? sel!.type}${count > 1 ? ` · ${count}` : ""}`
    : t("surfaceSetup");

  return (
    <div class="design-panel panel-pad" aria-label={t("tabDesign")}>
      <p class="design-panel__title muted">{title}</p>
      {isComponent ? <ComponentProps /> : <PageSetup />}
    </div>
  );
}
