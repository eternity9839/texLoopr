import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
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
import type { Block } from "../../model/document";
import { defaultRepeatChildren } from "../../model/repeat";
import { Icon } from "../../ui/icons";
import { INSPECTOR_TABS } from "../studio/inspectorTabs";

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
      <p class="muted" style={{ fontSize: "0.7rem" }}>
        Load Data rows to pick merge fields.
      </p>
    );
  }
  return (
    <div class="field">
      <label for={`field-pick-${block.id}`}>Insert field</label>
      <select
        id={`field-pick-${block.id}`}
        value=""
        onChange={(e) => {
          const col = e.currentTarget.value;
          if (col) onPick(col);
          e.currentTarget.value = "";
        }}
      >
        <option value="">Bind field…</option>
        {cols.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

function Collapse({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ComponentChildren;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section class="insp-section">
      <button
        type="button"
        class="insp-section__head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <Icon name={open ? "chevronDown" : "chevronRight"} size={12} />
      </button>
      {open && <div class="insp-section__body">{children}</div>}
    </section>
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
  const setNum =
    (key: "x" | "y" | "w" | "h", min = 0) =>
    (e: Event) => {
      const raw = Number((e.currentTarget as HTMLInputElement).value);
      if (!Number.isFinite(raw)) return;
      const value =
        key === "w"
          ? Math.max(MIN_BLOCK_W, px(raw))
          : key === "h"
            ? Math.max(MIN_BLOCK_H, px(raw))
            : Math.max(min, px(raw));
      updateBlock(blockId, { [key]: value });
    };

  return (
    <Collapse title="Geometry (px)">
      <div class="geo-grid">
        <div class="field">
          <label for="geo-x">X</label>
          <input id="geo-x" type="number" step={1} value={x} onInput={setNum("x")} />
        </div>
        <div class="field">
          <label for="geo-y">Y</label>
          <input id="geo-y" type="number" step={1} value={y} onInput={setNum("y")} />
        </div>
      </div>
      <div class="geo-grid">
        <div class="field">
          <label for="geo-w">W</label>
          <input
            id="geo-w"
            type="number"
            step={1}
            min={MIN_BLOCK_W}
            value={w}
            onInput={setNum("w")}
          />
        </div>
        <div class="field">
          <label for="geo-h">H</label>
          <input
            id="geo-h"
            type="number"
            step={1}
            min={MIN_BLOCK_H}
            value={h}
            onInput={setNum("h")}
          />
        </div>
      </div>
    </Collapse>
  );
}

export function MetadataPanel() {
  const proj = project.value;
  const page = activePage.value;
  const meta = (key: keyof typeof proj) => (e: Event) => {
    const el = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    const value =
      el.type === "checkbox"
        ? (el as HTMLInputElement).checked
        : el.value;
    updateProjectMeta({ [key]: value } as never);
  };

  return (
    <div class="panel-pad" aria-label="Document metadata">
      <Collapse title="Page">
        {page && (
          <div class="field">
            <label for="page-name">Name</label>
            <input
              id="page-name"
              value={page.name}
              onInput={(e) =>
                updatePage(page.id, { name: e.currentTarget.value })
              }
            />
          </div>
        )}
      </Collapse>
      <Collapse title="Identity">
        <div class="field">
          <label for="meta-name">Document title</label>
          <input
            id="meta-name"
            value={proj.name}
            onInput={(e) => updateProjectMeta({ name: e.currentTarget.value })}
          />
        </div>
        <div class="field">
          <label for="meta-author">Author</label>
          <input id="meta-author" value={proj.author} onInput={meta("author")} />
        </div>
        <div class="field">
          <label for="meta-company">Company / org</label>
          <input
            id="meta-company"
            value={proj.company ?? ""}
            onInput={meta("company")}
          />
        </div>
        <div class="field">
          <label for="meta-email">Contact email</label>
          <input
            id="meta-email"
            type="email"
            value={proj.contactEmail ?? ""}
            onInput={meta("contactEmail")}
          />
        </div>
      </Collapse>
      <Collapse title="Classification">
        <div class="field">
          <label for="meta-subject">Subject</label>
          <input
            id="meta-subject"
            value={proj.subject}
            onInput={meta("subject")}
          />
        </div>
        <div class="field">
          <label for="meta-category">Category</label>
          <input
            id="meta-category"
            value={proj.category ?? ""}
            onInput={meta("category")}
            placeholder="Letter · Invoice · Legal…"
          />
        </div>
        <div class="field">
          <label for="meta-keywords">Keywords</label>
          <input
            id="meta-keywords"
            value={proj.keywords ?? ""}
            onInput={meta("keywords")}
            placeholder="comma,separated"
          />
        </div>
        <div class="field">
          <label for="meta-tags">Tags</label>
          <input
            id="meta-tags"
            value={proj.tags ?? ""}
            onInput={meta("tags")}
            placeholder="draft, client-a"
          />
        </div>
        <div class="field">
          <label for="meta-lang">Language</label>
          <input
            id="meta-lang"
            value={proj.language ?? ""}
            onInput={meta("language")}
            placeholder="en · fr · nl"
          />
        </div>
        <div class="field">
          <label for="meta-version">Version</label>
          <input
            id="meta-version"
            value={proj.version ?? ""}
            onInput={meta("version")}
            placeholder="1.0"
          />
        </div>
      </Collapse>
      <Collapse title="Description & custom" defaultOpen={false}>
        <div class="field">
          <label for="meta-desc">Description</label>
          <textarea
            id="meta-desc"
            value={proj.description}
            onInput={meta("description")}
            rows={3}
          />
        </div>
        <div class="field">
          <label for="meta-created">Created</label>
          <input
            id="meta-created"
            type="date"
            value={(proj.createdAt ?? "").slice(0, 10)}
            onInput={(e) =>
              updateProjectMeta({ createdAt: e.currentTarget.value })
            }
          />
        </div>
        <div class="field">
          <label for="meta-custom">Custom fields</label>
          <textarea
            id="meta-custom"
            value={proj.customMeta ?? ""}
            onInput={meta("customMeta")}
            rows={4}
            placeholder={"client_id=ACME\npo_number=4412"}
          />
          <p class="muted" style={{ fontSize: "0.7rem", margin: "0.25rem 0 0" }}>
            One key=value per line.
          </p>
        </div>
        <div class="field">
          <label for="meta-published">
            <input
              id="meta-published"
              type="checkbox"
              checked={proj.published}
              onChange={meta("published")}
            />{" "}
            Published
          </label>
        </div>
        <p class="muted" style={{ fontSize: "0.75rem" }}>
          Last saved: {proj.lastSaved ?? "Never"}
        </p>
      </Collapse>
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
      <div class="insp-icons" aria-label="Inspector icons">
        {INSPECTOR_TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            class={
              inspectorTab.value === t.id
                ? "nav-icon-btn nav-icon-btn--on"
                : "nav-icon-btn"
            }
            title={t.label}
            aria-label={t.label}
            onClick={() => {
              inspectorTab.value = t.id;
              if (prefs.value.inspectorCollapsed) {
                updatePrefs({ inspectorCollapsed: false });
              }
            }}
          >
            <Icon name={t.icon} size={14} />
          </button>
        ))}
      </div>
    );
  }

  if (sel?.kind === "block" && block) {
    return (
      <div class="panel-pad" aria-label="Block properties">
        <Collapse title="Block">
          <div class="field">
            <label for="block-name">Name</label>
            <input
              id="block-name"
              value={block.name}
              onInput={(e) =>
                updateBlock(block.id, { name: e.currentTarget.value })
              }
            />
          </div>
          <div class="field">
            <label for="block-condition">Condition</label>
            <input
              id="block-condition"
              placeholder="data.role · output.kind == 'print'"
              value={block.condition ?? ""}
              onInput={(e) =>
                updateBlock(block.id, { condition: e.currentTarget.value })
              }
            />
            <p class="muted" style={{ fontSize: "0.7rem", margin: "0.25rem 0 0" }}>
              Examples: <code>role</code>, <code>!empty</code>,{" "}
              <code>output.kind == 'print'</code>
            </p>
          </div>
          <FieldPicker
            block={block}
            onPick={(col) => {
              if (block.type === "picture") {
                updateBlock(block.id, {
                  content: { src: `{{${col}}}` },
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
            <div class="field">
              <label for="block-text">Text</label>
              <textarea
                id="block-text"
                value={String(block.content.text ?? "")}
                onInput={(e) =>
                  updateBlock(block.id, {
                    content: { text: e.currentTarget.value },
                  })
                }
              />
            </div>
          )}
          {block.type === "picture" && (
            <>
              <div class="field">
                <label for="pic-src">Image URL</label>
                <input
                  id="pic-src"
                  value={String(block.content.src ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { src: e.currentTarget.value },
                    })
                  }
                />
              </div>
              <div class="field">
                <label for="pic-alt">Alt text</label>
                <input
                  id="pic-alt"
                  value={String(block.content.alt ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { alt: e.currentTarget.value },
                    })
                  }
                />
              </div>
            </>
          )}
          {block.type === "list" && (
            <div class="field">
              <label for="list-items">List items (one per line)</label>
              <textarea
                id="list-items"
                value={((block.content.items as string[]) ?? []).join("\n")}
                onInput={(e) =>
                  updateBlock(block.id, {
                    content: { items: e.currentTarget.value.split("\n") },
                  })
                }
              />
            </div>
          )}
          {block.type === "repeat" || block.type === "group" ? (
            <>
              <div class="field">
                <label for="group-save-name">Save as custom object</label>
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
              </div>
              <div class="field">
                <label for="repeat-path">Repeat items path (optional)</label>
                <input
                  id="repeat-path"
                  value={String(block.content.itemsPath ?? "")}
                  placeholder="line_items — leave empty for a plain group"
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { itemsPath: e.currentTarget.value },
                    })
                  }
                />
              </div>
              <div class="field">
                <label for="repeat-var">Item variable</label>
                <input
                  id="repeat-var"
                  value={String(block.content.itemVar ?? "item")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: { itemVar: e.currentTarget.value },
                    })
                  }
                />
              </div>
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
          ) : null}
        </Collapse>
        <GeometryFields
          blockId={block.id}
          x={block.x}
          y={block.y}
          w={block.w}
          h={block.h}
        />
        <Collapse title="Style" defaultOpen={false}>
          <div class="field">
            <label for="font-size">Font size</label>
            <input
              id="font-size"
              type="number"
              min={10}
              max={72}
              value={block.style.fontSize ?? 14}
              onInput={(e) =>
                updateBlock(block.id, {
                  style: { fontSize: Number(e.currentTarget.value) },
                })
              }
            />
          </div>
          <div class="field">
            <label for="font-color">Color</label>
            <input
              id="font-color"
              type="color"
              value={String(block.style.color ?? "#2a2622")}
              onInput={(e) =>
                updateBlock(block.id, {
                  style: { color: e.currentTarget.value },
                })
              }
            />
          </div>
          <div class="field">
            <label for="text-align">Alignment</label>
            <select
              id="text-align"
              value={block.style.textAlign ?? "left"}
              onChange={(e) =>
                updateBlock(block.id, {
                  style: {
                    textAlign: e.currentTarget.value as
                      | "left"
                      | "center"
                      | "right",
                  },
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div class="field">
            <label for="bg-color">Background</label>
            <input
              id="bg-color"
              type="color"
              value={String(block.style.background ?? "#ffffff")}
              onInput={(e) =>
                updateBlock(block.id, {
                  style: { background: e.currentTarget.value },
                })
              }
            />
          </div>
          <div class="field">
            <label for="opacity">Opacity</label>
            <input
              id="opacity"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={block.style.opacity ?? 1}
              onInput={(e) =>
                updateBlock(block.id, {
                  style: { opacity: Number(e.currentTarget.value) },
                })
              }
            />
          </div>
          <div class="field">
            <label for="padding">Padding</label>
            <input
              id="padding"
              type="number"
              min={0}
              max={48}
              value={block.style.padding ?? 0}
              onInput={(e) =>
                updateBlock(block.id, {
                  style: { padding: Number(e.currentTarget.value) },
                })
              }
            />
          </div>
          <div class="field">
            <label for="border-w">Border width</label>
            <input
              id="border-w"
              type="number"
              min={0}
              max={12}
              value={block.style.borderWidth ?? 0}
              onInput={(e) =>
                updateBlock(block.id, {
                  style: { borderWidth: Number(e.currentTarget.value) },
                })
              }
            />
          </div>
          <div class="field">
            <label for="border-c">Border color</label>
            <input
              id="border-c"
              type="color"
              value={String(block.style.borderColor ?? "#2a2622")}
              onInput={(e) =>
                updateBlock(block.id, {
                  style: { borderColor: e.currentTarget.value },
                })
              }
            />
          </div>
          <div class="field">
            <label for="radius">Corner radius</label>
            <input
              id="radius"
              type="number"
              min={0}
              max={48}
              value={block.style.borderRadius ?? 0}
              onInput={(e) =>
                updateBlock(block.id, {
                  style: { borderRadius: Number(e.currentTarget.value) },
                })
              }
            />
          </div>
        </Collapse>
      </div>
    );
  }

  return <MetadataPanel />;
}
