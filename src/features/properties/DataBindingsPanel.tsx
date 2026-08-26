import { useState } from "preact/hooks";
import {
  selectedBlock,
  selection,
  updateBlock,
  dataRows,
  saveSelectionAsCustomObject,
  project,
} from "../../state/store";
import { dataColumnNames } from "../../model/bindings";
import { defaultRepeatChildren } from "../../model/repeat";
import { getChildBlocks, isContainerBlock } from "../../model/groups";
import { OUTPUT_KINDS, OUTPUT_KIND_LABEL } from "../../model/workflow";
import { LANGUAGE_CONDITION_PRESETS } from "../../model/documentLanguage";
import {
  conditionHasClause,
  toggleConditionClause,
} from "../../model/conditionCompose";
import { LINK_HOOKS, LINK_HOOK_LABEL } from "../../model/linkHook";
import { Field, Section, SelectField } from "../../ui/controls";
import {
  indentedTextToListItems,
  listItemsToIndentedText,
  normalizeListItems,
} from "../../model/listData";

const CONDITION_PRESETS: { label: string; value: string }[] = [
  ...OUTPUT_KINDS.map((kind) => ({
    label: OUTPUT_KIND_LABEL[kind],
    value: `output.kind == '${kind}'`,
  })),
  ...LANGUAGE_CONDITION_PRESETS,
  { label: "Has role", value: "role" },
  { label: "Not empty email", value: "!empty(email)" },
  { label: "Status paid", value: "status == 'paid'" },
];

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
      <Section title="Merge">
        <Field
          label="Condition"
          forId="data-condition"
          hint="Show when true in Edit and Preview. Chips toggle clauses with &&. Use vars.language, output.kind, or CSV fields."
        >
          <input
            id="data-condition"
            placeholder="vars.language == 'fr' && output.kind == 'pdf'"
            value={block.condition ?? ""}
            onInput={(e) => setCondition(e.currentTarget.value)}
          />
        </Field>
        <div class="condition-presets" role="group" aria-label="Condition presets">
          {CONDITION_PRESETS.map((p) => {
            const on = conditionHasClause(block.condition, p.value);
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
                  setCondition(toggleConditionClause(block.condition, p.value))
                }
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            class="condition-presets__btn"
            onClick={() => setCondition("")}
          >
            Clear
          </button>
        </div>
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
          <>
            <Field
              label="Items from"
              forId="data-list-mode"
              hint="Static (Tab-indent for nesting), JSON path, or named dataset."
            >
              <select
                id="data-list-mode"
                value={
                  String(block.content.datasetName ?? "").trim()
                    ? "dataset"
                    : String(block.content.sourcePath ?? "").trim()
                      ? "path"
                      : "static"
                }
                onChange={(e) => {
                  const mode = e.currentTarget.value;
                  if (mode === "static") {
                    updateBlock(block.id, {
                      content: { datasetName: "", sourcePath: "" },
                    });
                  } else if (mode === "path") {
                    updateBlock(block.id, {
                      content: {
                        datasetName: "",
                        sourcePath:
                          String(block.content.sourcePath ?? "").trim() ||
                          "line_items",
                      },
                    });
                  } else {
                    const first = project.value.datasets?.[0]?.name ?? "";
                    updateBlock(block.id, {
                      content: {
                        sourcePath: "",
                        datasetName:
                          String(block.content.datasetName ?? "").trim() ||
                          first,
                      },
                    });
                  }
                }}
              >
                <option value="static">Static items</option>
                <option value="path">Field on row</option>
                <option value="dataset">Named dataset</option>
              </select>
            </Field>
            {String(block.content.datasetName ?? "").trim() ? (
              <SelectField
                id="data-list-dataset"
                label="Dataset"
                value={String(block.content.datasetName ?? "")}
                options={[
                  { value: "", label: "— choose —" },
                  ...(project.value.datasets ?? []).map((d) => ({
                    value: d.name,
                    label: d.name,
                  })),
                ]}
                onChange={(v) =>
                  updateBlock(block.id, {
                    content: { datasetName: v, sourcePath: "" },
                  })
                }
              />
            ) : null}
            {String(block.content.sourcePath ?? "").trim() ? (
              <Field label="Array path" forId="data-list-path">
                <input
                  id="data-list-path"
                  value={String(block.content.sourcePath ?? "")}
                  onInput={(e) =>
                    updateBlock(block.id, {
                      content: {
                        sourcePath: e.currentTarget.value,
                        datasetName: "",
                      },
                    })
                  }
                />
              </Field>
            ) : null}
            {(String(block.content.datasetName ?? "").trim() ||
              String(block.content.sourcePath ?? "").trim()) && (
              <>
                <Field label="Item text" forId="data-list-item-text">
                  <input
                    id="data-list-item-text"
                    value={String(block.content.itemText ?? "{{label}}")}
                    onInput={(e) =>
                      updateBlock(block.id, {
                        content: { itemText: e.currentTarget.value },
                      })
                    }
                  />
                </Field>
                <Field label="Children field" forId="data-list-children">
                  <input
                    id="data-list-children"
                    value={String(block.content.childrenPath ?? "children")}
                    onInput={(e) =>
                      updateBlock(block.id, {
                        content: { childrenPath: e.currentTarget.value },
                      })
                    }
                  />
                </Field>
              </>
            )}
            {!String(block.content.datasetName ?? "").trim() &&
              !String(block.content.sourcePath ?? "").trim() && (
                <Field
                  label="List items (Tab = nest)"
                  forId="data-list"
                >
                  <textarea
                    id="data-list"
                    value={listItemsToIndentedText(
                      normalizeListItems(block.content.items),
                    )}
                    onInput={(e) =>
                      updateBlock(block.id, {
                        content: {
                          items: indentedTextToListItems(e.currentTarget.value),
                        },
                      })
                    }
                  />
                </Field>
              )}
          </>
        )}
      </Section>

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
