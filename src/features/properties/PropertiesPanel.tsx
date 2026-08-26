import { useState } from "preact/hooks";
import {
  selectedBlock,
  selection,
  activePage,
  project,
  updateBlock,
  updatePage,
  updateProjectMeta,
  prefs,
  inspectorTab,
  updatePrefs,
  dataRows,
  saveSelectionAsCustomObject,
} from "../../state/store";
import { MIN_BLOCK_H, MIN_BLOCK_W, px } from "../../model/geometry";
import { dataColumnNames } from "../../model/bindings";
import { LIST_STYLES, FONT_OPTIONS, type Block, type BlockStyle, type PageNumber } from "../../model/document";
import { resizeTableCells } from "../../model/placeTools";
import { defaultRepeatChildren } from "../../model/repeat";
import { Icon } from "../../ui/icons";
import {
  CheckRow,
  ColorField,
  Field,
  Grid2,
  NumField,
  Section,
  SelectField,
} from "../../ui/controls";
import { INSPECTOR_TABS } from "../studio/inspectorTabs";
import { t } from "../../i18n";
import { ClearFormatButton, type AppearanceCtx } from "./appearance";

function FieldPicker({
  block,
  onPick,
}: {
  block: Block;
  onPick: (col: string) => void;
}) {
  const cols = dataColumnNames(dataRows.value);
  if (cols.length === 0) {
    return (
      <p class="muted prop-hint">Load Data rows to pick merge fields.</p>
    );
  }
  return (
    <SelectField
      id={`field-pick-${block.id}`}
      label="Insert field"
      value=""
      options={[
        { value: "", label: "Bind field…" },
        ...cols.map((c) => ({ value: c, label: c })),
      ]}
      onChange={(col) => col && onPick(col)}
    />
  );
}

