# ADR 0015: Document language (dataset + conditions)

- **Status:** accepted
- **Date:** 2026-08-26
- **Related:** [ADR 0005](0005-templating-runtime.md), [ADR 0010](0010-project-artboard-datasets.md)

## Context

Bulk templates often need the same layout in several languages. Auto-translation is out of scope. Authors already gate blocks with conditions (`output.kind`, CSV fields). Document language must be dataset-driven, available as a default runtime variable, and work at **block** and **page** level. UI chrome locale (`prefs.locale`) must stay separate.

## Decision

1. **Resolve `language`** (priority): row field `language` or `lang` → `Project.language` → `"en"`. Values are trimmed and lowercased for compares.
2. **Inject** into every preview / workflow / PDF context as `vars.language` and `env.language`.
3. **`Page.condition`** — same expression dialect as `Block.condition`; pages failing the condition are skipped in preview and render (edit mode still shows all pages for authoring).
4. **Authoring** — alternate pages per language, or duplicate blocks / `{{#if vars.language == 'fr'}}` on one page. No automatic translation.
5. **Rich `lookup()` language packs** remain JS-preview-first until Rust datasets land.

## Consequences

- Meta “Language” is the project default; per-row `language`/`lang` overrides for each recipient.
- Conditions like `vars.language == 'fr'` and page-level visibility work in canvas preview and Rust PDF.
- UI language (Settings) never drives document merge or conditions.
