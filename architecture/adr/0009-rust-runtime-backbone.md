# ADR 0009: Rust runtime backbone

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** project maintainers
- **Related:** [ADR 0004](0004-sqlite-catalog.md), [ADR 0005](0005-templating-runtime.md)

## Context

texLooper must run as a desktop (Tauri), and later mobile / hosted surfaces, with one durable engine for catalog, datasets, templates, and workflows. Keeping heavy logic only in the Preact bundle would fork behaviour per platform and slow batch/CLI paths.

## Decision

1. **Rust is the backbone** for durable and compute-heavy work:
   - SQLite catalog (`catalog_*`)
   - Dataset parse (`data_parse`)
   - Template resolve (`template_resolve`)
   - Workflow run / emit (`workflow_run`)
2. **TypeScript remains** the interactive studio: canvas geometry, undo history, demos, and a **JS fallback** of the same APIs when Tauri is unavailable (web-only Vite).
3. Frontend calls go through `src/model/backend.ts`, which prefers `invoke` and falls back to `src/model/bindings.ts` / `runtime.ts`.
4. Live canvas templating may stay on JS for latency; Automation dry-run and Data apply prefer Rust when present.

## Consequences

- Positive: one engine for desktop / future CLI / mobile; catalog already on disk; web still works without native code
- Trade-offs: keep JS and Rust template/expr parity in tests; canvas may diverge slightly until preview also routes through Rust
- Follow-ups: `workflow_run_many`, filesystem resolve/read, WASM optional for pure-web Rust
