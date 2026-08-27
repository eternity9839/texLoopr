import type { Project } from "./document";
import type { DataRow } from "./bindings";
import { OUTPUT_KIND_LABEL, type OutputKind } from "./workflow";
import { LANGUAGE_ROW_KEYS } from "./documentLanguage";
import { conditionChipValues } from "./documentConditions";

const SUGGEST_CAP = 16;

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= SUGGEST_CAP) break;
  }
  return out;
}

/** Languages seen on rows or project default — not a fixed catalog. */
export function suggestLanguages(
  project: Pick<Project, "language"> | null | undefined,
  rows: DataRow[],
): string[] {
  const found: string[] = [];
  if (project?.language) found.push(String(project.language));
  for (const row of rows) {
    for (const key of LANGUAGE_ROW_KEYS) {
      const v = row[key];
      if (v != null && String(v).trim()) found.push(String(v));
    }
  }
  return uniq(found);
}

/** Output kinds configured on this project (enabled profiles). */
export function suggestOutputs(
  project: Pick<Project, "outputs"> | null | undefined,
): { value: string; label: string }[] {
  const kinds = (project?.outputs ?? [])
    .filter((o) => o.enabled !== false)
    .map((o) => o.kind);
  return uniq(kinds).map((kind) => ({
    value: kind,
    label: OUTPUT_KIND_LABEL[kind as OutputKind] ?? kind,
  }));
}

/**
 * Condition presets for authoring chips — built from project axes,
 * discovered languages, and configured outputs (no static language list).
 */
export function dynamicConditionPresets(
  project: Project | null | undefined,
  rows: DataRow[] = [],
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const cond of project?.conditions ?? []) {
    const key = String(cond.var ?? "").trim();
    if (!key) continue;
    for (const chip of conditionChipValues(cond, rows)) {
      const safe = chip.value.replace(/'/g, "\\'");
      out.push({
        label: `${cond.name || key}: ${chip.label}`,
        value: `vars.${key} == '${safe}'`,
      });
    }
  }
  for (const lang of suggestLanguages(project, rows)) {
    const safe = lang.replace(/'/g, "\\'");
    out.push({
      label: `Language ${lang}`,
      value: `vars.language == '${safe}'`,
    });
  }
  for (const o of suggestOutputs(project)) {
    const safe = o.value.replace(/'/g, "\\'");
    out.push({
      label: `Output ${o.label}`,
      value: `output.kind == '${safe}'`,
    });
  }
  return out;
}
