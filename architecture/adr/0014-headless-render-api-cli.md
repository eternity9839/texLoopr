# ADR 0014: Headless render + API/CLI

- **Status:** accepted
- **Date:** 2026-08-26
- **Deciders:** project maintainers
- **Related:** [ADR 0005](0005-templating-runtime.md), [ADR 0009](0009-rust-runtime-backbone.md), [ADR 0003](0003-pixel-geometry-and-density.md)

## Context

Automation needs “template + data → PDF” without opening the studio. ADR 0005 defined workflow `render`/`emit` but left real drivers as follow-ups. Canvas preview is Preact/CSS and must not become the only render path.

## Decision

1. **Shared Rust** `render_project_pdf(project, row, output?)` walks pages/blocks (conditions + `template_resolve`), places text/shapes via a native PDF writer from block `x/y/w/h` (CSS px → pt), and returns PDF bytes.
2. Surfaces that call the same core:
   - Tauri command `render_project_pdf`
   - Workflow `render` step when `output.kind == "pdf"` (bytes attached on emit payload / result)
   - CLI: `texlooper-cli render` / `import-pdf`
   - Local HTTP: `POST /v1/render` on `127.0.0.1` (no auth in v1; local-only)
3. **Not** Chromium/CSS-parity in v1; if preview and PDF diverge, a later ADR may add HTML/Chromium print.
4. Preact remains the interactive authoring surface; Rust owns durable merge/render/emit (ADR 0009).

## Consequences

- Positive: one engine for desktop, CLI, and API; batch-friendly.
- Trade-offs: PDF layout is an approximation of the canvas; tables/images are simplified.
- Follow-ups: image emit; Chromium parity if required; auth for non-localhost serve.
  Email/EML emit: see [ADR 0017](0017-block-variants-email-emit.md).
