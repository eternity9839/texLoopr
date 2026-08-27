# ADR 0018: Custom condition axes (language-analog)

- **Status:** accepted
- **Date:** 2026-08-27
- **Deciders:** project maintainers
- **Related:** [ADR 0015](0015-document-language.md), [ADR 0005](0005-templating-runtime.md), [ADR 0006](0006-edition-chrome-comments-tour.md)

## Context

Block/page `condition` expressions already evaluate against `data.*`, `vars.*`, and `output.kind`. Only **language** had a product layer (row/default resolution, Preview chips, authoring presets). Authors hand-wrote `status == '…'` with no project-declared axis Preview could flip on the **same** output.

## Decision

1. **`Project.conditions[]`** — each entry declares an axis (`name`, `var`, optional `rowKeys`, `default`, pinned `values`).
2. **Resolution** — Preview override → row keys → project default → empty; inject as `vars.<var>` / `env.<var>` in `enrichPreviewContext`.
3. **Preview chrome** — for each axis, chips: **Row** + pinned/discovered values (like former language chips). Output kind chips stay separate (channel modality).
4. **Authoring** — Visibility and page condition UIs offer presets from project axes + language + channel kinds. Meta panel edits axes.
5. **No product enums** — overdue/revoked/etc. live in sample data and expressions, not in the engine.

## Consequences

- Positive: any CSV column can drive scenario Preview; same Page output, different render.
- Trade-offs: authors must declare axes for chip UX; free-form expressions still work without axes.
- Follow-ups: optional migration of language into `conditions[]`; date compare builtins; variant axes beyond language×output.
