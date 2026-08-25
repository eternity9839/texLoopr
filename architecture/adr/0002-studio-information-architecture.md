# ADR 0002: Calm document studio information architecture

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** project maintainers
- **Related:** [ADR 0001](0001-lightweight-project-model.md)

## Context

An early UI exposed seven peer top-level modes (Project, Edition, Page, Data, Preview, Settings, About). That flattened hierarchy made Settings/About compete with primary work, duplicated canvas ownership between Edition and Page, and swapped the left rail between tree and toolbox.

texLooper is a document product. The chrome should read as a calm studio around the project model (ADR 0001), not a prototype tab bar.

Separating Edit and Preview as peer tabs also forced an unnecessary context switch for a mode that is really “the same canvas, resolved against data.”

## Decision

Adopt a **two-view studio** IA:

1. **Edit** — pro layout: **tool palette + Canvas + Inspector**. **Preview** is a toggle on this view (not a top-level tab): same canvas, read-only, with row picker; tools/inspector hide while previewing. Inspector tabs: Layers · Design · Data · Comments · Meta.
2. **Data** — dataset editing as a studio main view (outline navigator + editor)

**Context bar** holds brand, editable project name, save pill, studio switcher (Edit | Data), Preview toggle (when Edit is active), and an overflow menu for **Settings**, **Automation**, **Catalog**, **Edition tour**, and **About** (overlays / coach marks, not peer modes).

**Edit chrome** (ADR 0006): fixed left insert palette, contextual selection bar, inspector stack, status strip.

**Project metadata** lives in the Inspector Meta tab, not as a top-level mode.

Ephemeral UI state (`studioView`, `previewMode`, `overlay`, `activeTool`, selection) stays out of the serialized project model.

## Consequences

- Positive:
  - Clear primary work path (Edit ↔ Data; Preview in place)
  - Stable Edit chrome; preview does not tear down the studio
  - Settings/About demoted from primary navigation
- Negative / trade-offs:
  - Users familiar with a dedicated Preview tab need a short relearn
  - Legacy localStorage `mode` / `studioView: "preview"` values require migration on load
- Follow-ups:
  - Keep store commands as adapters over the project model
  - Optional: keyboard shortcut to toggle preview
