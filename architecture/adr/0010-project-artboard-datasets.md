# ADR 0010: Project artboard + named datasets

- **Status:** accepted
- **Date:** 2026-08-25
- **Related:** [ADR 0005](0005-templating-runtime.md), [ADR 0008](0008-advanced-templates.md)

## Context

Artboard size lived only in session prefs, so Landscape did not stick to templates. Data was a single session `dataRows` paste box seeded with sample CSV. Bulk docs need portrait/landscape ownership and joins across named tables (e.g. HR → salary).

## Decision

1. **`Project.artboard`** — `CanvasPresetId`; OptionsBar and demo load sync `prefs.canvasPreset`. Align/place use `canvasSizeFromPrefs`.
2. **`Project.datasets`** — named tables with optional `keyField`; `primaryDatasetId` drives the preview row picker / Data studio grid.
3. **`lookup('name', key[, field])`** — sandboxed expr helper; enrichPreviewContext also nests a matched row onto `data.<name>` for `{{salary.amount}}` paths.
4. **Data studio** — empty editable grid by default; sample CSV is opt-in; multi-dataset tabs.

## Consequences

- Landscape/mobile presets are project-owned and demo-loadable.
- Conditions continue to use `output.kind` / CSV fields; no separate renderer per kind yet.
