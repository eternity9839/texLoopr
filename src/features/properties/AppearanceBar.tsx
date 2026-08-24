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
} from "../../state/store";
import {
  DEFAULT_MARGINS,
  LIST_STYLES,
  normalizeMargins,
  type BlockStyle,
  type ListStyle,
  type PageMargins,
} from "../../model/document";
import { dataColumnNames } from "../../model/bindings";
import { Icon } from "../../ui/icons";
import {
  CheckRow,
  ColorField,
  Field,
  Grid2,
  NumField,
  SegmentedControl,
  SelectField,
} from "../../ui/controls";

const TYPE_LABELS: Record<string, string> = {
  paragraph: "Paragraph",
  text: "Text",
  list: "List",
  picture: "Picture",
  shape: "Shape",
  table: "Table",
  files: "Files",
  prebuild: "Prebuild",
  group: "Group",
  repeat: "Repeat",
};

function applyStyle(patch: Partial<BlockStyle>, ids: string[]): void {
  for (const id of ids) updateBlock(id, { style: patch });
}

/* ------------------------------ component ------------------------------ */

function ComponentProps() {
  const sel = selectedBlock.value;
  if (!sel) return null;
  const ids = selectedBlocks.value.map((b) => b.id);
  const style = sel.style;
  const clamp0 = (v: number) => Math.max(0, v);

  return (
    <>
      <section class="prop-section">
        <div class="prop-grid">
          <NumField
            id="prop-indent"
            label="Indent"
            value={style.textIndent ?? 0}
            min={0}
            max={200}
            onValue={(v) => applyStyle({ textIndent: clamp0(v) }, ids)}
          />
          <Field label="Align">
            <SegmentedControl
              ariaLabel="Text alignment"
              value={style.textAlign ?? "left"}
              options={[
                { value: "left", icon: "alignTextLeft", label: "Left" },
                { value: "center", icon: "alignTextCenter", label: "Center" },
                { value: "right", icon: "alignTextRight", label: "Right" },
              ]}
              onChange={(v) => applyStyle({ textAlign: v }, ids)}
            />
          </Field>
          <ColorField
            id="prop-color"
            label="Color"
            value={style.color}
            fallback="#2a2622"
            onValue={(v) => applyStyle({ color: v }, ids)}
          />
          <ColorField
            id="prop-bg"
            label="Background"
            value={style.background ?? "#ffffff"}
            fallback="#ffffff"
            onValue={(v) => applyStyle({ background: v }, ids)}
          />
        </div>
      </section>

      {sel.type === "list" && (
        <section class="prop-section prop-section--type">
          <SelectField
            id="prop-list-style"
            label="List style"
            value={style.listStyle ?? "disc"}
            options={[...LIST_STYLES].map((s) => ({
              value: s.value as ListStyle as string,
              label: s.label,
            }))}
            onChange={(v) => updateBlock(sel.id, { style: { listStyle: v as ListStyle } })}
          />
        </section>
      )}

      {sel.type === "table" && (
        <section class="prop-section prop-section--type">
          <CheckRow
            checked={sel.content.header === true}
            onChange={(v) => updateBlock(sel.id, { content: { header: v } })}
          >
            Header row
          </CheckRow>
          <Field
            label="Data source"
            forId="prop-table-source"
            hint="Rows come from that field in your data (JSON array); leave empty to edit cells statically."
          >
            <input
              id="prop-table-source"
              list="prop-source-cols"
              placeholder="e.g. line_items — empty uses cells"
              value={String(sel.content.sourcePath ?? "")}
              onInput={(e) =>
                updateBlock(sel.id, {
                  content: { sourcePath: e.currentTarget.value },
                })
              }
            />
            <datalist id="prop-source-cols">
              {dataColumnNames(dataRows.value).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </section>
      )}
    </>
  );
}

/* -------------------------------- page --------------------------------- */

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
          min={0}
          max={360}
          value={margins[key]}
          onValue={(v) =>
            updatePage(pageId, {
              margins: {
                ...(DEFAULT_MARGINS as PageMargins),
                [key]: Math.max(0, v),
              },
            })
          }
        />
      ))}
    </>
  );
}

