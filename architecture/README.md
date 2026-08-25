# Architecture

Decision records for texLoopr. Prefer short, dated ADRs over long living docs.

## Layout

| Path | Purpose |
|------|---------|
| [adr/](adr/) | Architecture Decision Records |
| [adr/0000-template.md](adr/0000-template.md) | Copy this for a new decision |

## Conventions

- Number ADRs sequentially: `0001-short-title.md`, `0002-…`
- One decision per file
- Status: `proposed` → `accepted` → `superseded` / `deprecated`
- Link related ADRs when a later decision replaces an earlier one

## Index

| ID | Title | Status |
|----|-------|--------|
| [0001](adr/0001-lightweight-project-model.md) | Lightweight project model as the single source of truth | accepted |
| [0002](adr/0002-studio-information-architecture.md) | Calm document studio information architecture | accepted |
| [0003](adr/0003-pixel-geometry-and-density.md) | Pixel-accurate document geometry and adaptive chrome density | accepted |
| [0004](adr/0004-sqlite-catalog.md) | SQLite catalog for persisted projects | accepted |
| [0005](adr/0005-templating-runtime.md) | Templating runtime — outputs, workflow, conditions, scripts | accepted |
| [0006](adr/0006-edition-chrome-comments-tour.md) | Edition chrome, comments, and guided tour | accepted |
| [0007](adr/0007-navigator-virtualized-outline.md) | Navigator as a dense, virtualized outline | accepted |
| [0008](adr/0008-advanced-templates.md) | Advanced templates — repeaters, filters, prebuild, preview vars | accepted |
