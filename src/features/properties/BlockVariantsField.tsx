import type { Block } from "../../model/document";
import {
  createEmptyVariant,
  type BlockVariant,
} from "../../model/blockVariants";
import { OUTPUT_KIND_LABEL, type OutputKind } from "../../model/workflow";
import {
  suggestLanguages,
  suggestOutputs,
} from "../../model/variantSuggestions";
import { dataRows, project, updateBlock } from "../../state/store";
import { Field, Section } from "../../ui/controls";

function variantLabel(v: BlockVariant): string {
  const parts: string[] = [];
  if (v.language) parts.push(v.language.toUpperCase());
  if (v.output) {
    parts.push(OUTPUT_KIND_LABEL[v.output as OutputKind] ?? v.output);
  }
  return parts.length ? parts.join(" · ") : "Any";
}

/** Author free-form language×output presentation overrides (suggestions from project/data). */
export function BlockVariantsField({ block }: { block: Block }) {
  const variants = block.variants ?? [];
  const proj = project.value;
  const rows = dataRows.value;
  const langSuggestions = suggestLanguages(proj, rows);
  const outSuggestions = suggestOutputs(proj);

  const setVariants = (next: BlockVariant[]) => {
    updateBlock(block.id, {
      variants: next.length ? next : undefined,
    });
  };

  const patch = (id: string, partial: Partial<BlockVariant>) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, ...partial } : v)),
    );
  };

  const remove = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const add = () => {
    setVariants([
      ...variants,
      createEmptyVariant({
        content: { ...block.content },
      }),
    ]);
  };

  return (
    <Section title="Variants" defaultOpen={variants.length > 0}>
      <p class="prop-hint">
        Same component, different presentation when language and/or output
        match. Values are free-form; suggestions come from your data rows and
        configured outputs (not a fixed catalog).
      </p>
      {variants.map((v) => (
        <div key={v.id} class="block-variant-card">
          <div class="block-variant-card__head">
            <strong>{variantLabel(v)}</strong>
            <button
              type="button"
              class="btn btn--ghost btn--small"
              onClick={() => remove(v.id)}
            >
              Remove
            </button>
          </div>
          <Field
            label="Language"
            forId={`var-lang-${v.id}`}
            hint="Empty = any. e.g. en, fr — pick a suggestion or type your own."
          >
            <input
              id={`var-lang-${v.id}`}
              list={`var-lang-list-${v.id}`}
              placeholder="Any"
              value={v.language ?? ""}
              onInput={(e) => {
                const val = e.currentTarget.value.trim();
                patch(v.id, { language: val || undefined });
              }}
            />
            <datalist id={`var-lang-list-${v.id}`}>
              {langSuggestions.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
          </Field>
          <Field
            label="Output"
            forId={`var-out-${v.id}`}
            hint="Empty = any. Matches output.kind (preview, pdf, email, …)."
          >
            <input
              id={`var-out-${v.id}`}
              list={`var-out-list-${v.id}`}
              placeholder="Any"
              value={v.output ?? ""}
              onInput={(e) => {
                const val = e.currentTarget.value.trim();
                patch(v.id, { output: val || undefined });
              }}
            />
            <datalist id={`var-out-list-${v.id}`}>
              {outSuggestions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </datalist>
          </Field>
          {(block.type === "text" ||
            block.type === "paragraph" ||
            block.type === "data") && (
            <Field label="Text override" forId={`var-text-${v.id}`}>
              <textarea
                id={`var-text-${v.id}`}
                rows={3}
                value={String(
                  v.content?.text ??
                    v.content?.path ??
                    block.content.text ??
                    "",
                )}
                onInput={(e) => {
                  const text = e.currentTarget.value;
                  patch(v.id, {
                    content: {
                      ...(v.content ?? {}),
                      text,
                    },
                  });
                }}
              />
            </Field>
          )}
          <div class="field-row">
            <Field label="W" forId={`var-w-${v.id}`}>
              <input
                id={`var-w-${v.id}`}
                type="number"
                value={v.w ?? ""}
                placeholder={String(block.w)}
                onInput={(e) => {
                  const raw = e.currentTarget.value;
                  patch(v.id, {
                    w: raw === "" ? undefined : Number(raw),
                  });
                }}
              />
            </Field>
            <Field label="H" forId={`var-h-${v.id}`}>
              <input
                id={`var-h-${v.id}`}
                type="number"
                value={v.h ?? ""}
                placeholder={String(block.h)}
                onInput={(e) => {
                  const raw = e.currentTarget.value;
                  patch(v.id, {
                    h: raw === "" ? undefined : Number(raw),
                  });
                }}
              />
            </Field>
          </div>
        </div>
      ))}
      <button type="button" class="btn btn--ghost btn--small" onClick={add}>
        Add variant
      </button>
    </Section>
  );
}