function GeometryFields({
  blockId,
  x,
  y,
  w,
  h,
}: {
  blockId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const num =
    (key: "x" | "y" | "w" | "h", min = 0) =>
    (v: number) => {
      const value =
        key === "w"
          ? Math.max(MIN_BLOCK_W, px(v))
          : key === "h"
            ? Math.max(MIN_BLOCK_H, px(v))
            : Math.max(min, px(v));
      updateBlock(blockId, { [key]: value });
    };

  return (
    <Section title="Geometry (px)">
      <Grid2>
        <NumField id="geo-x" label="X" value={x} onValue={num("x")} />
        <NumField id="geo-y" label="Y" value={y} onValue={num("y")} />
      </Grid2>
      <Grid2>
        <NumField
          id="geo-w"
          label="W"
          value={w}
          min={MIN_BLOCK_W}
          onValue={num("w")}
        />
        <NumField
          id="geo-h"
          label="H"
          value={h}
          min={MIN_BLOCK_H}
          onValue={num("h")}
        />
      </Grid2>
    </Section>
  );
}

export function MetadataPanel() {
  const proj = project.value;
  const page = activePage.value;
  const meta =
    (key: keyof typeof proj) =>
    (e: Event): void => {
      const el = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
      const value =
        el.type === "checkbox" ? (el as HTMLInputElement).checked : el.value;
      updateProjectMeta({ [key]: value } as never);
    };
  const textMeta = (key: keyof typeof proj) => meta(key);

  return (
    <div class="panel-pad" aria-label="Document metadata">
      <Section title="Surface">
        {page && (
          <Field label="Name" forId="page-name">
            <input
              id="page-name"
              value={page.name}
              onInput={(e) =>
                updatePage(page.id, { name: e.currentTarget.value })
              }
            />
          </Field>
        )}
        {page && (
          <>
            <SelectField
              id="pn-mode"
              label="Surface number"
              value={page.pageNumber?.mode ?? "all"}
              options={[
                { value: "off", label: "Off" },
                { value: "all", label: "All surfaces" },
                { value: "odd", label: "Odd surfaces only" },
                { value: "even", label: "Even surfaces only" },
              ]}
              onChange={(v) =>
                v === "off"
                  ? updatePage(page.id, { pageNumber: undefined })
                  : updatePage(page.id, {
                      pageNumber: { ...(page.pageNumber ?? {}), mode: v as PageNumber["mode"] },
                    })
              }
            />
            {page.pageNumber?.mode && (
              <>
                <CheckRow
                  checked={Boolean(page.pageNumber?.skipFirst)}
                  onChange={(skipFirst) =>
                    updatePage(page.id, {
                      pageNumber: { ...(page.pageNumber ?? {}), skipFirst },
                    })
                  }
                >
                  Skip first surface
                </CheckRow>
                <Field label="Skip surfaces (comma list)" forId="pn-skip">
                  <input
                    id="pn-skip"
                    value={(page.pageNumber?.skipPages ?? []).join(", ")}
                    onInput={(e) => {
                      const skipPages = e.currentTarget.value
                        .split(",")
                        .map((s) => Number(s.trim()))
                        .filter((n) => n > 0 && Number.isFinite(n));
                      updatePage(page.id, {
                        pageNumber: { ...(page.pageNumber ?? {}), skipPages },
                      });
                    }}
                  />
                </Field>
                <Field label="Format" forId="pn-format">
                  <input
                    id="pn-format"
                    value={page.pageNumber?.format ?? ""}
                    placeholder="Surface {n} of {total}"
                    onInput={(e) => {
                      const format = e.currentTarget.value || undefined;
                      updatePage(page.id, {
                        pageNumber: { ...(page.pageNumber ?? {}), format },
                      });
                    }}
                  />
                </Field>
              </>
            )}
          </>
        )}
      </Section>

      <Section title="Identity">
        <Field label="Document title" forId="meta-name">
          <input
            id="meta-name"
            value={proj.name}
            onInput={(e) => updateProjectMeta({ name: e.currentTarget.value })}
          />
        </Field>
        <Field label="Author" forId="meta-author">
          <input
            id="meta-author"
            value={proj.author}
            onInput={textMeta("author")}
          />
        </Field>
        <Field label="Company / org" forId="meta-company">
          <input
            id="meta-company"
            value={proj.company ?? ""}
            onInput={meta("company")}
          />
        </Field>
        <Field label="Contact email" forId="meta-email">
          <input
            id="meta-email"
            type="email"
            value={proj.contactEmail ?? ""}
            onInput={meta("contactEmail")}
          />
        </Field>
      </Section>

      <Section title="Classification">
        <Field label="Subject" forId="meta-subject">
          <input
            id="meta-subject"
            value={proj.subject}
            onInput={meta("subject")}
          />
        </Field>
        <Field label="Category" forId="meta-category">
          <input
            id="meta-category"
            value={proj.category ?? ""}
            onInput={meta("category")}
            placeholder="Letter · Invoice · Legal…"
          />
        </Field>
        <Grid2>
          <Field label="Keywords" forId="meta-keywords">
            <input
              id="meta-keywords"
              value={proj.keywords ?? ""}
              onInput={meta("keywords")}
              placeholder="comma,separated"
            />
          </Field>
          <Field label="Tags" forId="meta-tags">
            <input
              id="meta-tags"
              value={proj.tags ?? ""}
              onInput={meta("tags")}
              placeholder="draft, client-a"
            />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Language" forId="meta-lang">
            <input
              id="meta-lang"
              value={proj.language ?? ""}
              onInput={meta("language")}
              placeholder="en · fr · nl"
            />
            <p class="muted prop-hint">
              Default document language (<code>vars.language</code>). Rows may
              override via <code>language</code> / <code>lang</code>.
            </p>
          </Field>
          <Field label="Version" forId="meta-version">
            <input
              id="meta-version"
              value={proj.version ?? ""}
              onInput={meta("version")}
              placeholder="1.0"
            />
          </Field>
        </Grid2>
      </Section>

      <Section title="Description & custom">
        <Field label="Description" forId="meta-desc">
          <textarea
            id="meta-desc"
            value={proj.description}
            onInput={meta("description")}
            rows={3}
          />
        </Field>
        <Field label="Created" forId="meta-created">
          <input
            id="meta-created"
            type="date"
            value={(proj.createdAt ?? "").slice(0, 10)}
            onInput={(e) =>
              updateProjectMeta({ createdAt: e.currentTarget.value })
            }
          />
        </Field>
        <Field label="Custom fields" forId="meta-custom" hint="One key=value per line.">
          <textarea
            id="meta-custom"
            value={proj.customMeta ?? ""}
            onInput={meta("customMeta")}
            rows={4}
            placeholder={"client_id=ACME\npo_number=4412"}
          />
        </Field>
        <CheckRow
          checked={proj.published}
          onChange={(v) => updateProjectMeta({ published: v })}
        >
          Published
        </CheckRow>
        <p class="muted prop-hint">Last saved: {proj.lastSaved ?? "Never"}</p>
      </Section>
    </div>
  );
}

export function PropertiesPanel() {
  const sel = selection.value;
  const block = selectedBlock.value;
  const collapsed = Boolean(prefs.value.inspectorCollapsed);
  const [customName, setCustomName] = useState("");

  if (collapsed) {
    return (
      <div class="insp-icons" aria-label={t("inspector")}>
        {INSPECTOR_TABS.map((tabDef) => (
          <button
            type="button"
            key={tabDef.id}
            class={
              inspectorTab.value === tabDef.id
                ? "nav-icon-btn nav-icon-btn--on"
                : "nav-icon-btn"
            }
            title={t(tabDef.labelKey)}
            aria-label={t(tabDef.labelKey)}
            onClick={() => {
              inspectorTab.value = tabDef.id;
              if (prefs.value.inspectorCollapsed) {
                updatePrefs({ inspectorCollapsed: false });
              }
            }}
          >
            <Icon name={tabDef.icon} size={14} />
          </button>
        ))}
      </div>
    );
  }

  if (sel?.kind === "block" && block) {
    const styleNum =
      (key: keyof Block["style"], min?: number, max?: number) =>
      (v: number) =>
        updateBlock(block.id, {
          style: {
            [key]: Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)),
          },
        });
    const setStyle: AppearanceCtx["setStyle"] = (patch) =>
      updateBlock(block.id, { style: patch });

    return (
      <div class="panel-pad" aria-label="Block properties">
        <Section title="Block">
          <Field label="Name" forId="block-name">
            <input
              id="block-name"
              value={block.name}
              onInput={(e) =>
                updateBlock(block.id, { name: e.currentTarget.value })
              }
            />
          </Field>
          <p class="muted prop-hint">
            Conditions live on the Data inspector tab (chips toggle language and
            output clauses).
          </p>
          <FieldPicker
            block={block}
            onPick={(col) => {              if (block.type === "picture" || block.type === "signature") {
                updateBlock(block.id, {
                  content: { src: `{{${col}}}` },
                });
                return;
              }
              if (block.type === "qrcode") {
                updateBlock(block.id, {
                  content: { value: `{{${col}}}` },
                });
                return;
              }
              if (block.type === "date") {
                updateBlock(block.id, {
                  content: { source: "field", path: col },
                });
                return;
              }
              const text = String(block.content.text ?? "");
              updateBlock(block.id, {
                content: { text: `${text}{{${col}}}` },
              });
            }}
          />
          {"text" in block.content && (
            <Field label="Text" forId="block-text">
              <textarea
                id="block-text"
                value={String(block.content.text ?? "")}
                onInput={(e) =>
                  updateBlock(block.id, {
                    content: { text: e.currentTarget.value },
                  })
                }
              />
            </Field>
          )}
          {block.type === "date" && (
            <>
              <SelectField
                id="date-source"
                label="Source"
                value={String(block.content.source ?? "today")}
                options={[
                  { value: "today", label: "Today (generated)" },
                  { value: "fixed", label: "Fixed date" },
                  { value: "field", label: "Data field" },
                ]}
                onChange={(v) =>
                  updateBlock(block.id, { content: { source: v } })
                }
              />
              {String(block.content.source ?? "today") === "fixed" && (
                <Field label="Date" forId="date-fixed">
                  <input
                    id="date-fixed"
                    type="date"
                    value={String(block.content.fixed ?? "")}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        content: { fixed: e.currentTarget.value },
                      })
                    }
                  />
                </Field>
              )}
              {String(block.content.source ?? "today") === "field" && (
                <Field label="Field path" forId="date-path">
                  <input
                    id="date-path"
                    placeholder="invoice_date"
                    value={String(block.content.path ?? "")}
                    onInput={(e) =>
                      updateBlock(block.id, {
                        content: { path: e.currentTarget.value },
                      })
                    }
                  />
                </Field>
              )}
              <SelectField
                id="date-format"
                label="Format"
                value={String(block.content.format ?? "short")}
                options={[
                  { value: "short", label: "Short (21 Aug 2026)" },
                  { value: "long", label: "Long" },
                  { value: "iso", label: "ISO (2026-08-21)" },
                ]}
                onChange={(v) =>
                  updateBlock(block.id, { content: { format: v } })
                }
              />
            </>
          )}
          {block.type === "signature" && (
            <>
              <Field label="Ink image URL" forId="sig-src">
                <input
                  id="sig-src"
                  placeholder="https://… or {{signature_url}}"
                  value={String(block.content.src ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { src: e.currentTarget.value },
                    })
                  }
                />
              </Field>
              <Field label="Label" forId="sig-label">
                <input
                  id="sig-label"
                  value={String(block.content.label ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { label: e.currentTarget.value },
                    })
                  }
                />
              </Field>
              <Field label="Caption" forId="sig-caption">
                <textarea
                  id="sig-caption"
                  value={String(block.content.caption ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { caption: e.currentTarget.value },
                    })
                  }
                />
              </Field>
              <CheckRow
                checked={block.content.showLine !== false}
                onChange={(v) =>
                  updateBlock(block.id, { content: { showLine: v } })
                }
              >
                Show signature line
              </CheckRow>
            </>
          )}
          {block.type === "qrcode" && (
            <>
              <Field label="QR payload" forId="qr-value">
                <input
                  id="qr-value"
                  placeholder="https://… or {{tracking}}"
                  value={String(block.content.value ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { value: e.currentTarget.value },
                    })
                  }
                />
              </Field>
              <SelectField
                id="qr-ecc"
                label="Error correction"
                value={String(block.content.ecc ?? "M")}
                options={[
                  { value: "L", label: "L (~7%)" },
                  { value: "M", label: "M (~15%)" },
                  { value: "Q", label: "Q (~25%)" },
                  { value: "H", label: "H (~30%)" },
                ]}
                onChange={(v) =>
                  updateBlock(block.id, { content: { ecc: v } })
                }
              />
            </>
          )}
          {block.type === "picture" && (
            <>
              <Field label="Image URL" forId="pic-src">
                <input
                  id="pic-src"
                  value={String(block.content.src ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { src: e.currentTarget.value },
                    })
                  }
                />
              </Field>
              <Field label="Upload image (max 2 MB)" forId="pic-file">
                <input
                  id="pic-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      window.alert("Image exceeds 2 MB limit.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      updateBlock(block.id, {
                        content: {
                          src: String(reader.result ?? ""),
                          alt: file.name,
                        },
                      });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </Field>
              <Field label="Alt text" forId="pic-alt">
                <input
                  id="pic-alt"
                  value={String(block.content.alt ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { alt: e.currentTarget.value },
                    })
                  }
                />
              </Field>
            </>
          )}
          {block.type === "files" && (
            <>
              <Field label="Label" forId="file-label">
                <input
                  id="file-label"
                  value={String(block.content.label ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { label: e.currentTarget.value },
                    })
                  }
                />
              </Field>
              <Field label="Attach file (max 2 MB)" forId="file-attach">
                <input
                  id="file-attach"
                  type="file"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      window.alert("File exceeds 2 MB limit.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      updateBlock(block.id, {
                        content: {
                          fileName: file.name,
                          fileSize: file.size,
                          mimeType: file.type || "application/octet-stream",
                          dataUrl: String(reader.result ?? ""),
                          count: 1,
                          label: file.name,
                        },
                      });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </Field>
              {String(block.content.fileName ?? "") ? (
                <p class="muted prop-hint">
                  {String(block.content.fileName)} ·{" "}
                  {(Number(block.content.fileSize ?? 0) / 1024).toFixed(1)} KB
                </p>
              ) : (
                <p class="muted prop-hint">No file attached.</p>
              )}
            </>
          )}
          {block.type === "list" && (
            <Field label="List items (one per line)" forId="list-items">
              <textarea
                id="list-items"
                value={((block.content.items as string[]) ?? []).join("\n")}
                onInput={(e) =>
                  updateBlock(block.id, {
                    content: { items: e.currentTarget.value.split("\n") },
                  })
                }
              />
            </Field>
          )}
          {(block.type === "repeat" || block.type === "group") && (
            <>
              <Field label="Save as custom object" forId="group-save-name">
                <div class="field-row">
                  <input
                    id="group-save-name"
                    placeholder="Letter header"
                    value={customName}
                    onInput={(e) => setCustomName(e.currentTarget.value)}
                  />
                  <button
                    type="button"
                    class="btn btn--ghost btn--small"
                    disabled={!customName.trim()}
                    onClick={() => {
                      saveSelectionAsCustomObject(customName.trim());
                      setCustomName("");
                    }}
                  >
                    Save
                  </button>
                </div>
              </Field>
              <Field
                label="Repeat items path (optional)"
                forId="repeat-path"
                hint="Leave empty for a plain group."
              >
                <input
                  id="repeat-path"
                  value={String(block.content.itemsPath ?? "")}
                  placeholder="line_items"
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { itemsPath: e.currentTarget.value },
                    })
                  }
                />
              </Field>
              <Field label="Item variable" forId="repeat-var">
                <input
                  id="repeat-var"
                  value={String(block.content.itemVar ?? "item")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { itemVar: e.currentTarget.value },
                    })
                  }
                />
              </Field>
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() =>
                  updateBlock(block.id, {
                    content: { blocks: defaultRepeatChildren() },
                  })
                }
              >
                Seed child prototype
              </button>
            </>
          )}
        </Section>

        <GeometryFields
          blockId={block.id}
          x={block.x}
          y={block.y}
          w={block.w}
          h={block.h}
        />

        <Section title="Typography">
          <Grid2>
            <NumField
              id="font-size"
              label="Font size"
              value={block.style.fontSize ?? 14}
              min={10}
              max={72}
              onValue={styleNum("fontSize", 10, 72)}
            />
            <NumField
              id="line-height"
              label="Line height"
              value={block.style.lineHeight ?? 1.4}
              min={0.8}
              max={3}
              step={0.05}
              onValue={styleNum("lineHeight", 0.8, 3)}
            />
          </Grid2>
          <Grid2>
            <SelectField
              id="font-family"
              label="Font family"
              value={block.style.fontFamily ?? ""}
              options={[
                { value: "", label: "Default" },
                ...FONT_OPTIONS,
              ]}
              onChange={(v) =>
                updateBlock(block.id, {
                  style: { fontFamily: v as BlockStyle["fontFamily"] },
                })
              }
            />
            <SelectField
              id="text-case"
              label="Letter case"
              value={block.style.textTransform ?? "none"}
              options={[
                { value: "none", label: "As typed" },
                { value: "uppercase", label: "UPPERCASE" },
                { value: "lowercase", label: "lowercase" },
                { value: "capitalize", label: "Capitalize" },
              ]}
              onChange={(v) =>
                updateBlock(block.id, {
                  style: { textTransform: v as BlockStyle["textTransform"] },
                })
              }
            />
          </Grid2>
          <Grid2>
            <ColorField
              id="font-color"
              label="Color"
              value={block.style.color}
              fallback="#2a2622"
              onValue={(v) =>
                updateBlock(block.id, { style: { color: v } })
              }
            />
            <NumField
              id="letter-spacing"
              label="Letter spacing"
              value={block.style.letterSpacing ?? 0}
              min={-4}
              max={12}
              step={0.5}
              onValue={styleNum("letterSpacing", -4, 12)}
            />
          </Grid2>
          <Grid2>
            <NumField
              id="text-indent"
              label="First-line indent"
              value={block.style.textIndent ?? 0}
              min={0}
              max={96}
              onValue={styleNum("textIndent", 0, 96)}
            />
            <CheckRow
              checked={Number(block.style.fontWeight) >= 600}
              onChange={(v) =>
                updateBlock(block.id, { style: { fontWeight: v ? 700 : 400 } })
              }
            >
              Bold
            </CheckRow>
          </Grid2>
          <Grid2>
            <CheckRow
              checked={block.style.fontStyle === "italic"}
              onChange={(v) =>
                updateBlock(block.id, {
                  style: { fontStyle: v ? "italic" : "normal" },
                })
              }
            >
              Italic
            </CheckRow>
            <CheckRow
              checked={block.style.textDecoration === "underline"}
              onChange={(v) =>
                updateBlock(block.id, {
                  style: { textDecoration: v ? "underline" : "none" },
                })
              }
            >
              Underline
            </CheckRow>
          </Grid2>
          <SelectField
            id="text-align"
            label="Alignment"
            value={block.style.textAlign ?? "left"}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            onChange={(v) =>
              updateBlock(block.id, {
                style: { textAlign: v as "left" | "center" | "right" },
              })
            }
          />
        </Section>

        <Section title="Layout">
          <Grid2>
            <NumField
              id="opacity"
              label="Opacity"
              value={block.style.opacity ?? 1}
              min={0}
              max={1}
              step={0.05}
              onValue={styleNum("opacity", 0, 1)}
            />
            <NumField
              id="padding"
              label="Padding"
              value={block.style.padding ?? 0}
              min={0}
              max={48}
              onValue={styleNum("padding", 0, 48)}
            />
          </Grid2>
          <NumField
            id="margin"
            label="Margin (all sides)"
            value={block.style.margin ?? 0}
            min={0}
            max={96}
            onValue={styleNum("margin", 0, 96)}
          />
          {(block.type === "group" || block.type === "repeat") && (
            <>
              <SelectField
                id="child-layout"
                label="Arrange children"
                value={block.style.layout ?? "absolute"}
                options={[
                  { value: "absolute", label: "Absolute (free drag)" },
                  { value: "flex", label: "Flex stack" },
                ]}
                onChange={(v) =>
                  updateBlock(block.id, {
                    style: {
                      layout: v === "flex" ? "flex" : undefined,
                    },
                  })
                }
              />
              {block.style.layout === "flex" && (
                <>
                  <SelectField
                    id="flex-direction"
                    label="Direction"
                    value={block.style.direction ?? "column"}
                    options={[
                      { value: "column", label: "Vertical" },
                      { value: "row", label: "Horizontal" },
                    ]}
                    onChange={(v) =>
                      updateBlock(block.id, {
                        style: {
                          direction: v as BlockStyle["direction"],
                        },
                      })
                    }
                  />
                  <SelectField
                    id="flex-justify"
                    label="Distribute"
                    value={block.style.justify ?? "start"}
                    options={[
                      { value: "start", label: "Start" },
                      { value: "center", label: "Center" },
                      { value: "end", label: "End" },
                      { value: "space-between", label: "Space between" },
                    ]}
                    onChange={(v) =>
                      updateBlock(block.id, {
                        style: {
                          justify: v as BlockStyle["justify"],
                        },
                      })
                    }
                  />
                  <SelectField
                    id="flex-align"
                    label="Align items"
                    value={block.style.alignItems ?? "stretch"}
                    options={[
                      { value: "stretch", label: "Stretch" },
                      { value: "start", label: "Start" },
                      { value: "center", label: "Center" },
                      { value: "end", label: "End" },
                    ]}
                    onChange={(v) =>
                      updateBlock(block.id, {
                        style: {
                          alignItems: v as BlockStyle["alignItems"],
                        },
                      })
                    }
                  />
                  <NumField
                    id="flex-gap"
                    label="Gap"
                    value={block.style.gap ?? 0}
                    min={0}
                    max={96}
                    onValue={styleNum("gap", 0, 96)}
                  />
                </>
              )}
            </>
          )}
          <SelectField
            id="valign"
            label="Vertical align"
            value={block.style.verticalAlign ?? "top"}
            options={[
              { value: "top", label: "Top" },
              { value: "middle", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ]}
            onChange={(v) =>
              updateBlock(block.id, {
                style: {
                  verticalAlign: v as BlockStyle["verticalAlign"],
                },
              })
            }
          />
          <CheckRow
            checked={Boolean(block.style.shadow)}
            onChange={(v) => updateBlock(block.id, { style: { shadow: v } })}
          >
            Drop shadow
          </CheckRow>
        </Section>

        <Section title="Appearance">
          <Grid2>
            <NumField
              id="border-w"
              label="Border width"
              value={block.style.borderWidth ?? 0}
              min={0}
              max={12}
              onValue={styleNum("borderWidth", 0, 12)}
            />
            <NumField
              id="radius"
              label="Corner radius"
              value={block.style.borderRadius ?? 0}
              min={0}
              max={999}
              onValue={styleNum("borderRadius", 0, 999)}
            />
          </Grid2>
          <ColorField
            id="bg-color"
            label="Background"
            value={block.style.background}
            fallback="#ffffff"
            onValue={(v) =>
              updateBlock(block.id, { style: { background: v } })
            }
          />
          <ColorField
            id="border-c"
            label="Border color"
            value={block.style.borderColor}
            fallback="#2a2622"
            onValue={(v) =>
              updateBlock(block.id, { style: { borderColor: v } })
            }
          />
          <ClearFormatButton ctx={{ block, setStyle }} />        </Section>

        {block.type === "list" && (
          <Section title="List">
            <SelectField
              id="list-style"
              label="Markers"
              value={block.style.listStyle ?? "disc"}
              options={LIST_STYLES.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
              onChange={(v) =>
                updateBlock(block.id, {
                  style: { listStyle: v as Block["style"]["listStyle"] },
                })
              }
            />
            <Grid2>
              <NumField
                id="list-start"
                label="Start at"
                value={Number(block.content.start ?? 1)}
                min={1}
                max={999}
                onValue={(v) =>
                  updateBlock(block.id, {
                    content: { start: Math.max(1, Math.round(v)) },
                  })
                }
              />
              <ColorField
                id="marker-color"
                label="Marker color"
                value={String(block.content.markerColor ?? "")}
                fallback="#8a8577"
                onValue={(v) =>
                  updateBlock(block.id, { content: { markerColor: v } })
                }
              />
            </Grid2>
          </Section>
        )}

        {block.type === "picture" && (
          <Section title="Picture">
            <SelectField
              id="pic-fit"
              label="Fit"
              value={String(block.content.fit ?? "contain")}
              options={[
                { value: "cover", label: "Cover (fill frame)" },
                { value: "contain", label: "Contain (fit inside)" },
                { value: "fill", label: "Stretch" },
              ]}
              onChange={(v) =>
                updateBlock(block.id, {
                  content: { fit: v },
                })
              }
            />
            <SelectField
              id="pic-pos"
              label="Position"
              value={String(block.content.objectPosition ?? "center")}
              options={[
                { value: "center", label: "Center" },
                { value: "top", label: "Top" },
                { value: "bottom", label: "Bottom" },
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
              onChange={(v) =>
                updateBlock(block.id, { content: { objectPosition: v } })
              }
            />
            <Grid2>
              <NumField
                id="filter-gray"
                label="Grayscale %"
                value={Number(block.content.filterGrayscale ?? 0)}
                min={0}
                max={100}
                onValue={(v) =>
                  updateBlock(block.id, { content: { filterGrayscale: v } })
                }
              />
              <NumField
                id="filter-sepia"
                label="Sepia %"
                value={Number(block.content.filterSepia ?? 0)}
                min={0}
                max={100}
                onValue={(v) =>
                  updateBlock(block.id, { content: { filterSepia: v } })
                }
              />
            </Grid2>
            <NumField
              id="filter-blur"
              label="Blur px"
              value={Number(block.content.filterBlur ?? 0)}
              min={0}
              max={20}
              onValue={(v) =>
                updateBlock(block.id, { content: { filterBlur: v } })
              }
            />
          </Section>
        )}

        {block.type === "shape" && (
          <Section title="Shape">
            <SelectField
              id="shape-variant"
              label="Variant"
              value={String(block.content.variant ?? "rect")}
              options={[
                { value: "rect", label: "Rectangle" },
                { value: "rounded", label: "Rounded" },
                { value: "ellipse", label: "Ellipse" },
                { value: "circle", label: "Circle" },
                { value: "triangle", label: "Triangle" },
                { value: "diamond", label: "Diamond" },
                { value: "line", label: "Rule / line" },
              ]}
              onChange={(v) =>
                updateBlock(block.id, { content: { variant: v, shape: v } })
              }
            />
            <CheckRow
              checked={Boolean(block.content.filled)}
              onChange={(v) => {
                updateBlock(block.id, {
                  content: { filled: v },
                  style: {
                    background: v
                      ? block.style.background &&
                        block.style.background !== "transparent"
                        ? block.style.background
                        : "#e3ddd3"
                      : "transparent",
                    borderWidth: v
                      ? (block.style.borderWidth ?? 0)
                      : Math.max(1, block.style.borderWidth ?? 1.5),
                  },
                });
              }}
            >
              Fill shape
            </CheckRow>
          </Section>
        )}

        {block.type === "table" && (
          <Section title="Table">
            <Grid2>
              <NumField
                id="table-rows"
                label="Rows"
                value={Number(block.content.rows ?? ((block.content.cells as string[][]) ?? []).length ?? 3)}
                min={1}
                max={32}
                onValue={(v) => {
                  const rows = Math.round(v);
                  const cols = Number(
                    block.content.cols ??
                      ((block.content.cells as string[][]) ?? [])[0]?.length ??
                      3,
                  );
                  updateBlock(block.id, {
                    content: {
                      rows,
                      cols,
                      cells: resizeTableCells(
                        (block.content.cells as string[][]) ?? [],
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
                value={Number(
                  block.content.cols ??
                    ((block.content.cells as string[][]) ?? [])[0]?.length ??
                    3,
                )}
                min={1}
                max={16}
                onValue={(v) => {
                  const cols = Math.round(v);
                  const rows = Number(
                    block.content.rows ??
                      ((block.content.cells as string[][]) ?? []).length ??
                      3,
                  );
                  updateBlock(block.id, {
                    content: {
                      rows,
                      cols,
                      cells: resizeTableCells(
                        (block.content.cells as string[][]) ?? [],
                        rows,
                        cols,
                      ),
                    },
                  });
                }}
              />
            </Grid2>
            <CheckRow
              checked={Boolean(block.content.header)}
              onChange={(v) => updateBlock(block.id, { content: { header: v } })}
            >
              Header row
            </CheckRow>
            <CheckRow
              checked={Boolean(block.content.zebra)}
              onChange={(v) => updateBlock(block.id, { content: { zebra: v } })}
            >
              Zebra stripes
            </CheckRow>
            <CheckRow
              checked={block.content.showBorders !== false}
              onChange={(v) =>
                updateBlock(block.id, { content: { showBorders: v } })
              }
            >
              Show borders
            </CheckRow>
            <Grid2>
              <NumField
                id="cell-pad"
                label="Cell padding"
                value={Number(block.content.cellPadding ?? 6)}
                min={0}
                max={24}
                onValue={(v) =>
                  updateBlock(block.id, {
                    content: { cellPadding: Math.round(v) },
                  })
                }
              />
              <ColorField
                id="header-bg"
                label="Header fill"
                value={String(block.content.headerBackground ?? "")}
                fallback="#f0ebe3"
                onValue={(v) =>
                  updateBlock(block.id, { content: { headerBackground: v } })
                }
              />
            </Grid2>
            <ColorField
              id="table-border"
              label="Border color"
              value={String(block.content.borderColor ?? "#cfc8bc")}
              fallback="#cfc8bc"
              onValue={(v) =>
                updateBlock(block.id, { content: { borderColor: v } })
              }
            />
            <Field label="Data path" forId="table-source" hint="Optional JSON array path">
              <input
                id="table-source"
                value={String(block.content.sourcePath ?? "")}
                onInput={(e) =>
                  updateBlock(block.id, {
                    content: { sourcePath: e.currentTarget.value },
                  })
                }
              />
            </Field>
          </Section>
        )}
      </div>
    );
  }

  return <MetadataPanel />;
}