function PageSetup() {
  const page = activePage.value;
  if (!page) return null;
  const margins = normalizeMargins(page.margins);
  const wm = page.watermark ?? {};
  const setWm = (patch: Partial<typeof wm>) =>
    updatePage(page.id, { watermark: { ...wm, ...patch } });

  return (
    <>
      <section class="prop-section">
        <p class="prop-section__label">Margins (px)</p>
        <div class="prop-grid prop-grid--4">
          <MarginFields margins={margins} pageId={page.id} />
        </div>
        <ColorField
          id="page-bg"
          label="Page background"
          value={page.background ?? "#ffffff"}
          fallback="#ffffff"
          onValue={(v) => updatePage(page.id, { background: v })}
        />
      </section>

      <section class="prop-section prop-section--type">
        <p class="prop-section__label">Filigrane (watermark)</p>
        <Field label="Text" forId="wm-text">
          <input
            id="wm-text"
            placeholder="CONFIDENTIAL"
            value={wm.text ?? ""}
            onInput={(e) => setWm({ text: e.currentTarget.value })}
          />
        </Field>
        <Grid2>
          <NumField
            id="wm-size"
            label="Size (px)"
            min={12}
            max={400}
            value={wm.fontSize ?? 96}
            onValue={(v) => setWm({ fontSize: Math.max(12, v) })}
          />
          <NumField
            id="wm-angle"
            label="Angle °"
            min={-90}
            max={90}
            step={5}
            value={wm.angle ?? -30}
            onValue={(v) => setWm({ angle: v })}
          />
        </Grid2>
        <Grid2>
          <NumField
            id="wm-opacity"
            label="Opacity"
            min={0.02}
            max={1}
            step={0.02}
            value={wm.opacity ?? 0.12}
            onValue={(v) => setWm({ opacity: Math.min(1, Math.max(0.02, v)) })}
          />
          <ColorField
            id="wm-color"
            label="Color"
            value={wm.color}
            fallback="#2a2622"
            onValue={(v) => setWm({ color: v })}
          />
        </Grid2>
      </section>

      <section class="prop-section">
        <p class="prop-section__label">Grid & guides</p>
        <CheckRow
          checked={Boolean(prefs.value.gridLock)}
          onChange={(v) => updatePrefs({ gridLock: v })}
        >
          Grid lock — components stick to the grid
        </CheckRow>
        <SelectField
          id="grid-size-prop"
          label="Grid size (px)"
          value={String(prefs.value.gridSize ?? 8)}
          options={[4, 8, 16, 24, 32, 40, 64].map((n) => ({
            value: String(n),
            label: `${n}px`,
          }))}
          onChange={(v) => updatePrefs({ gridSize: Number(v) })}
        />
      </section>
    </>
  );
}

/* -------------------------------- dock --------------------------------- */

export function AppearanceBar() {
  const collapsed = Boolean(prefs.value.propsCollapsed);
  const sel = selectedBlock.value;
  const isComponent =
    sel != null && selection.value?.kind === "block";
  const count = selectedBlocks.value.length;

  if (collapsed) {
    return (
      <div class="prop-dock prop-dock--collapsed">
        <button
          type="button"
          class="prop-bar__head prop-bar__head--btn"
          onClick={() => updatePrefs({ propsCollapsed: false })}
          aria-expanded={false}
          title="Show properties"
        >
          <Icon name="sliders" size={13} />
          <span>Properties</span>
          <Icon name="chevronUp" size={12} />
        </button>
      </div>
    );
  }

  const title = isComponent
    ? `${TYPE_LABELS[sel.type] ?? sel.type}${count > 1 ? ` · ${count} selected` : ""}`
    : "Page setup";

  return (
    <div class="prop-dock" aria-label="Properties">
      <div class="prop-bar__head prop-bar__head--static">
        <Icon name="sliders" size={13} />
        <span class="prop-bar__title">{title}</span>
        <button
          type="button"
          class="prop-bar__fold"
          onClick={() => updatePrefs({ propsCollapsed: true })}
          aria-expanded={true}
          title="Collapse properties"
        >
          <Icon name="chevronDown" size={12} />
        </button>
      </div>
      <div class="prop-bar__scroll">
        {isComponent ? <ComponentProps /> : <PageSetup />}
      </div>
    </div>
  );
}
