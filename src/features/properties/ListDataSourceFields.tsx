import { project, updateBlock } from "../../state/store";
import type { Block } from "../../model/document";
import { Field, Section, SelectField } from "../../ui/controls";

/** Advanced list binding — dataset, JSON path, item templates. */
export function ListDataSourceFields({
  block,
  idPrefix = "data-list",
}: {
  block: Block & { type: "list" };
  idPrefix?: string;
}) {
  const mode = String(block.content.datasetName ?? "").trim()
    ? "dataset"
    : String(block.content.sourcePath ?? "").trim()
      ? "path"
      : "static";

  return (
    <Section title="Data source" defaultOpen={mode !== "static"}>
      <Field
        label="Items from"
        forId={`${idPrefix}-mode`}
        hint="Static lines, a JSON array on the row, or a named dataset."
      >
        <select
          id={`${idPrefix}-mode`}
          value={mode}
          onChange={(e) => {
            const next = e.currentTarget.value;
            if (next === "static") {
              updateBlock(block.id, {
                content: { datasetName: "", sourcePath: "" },
              });
            } else if (next === "path") {
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
                    String(block.content.datasetName ?? "").trim() || first,
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
          id={`${idPrefix}-dataset`}
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
        <Field label="Array path" forId={`${idPrefix}-path`}>
          <input
            id={`${idPrefix}-path`}
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
          <Field
            label="Item text"
            forId={`${idPrefix}-item-text`}
            hint="Template per row, e.g. {{label}}"
          >
            <input
              id={`${idPrefix}-item-text`}
              value={String(block.content.itemText ?? "{{label}}")}
              onInput={(e) =>
                updateBlock(block.id, {
                  content: { itemText: e.currentTarget.value },
                })
              }
            />
          </Field>
          <Field
            label="Children field"
            forId={`${idPrefix}-children`}
            hint="Nested array field on each row (default: children)"
          >
            <input
              id={`${idPrefix}-children`}
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
    </Section>
  );
}
