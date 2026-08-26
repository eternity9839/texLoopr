# ADR 0016: Unified Rust service topologies

- **Status:** accepted
- **Date:** 2026-08-26
- **Related:** [ADR 0009](0009-rust-runtime-backbone.md), [ADR 0014](0014-headless-render-api-cli.md), [ADR 0004](0004-sqlite-catalog.md), [ADR 0011](0011-hosted-demo-deploy.md)

## Context

texLooper must run as a desktop app, official website, in-house deploy, and later mobile/cluster — with one closed-source Rust core for heavy work (render, import/scan, workflow, catalog). JS engine fallbacks are only for local vite demos.

## Decision

1. **`texlooper_lib::api`** — shared handlers for parse, template, workflow, render, render-batch, import-pdf, catalog, runtime info. Tauri `invoke` and HTTP `/v1/*` call the same functions.
2. **Transports**
   - Desktop: Tauri-local (handlers in-process).
   - Official / in-house / mobile: HTTP remote (`apiBaseUrl` + auth).
   - Dev without API: JS fallback (transitional only).
3. **`CatalogStore` trait** — SQLite (desktop/offline) and Postgres (multi-user hosted/in-house). Project JSON remains the document SoT.
4. **Auth** — Loopback binds may run open. Non-loopback requires `TEXLOOPER_API_KEY` (Bearer / `X-Api-Key`). TLS at reverse proxy.
5. **Closed-source packaging** — Private binaries/containers/APKs; in-house and official differ by config (URL, auth, catalog driver), not forks. Ephemeral demo (ADR 0011) stays a stripped profile without catalog persistence.

## Consequences

- Feature checklist for “what belongs in Rust” lives in the architecture plan; studio UX stays Preact.
- Web product builds should prefer HTTP Rust over JS engines.
- Cluster/job queue can reclaim the same `render_batch` handlers later.
