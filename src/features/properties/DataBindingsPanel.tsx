import { useState } from "preact/hooks";
import {
  selectedBlock,
  selection,
  updateBlock,
  dataRows,
  saveSelectionAsCustomObject,
} from "../../state/store";
import { dataColumnNames } from "../../model/bindings";
import { defaultRepeatChildren } from "../../model/repeat";
import { getChildBlocks, isContainerBlock } from "../../model/groups";
import type { Block } from "../../model/document";
import { LINK_HOOKS, LINK_HOOK_LABEL } from "../../model/linkHook";
import { Field, Section, SelectField } from "../../ui/controls";
import { ListItemsField } from "./ListItemsField";
import { ListDataSourceFields } from "./ListDataSourceFields";
import { VisibilityConditionField } from "./VisibilityConditionField";
import { BlockVariantsField } from "./BlockVariantsField";

/** Inspector Data tab — merge fields, conditions, block content. */
export function DataBindingsPanel() {
  const sel = selection.value;
  const block = selectedBlock.value;
  const [customName, setCustomName] = useState("");
  const cols = dataColumnNames(dataRows.value);

  if (sel?.kind !== "block" || !block) {
    return (
      <div class="panel-pad muted">
        <p class="prop-hint">Select a block to bind merge fields and conditions.</p>
      </div>
    );
  }

  const setCondition = (next: string) =>
    updateBlock(block.id, { condition: next || undefined });

  const listIsStatic =
    block.type === "list" &&
    !String(block.content.datasetName ?? "").trim() &&
    !String(block.content.sourcePath ?? "").trim();

  return (
    <div class="panel-pad" aria-label="Data bindings">
      {isContainerBlock(block) && (
        <Section title="Container">
          <p class="prop-hint">
            {getChildBlocks(block).length} child component
            {getChildBlocks(block).length === 1 ? "" : "s"} — expand the group
            in Layers or double-click on canvas to edit children.
          </p>
        </Section>
      )}
      <Section title="Merge" defaultOpen>
        {block.type === "list" && listIsStatic && (
          <ListItemsField
            id="data-list"
            items={block.content.items}
            onChange={(nodes) =>
              updateBlock(block.id, { content: { items: nodes } })
            }
          />
        )}
        {block.type === "list" && !listIsStatic && (
          <p class="prop-hint">
            Items are loaded from a data source. Edit item templates below or
            switch back to static items. Double-click a row on the canvas to
            edit inline.
          </p>
        )}

        {cols.length === 0 ? (
          <p class="muted prop-hint">Load Data rows to pick merge fields.</p>
        ) : (
          <SelectField
            id={`field-pick-${block.id}`}
            label="Insert field"
            value=""
            options={[
              { value: "", label: "Bind field…" },
              ...cols.map((c) => ({ value: c, label: c })),
            ]}
            onChange={(col) => {
              if (!col) return;
              if (block.type === "data") {
                updateBlock(block.id, { content: { path: col } });
                return;
              }
              if (block.type === "picture" || block.type === "signature") {
                updateBlock(block.id, { content: { src: `{{${col}}}` } });
                return;
              }
              if (block.type === "qrcode") {
                updateBlock(block.id, { content: { value: `{{${col}}}` } });
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
        )}

        {block.type === "data" && (
          <>
            <Field
              label="Field path"
              forId="data-path"
              hint="Merge syntax kept under the hood — preview resolves {{path}}."
            >
              <input
                id="data-path"
                placeholder="company · date|date:short"
                value={String(block.content.path ?? "")}
                onInput={(e) =>
                  updateBlock(block.id, {
                    content: { path: e.currentTarget.value },
                  })
                }
              />
            </Field>
            <p class="muted prop-hint">
              Template:{" "}
              <code>{`{{${String(block.content.path ?? "field").trim() || "field"}}}`}</code>
            </p>
          </>
        )}
        {block.type === "link" && (
          <>
            <SelectField
              id="data-link-hook"
              label="Kind"
              value={String(block.content.hook ?? "url")}
              options={LINK_HOOKS.map((h) => ({
                value: h,
                label: LINK_HOOK_LABEL[h],
              }))}
              onChange={(v) =>
                updateBlock(block.id, { content: { hook: v } })
              }
            />
            <Field label="Target" forId="data-link-target" hint="URL, {{email}}, tel:+1…, #section">
              <input
                id="data-link-target"
                value={String(block.content.target ?? "")}
                onInput={(e) =>
                  updateBlock(block.id, {
                    content: { target: e.currentTarget.value },
                  })
                }
              />
            </Field>
            <Field label="Label" forId="data-link-label">
              <input
                id="data-link-label"
                value={String(block.content.label ?? "")}
                onInput={(e) =>
                  updateBlock(block.id, {
                    content: { label: e.currentTarget.value },
                  })
                }
              />
            </Field>
          </>
        )}
        {"text" in block.content && block.type !== "data" && block.type !== "link" && (
          <Field label="Text" forId="data-text">
            <textarea
              id="data-text"
              value={String(block.content.text ?? "")}
              onInput={(e) =>
                updateBlock(block.id, {
                  content: { text: e.currentTarget.value },
                })
              }
            />
          </Field>
        )}
        {block.type === "picture" && (
          <>
            <Field label="Image URL" forId="data-pic-src">
              <input
                id="data-pic-src"
                value={String(block.content.src ?? "")}
                onInput={(e) =>
                  updateBlock(block.id, {
                    content: { src: e.currentTarget.value },
                  })
                }
              />
            </Field>
            <Field label="Alt text" forId="data-pic-alt">
              <input
                id="data-pic-alt"
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

        {block.type === "list" && (
          <ListDataSourceFields block={block as Block & { type: "list" }} />
        )}
      </Section>

      <VisibilityConditionField
        value={block.condition ?? ""}
        onChange={setCondition}
      />

      <BlockVariantsField block={block} />

      {(block.type === "repeat" || block.type === "group") && (
        <Section title="Group / repeat">
          <Field label="Save as custom object" forId="data-group-save">
            <div class="field-row">
              <input
                id="data-group-save"
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
          <Field label="Repeat items path" forId="data-repeat-path">
            <input
              id="data-repeat-path"
              value={String(block.content.itemsPath ?? "")}
              placeholder="line_items"
              onInput={(e) =>
                updateBlock(block.id, {
                  content: { itemsPath: e.currentTarget.value },
                })
              }
            />
          </Field>
          <Field label="Item variable" forId="data-repeat-var">
            <input
              id="data-repeat-var"
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
        </Section>
      )}
    </div>
  );
}
