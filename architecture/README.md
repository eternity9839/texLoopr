# Architecture

Decision records for texLooper. Prefer short, dated ADRs over long living docs.

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
| [0009](adr/0009-rust-runtime-backbone.md) | Rust runtime backbone (Tauri catalog + engines) | accepted |
| [0010](adr/0010-project-artboard-datasets.md) | Project artboard + named datasets / lookup | accepted |
| [0011](adr/0011-hosted-demo-deploy.md) | Hosted demo deploy (Pangolin + incremental CI) | accepted |
| [0012](adr/0012-pdf-structure-import.md) | PDF structure import (v1) | accepted |
| [0013](adr/0013-high-fidelity-pdf-import.md) | High-fidelity PDF import (later) | proposed |
| [0014](adr/0014-headless-render-api-cli.md) | Headless render + API/CLI | accepted |
| [0015](adr/0015-document-language.md) | Document language (dataset + conditions) | accepted |
| [0016](adr/0016-unified-rust-service-topologies.md) | Unified Rust service topologies (desktop / web / in-house / cluster) | accepted |
| [0017](adr/0017-block-variants-email-emit.md) | Block variants (language×output) + email/EML emit | accepted |
| [0018](adr/0018-custom-conditions.md) | Custom condition axes (Preview scenarios) | accepted |
