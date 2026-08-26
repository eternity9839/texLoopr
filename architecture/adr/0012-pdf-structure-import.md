# ADR 0012: PDF structure import (v1)

- **Status:** accepted
- **Date:** 2026-08-26
- **Deciders:** project maintainers
- **Related:** [ADR 0001](0001-lightweight-project-model.md), [ADR 0009](0009-rust-runtime-backbone.md), [ADR 0013](0013-high-fidelity-pdf-import.md)

## Context

Authors often already have a print PDF (invoice, flyer, CV) and want a texLooper project that roughly matches that layout so they can later bind data. Doing OCR, font matching, and full layout recovery in the Preact canvas would be slow and fork behaviour from CLI/API.

## Decision

1. **Rust command** `pdf_import_structure` (path or bytes) returns a new ADR 0001 `Project` JSON plus warnings.
2. **Structure pass only:** one page per PDF page; text → positioned `text`/`paragraph` blocks with **literal** content (no auto-`{{field}}`); image/XObject regions → empty `picture` placeholders (no embedded bitmaps).
3. Geometry uses MediaBox with **pt → CSS px** (`× 96/72`) to align with ADR 0003.
4. Progress is reported via Tauri events `pdf-import-progress` for a thin loading UI; no layout math in TypeScript.
5. Import always creates a **new** project (does not restyle an existing sample).

## Consequences

- Positive: one importer for studio, CLI, and future API; keeps heavy work off the UI thread.
- Trade-offs: approximate placement; multi-column / vector art / forms not recovered.
- Follow-ups: high-fidelity import (ADR 0013); optional user-driven field tagging after import.
