# ADR 0004: SQLite catalog for projects, files, and variables

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** project maintainers
- **Related:** [ADR 0001](0001-lightweight-project-model.md)

## Context

texLooper needs durable management of many projects, attached files, filesystem roots, and configuration (global and per-project). Keeping every project in memory (or only in `localStorage`) does not scale and mixes ephemeral UI state with durable catalog data.

We need flexible storage for:
- Project documents (ADR 0001 JSON)
- Logical files per project
- Named filesystem roots / path aliases
- Key-value variables (global and per-project)

Only the **active** project should live in memory (optionally mirrored to a temp working file). Everything else stays on disk in a queryable store.

## Decision

Use **SQLite** as the local catalog database (bundled via `rusqlite`), stored under the app data directory (`texlooper.db`).

- **Schema domains:** `filesystems`, `projects`, `files`, `variables`, `app_state`
- **Active project:** at most one `projects.is_active = 1`; its document JSON is loaded into the Preact store; inactive projects remain in SQLite only
- **Variables:** `scope = global | project` with JSON values — paths, parameters, feature flags
- **Filesystems:** alias → absolute root path for resolving project-relative paths
- **Web fallback:** same TypeScript catalog API backed by IndexedDB when Tauri is unavailable (dev web), so UI/CLI contracts stay unified

The project **document model** remains ADR 0001 JSON; SQLite indexes and stores it — it does not replace the model.

## Consequences

- Positive: durable multi-project workspace; queryable config; clear active/inactive split; works for future CLI/API against the same DB file
- Negative / trade-offs: schema migrations required; web IndexedDB is a subset (no real FS roots)
- Follow-ups: CLI open/list against `texlooper.db`; optional export of a project folder via a filesystem root
