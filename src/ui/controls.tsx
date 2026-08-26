import { useState } from "preact/hooks";
import { useCallback } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { Icon, type IconName } from "./icons";

/* ------------------------------------------------------------------ */
/* Shared form primitives used by inspector, properties dock & settings */
/* ------------------------------------------------------------------ */

export function Section({
  title,
  children,
  defaultOpen = false,
  actions,
}: {
  title: string;
  children: ComponentChildren;
  defaultOpen?: boolean;
  actions?: ComponentChildren;
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
        <span class="insp-section__end">
          {actions}
          <Icon name={open ? "chevronDown" : "chevronRight"} size={12} />
        </span>
      </button>
      {open && <div class="insp-section__body">{children}</div>}
    </section>
  );
}

export interface FieldProps {
  label: string;
  forId?: string;
  hint?: string;
  compact?: boolean;
  children: ComponentChildren;
}

export function Field({ label, forId, hint, compact, children }: FieldProps) {
  return (
    <div class={compact ? "field field--compact" : "field"}>
      {forId ? (
        <label for={forId}>{label}</label>
      ) : (
        <label>{label}</label>
      )}
      {children}
      {hint && <p class="muted prop-hint">{hint}</p>}
    </div>
  );
}

export function NumField({
  id,
  label,
  value,
  onValue,
  min,
  max,
  step = 1,
  compact,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onValue: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  compact?: boolean;
}) {
  return (
    <Field label={label} forId={id} compact={compact}>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? 0}
        onInput={(e) => {
          const v = Number((e.currentTarget as HTMLInputElement).value);
          if (Number.isFinite(v)) onValue(v);
        }}
      />
    </Field>
  );
}

export function ColorField({
  id,
  label,
  value,
  fallback,
  onValue,
  compact,
}: {
  id: string;
  label: string;
  value: string | undefined;
  fallback: string;
  onValue: (v: string) => void;
  compact?: boolean;
}) {
  return (
    <Field label={label} forId={id} compact={compact}>
      <input
        id={id}
        type="color"
        value={String(value ?? fallback)}
        onInput={(e) => onValue(e.currentTarget.value)}
      />
    </Field>
  );
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  hint,
  compact,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <Field label={label} forId={id} hint={hint} compact={compact}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ComponentChildren;
}) {
  return (
    <label class="prop-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)}
      />{" "}
      {children}
    </label>
  );
}

export interface SegOption<V extends string> {
  value: V;
  icon?: IconName;
  label: string;
}

export function SegmentedControl<V extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: V | undefined;
  options: SegOption<V>[];
  onChange: (v: V) => void;
  ariaLabel: string;
}) {
  return (
    <div class="prop-seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          class="prop-seg__btn"
          title={o.label}
          aria-label={o.label}
          aria-pressed={(value ?? options[0].value) === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.icon ? <Icon name={o.icon} size={13} /> : o.label}
        </button>
      ))}
    </div>
  );
}

/** Two-column grid wrapper for compact field pairs. */
export function Grid2({ children }: { children: ComponentChildren }) {
  return <div class="geo-grid">{children}</div>;
}

export function useNumeric(clampMin?: number): [
  (e: Event) => number | null,
  (v: number) => number,
] {
  const parse = useCallback((e: Event): number | null => {
    const raw = Number((e.currentTarget as HTMLInputElement).value);
    return Number.isFinite(raw) ? raw : null;
  }, []);
  const clamp = useCallback(
    (v: number) => Math.max(clampMin ?? Number.NEGATIVE_INFINITY, v),
    [clampMin],
  );
  return [parse, clamp];
}
