# ADR 0008: Advanced templates — repeaters, filters, prebuild, preview vars

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** project maintainers
- **Related:** [ADR 0005](0005-templating-runtime.md)

## Context

Bulk templates need more than flat `{{field}}` substitution: repeating line items, richer filters, reusable chrome recipes, and preview that reflects script enrichment. Templates remain **projects** (pages/blocks), not a separate demo authoring product.

## Decision

1. **Merge language** — extend filters (`date`, `number`, `currency`, `replace`, `slice`, `pad`, `join`) and support `{{#if expr}}…{{else}}…{{/if}}` (fail-safe: hide branch on error). Nested JSON paths resolve via the same path rules as expressions.
2. **Groups** — selection becomes a `group` block with nested `content.blocks` (subgroups allowed). Optional `itemsPath` / `itemVar` makes a group repeat over a data array (legacy `repeat` type still loads). Outline shows hierarchy depth.
3. **Custom objects** — save a group onto `project.customObjects` (e.g. letterhead) and place from the toolbox.
4. **Prebuild expand-on-place** — recipes in `src/model/prebuild/` expand into ordinary editable blocks when placed (letterhead, address, signature, footer).
5. **Merge-aware media** — picture `src`/`alt`, list items, and table cells run through `resolveTemplate` in preview.
6. **Preview enrichment** — `enrichPreviewContext` runs bind/script workflow steps (skips filter/render/emit) so `vars.*` and script outputs appear on the canvas.
7. **Authoring** — field picker in Properties and context menu inserts `{{column}}` from Data columns.

## Consequences

- Positive: invoices/catalogs expressible; recipes reusable; preview closer to dry-run automation
- Trade-offs: CSV remains flat (repeaters need JSON arrays or a JSON-encoded column); expression language stays sandboxed (no user JS)
- Follow-ups: master page headers, save-as-template catalog, real PDF/print/HTTP emit (ADR 0005)
