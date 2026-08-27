import type { Project } from "./document";
import type { DataRow } from "./bindings";
import type { RuntimeContext } from "./expr";
import { createId } from "./document";

/** Declared data axis for Preview chips + vars.* injection (ADR 0018). */
export interface ProjectCondition {
  id: string;
  /** UI label, e.g. Status */
  name: string;
  /** Injected as vars.<var> */
  var: string;
  /** Row fields to read (default [var]) */
  rowKeys?: string[];
  /** Project default when row empty and no override */
  default?: string;
  /** Optional pinned chip values */
  values?: { label: string; value: string }[];
}

export type ConditionOverrides = Record<string, string | null | undefined>;

function normalizeValue(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

export function conditionRowKeys(cond: ProjectCondition): string[] {
  if (cond.rowKeys?.length) return cond.rowKeys;
  return [cond.var];
}

/**
 * Resolve one axis: Preview override → row keys → project default → "".
 * Pass `override` as `undefined` to skip the override tier (follow row).
 * Pass `null` or a string to force that override (null clears to empty only if
 * we treat null as "use row" — callers use null for Row chip = no override).
 */
export function resolveConditionValue(
  cond: ProjectCondition,
  row?: DataRow | null,
  override?: string | null,
): string {
  // undefined = no session override; null or string = session override map entry
  // Callers pass null when Row is selected (no override key / cleared).
  if (typeof override === "string") {
    const fromOverride = normalizeValue(override);
    if (fromOverride != null) return fromOverride;
  }
  if (row) {
    for (const key of conditionRowKeys(cond)) {
      const fromRow = normalizeValue(row[key]);
      if (fromRow != null) return fromRow;
    }
  }
  const fromDefault = normalizeValue(cond.default);
  if (fromDefault != null) return fromDefault;
  return "";
}

/** Inject all project condition axes into vars (and env mirrors). */
export function injectProjectConditions(
  ctx: RuntimeContext,
  project: Pick<Project, "conditions"> | null | undefined,
  row?: DataRow | null,
  overrides?: ConditionOverrides | null,
): RuntimeContext {
  const list = project?.conditions ?? [];
  if (!list.length) return ctx;
  const vars = { ...ctx.vars };
  const env = { ...ctx.env };
  for (const cond of list) {
    const key = String(cond.var ?? "").trim();
    if (!key) continue;
    const ov = overrides?.[cond.id] ?? overrides?.[key];
    const value = resolveConditionValue(
      cond,
      row,
      typeof ov === "string" ? ov : undefined,
    );
    vars[key] = value;
    env[key] = value;
  }
  ctx.vars = vars;
  ctx.env = env;
  return ctx;
}

/** Distinct non-empty values from rows for chip discovery (capped). */
export function discoverConditionValues(
  cond: ProjectCondition,
  rows: DataRow[],
  cap = 8,
): string[] {
  const keys = conditionRowKeys(cond);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    for (const key of keys) {
      const v = normalizeValue(row[key]);
      if (v == null || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
      if (out.length >= cap) return out;
    }
  }
  return out;
}

/** Chip labels: pinned values first, then discovered. */
export function conditionChipValues(
  cond: ProjectCondition,
  rows: DataRow[],
  cap = 8,
): { label: string; value: string }[] {
  const pinned = cond.values?.filter((v) => normalizeValue(v.value)) ?? [];
  const pinnedSet = new Set(pinned.map((v) => v.value));
  const discovered = discoverConditionValues(cond, rows, cap).filter(
    (v) => !pinnedSet.has(v),
  );
  const rest = discovered.map((v) => ({ label: v, value: v }));
  return [...pinned, ...rest].slice(0, cap);
}

/** Presets for Visibility / page condition chips. */
export function conditionPresetsFromProject(
  project: Pick<Project, "conditions"> | null | undefined,
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const cond of project?.conditions ?? []) {
    const key = String(cond.var ?? "").trim();
    if (!key) continue;
    const vals =
      cond.values?.length ?
        cond.values
      : (cond.default ? [{ label: cond.default, value: cond.default }] : []);
    for (const v of vals) {
      const value = normalizeValue(v.value);
      if (!value) continue;
      const safe = value.replace(/'/g, "\\'");
      out.push({
        label: `${cond.name || key}: ${v.label || value}`,
        value: `vars.${key} == '${safe}'`,
      });
    }
  }
  return out;
}

export function createProjectCondition(
  partial?: Partial<ProjectCondition>,
): ProjectCondition {
  const name = partial?.name ?? "Status";
  const fromName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const varName = partial?.var ?? (fromName || "status");
  return {
    id: partial?.id ?? createId(),
    name,
    var: varName,
    rowKeys: partial?.rowKeys,
    default: partial?.default,
    values: partial?.values,
  };
}
