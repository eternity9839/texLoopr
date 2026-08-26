import type { Project } from "./document";
import type { DataRow } from "./bindings";
import type { RuntimeContext } from "./expr";

/** Row field names checked (in order) before Project.language. */
export const LANGUAGE_ROW_KEYS = ["language", "lang"] as const;

export const DEFAULT_DOCUMENT_LANGUAGE = "en";

/** Languages offered in Preview override chips and condition presets. */
export const PREVIEW_LANGUAGE_OPTIONS = ["en", "fr", "nl", "de"] as const;
export type PreviewLanguageCode = (typeof PREVIEW_LANGUAGE_OPTIONS)[number];

function normalizeLang(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  return s || null;
}

/**
 * Resolve active document language for merge/conditions.
 * Priority: session override → row `language` | `lang` → Project.language → `"en"`.
 */
export function resolveDocumentLanguage(
  project: Pick<Project, "language"> | null | undefined,
  row?: DataRow | null,
  override?: string | null,
): string {
  const fromOverride = normalizeLang(override);
  if (fromOverride) return fromOverride;
  if (row) {
    for (const key of LANGUAGE_ROW_KEYS) {
      const fromRow = normalizeLang(row[key]);
      if (fromRow) return fromRow;
    }
  }
  const fromProject = normalizeLang(project?.language);
  if (fromProject) return fromProject;
  return DEFAULT_DOCUMENT_LANGUAGE;
}

/** Seed vars.language + env.language on a runtime context. */
export function withLanguageContext(
  ctx: RuntimeContext,
  language: string,
): RuntimeContext {
  const lang = normalizeLang(language) ?? DEFAULT_DOCUMENT_LANGUAGE;
  return {
    ...ctx,
    vars: { ...ctx.vars, language: lang },
    env: { ...ctx.env, language: lang },
  };
}

/** Inject resolved language into an existing context (mutates vars/env). */
export function injectDocumentLanguage(
  ctx: RuntimeContext,
  project: Pick<Project, "language"> | null | undefined,
  row?: DataRow | null,
  override?: string | null,
): RuntimeContext {
  const language = resolveDocumentLanguage(project, row, override);
  ctx.vars = { ...ctx.vars, language };
  ctx.env = { ...ctx.env, language };
  return ctx;
}

/** Shared language condition presets for block/page visibility UI. */
export const LANGUAGE_CONDITION_PRESETS: { label: string; value: string }[] = [
  { label: "Lang EN", value: "vars.language == 'en'" },
  { label: "Lang FR", value: "vars.language == 'fr'" },
  { label: "Lang NL", value: "vars.language == 'nl'" },
  { label: "Lang DE", value: "vars.language == 'de'" },
];
