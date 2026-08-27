import { Field, Section } from "../../ui/controls";
import {
  conditionHasClause,
  toggleConditionClause,
} from "../../model/conditionCompose";
import { dynamicConditionPresets } from "../../model/variantSuggestions";
import { dataRows, project } from "../../state/store";

/** Block/page visibility — expression + dynamic condition suggestions. */
export function VisibilityConditionField({
  value,
  onChange,
  id = "data-condition",
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
}) {
  const presets = dynamicConditionPresets(project.value, dataRows.value);

  return (
    <Section title="Visibility" defaultOpen={Boolean(value.trim())}>
      <Field
        label="Condition"
        forId={id}
        hint="Optional. Show when true (e.g. vars.status == 'past_due' && output.kind == 'pdf'). Use project condition axes for Preview chips."
      >
        <input
          id={id}
          placeholder="vars.status == 'open' && output.kind == 'pdf'"
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
        />
      </Field>
      {presets.length > 0 && (
        <div class="condition-presets" role="group" aria-label="Condition presets">
          {presets.map((p) => {
            const on = conditionHasClause(value, p.value);
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
                  onChange(toggleConditionClause(value, p.value) || "")
                }
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            class="condition-presets__btn"
            onClick={() => onChange("")}
          >
            Clear
          </button>
        </div>
      )}
    </Section>
  );
}
