# ADR 0006: Edition chrome — ribbon, comments, guided tour

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** project maintainers
- **Related:** [ADR 0001](0001-lightweight-project-model.md), [ADR 0002](0002-studio-information-architecture.md)

## Context

Page editing was powerful but opaque: mixed text/icon chrome, no Word-style review, and no Designer-like align/layer actions. New users had no path through the full edition surface.

## Decision

1. **Edit ribbon** — icon-first action groups above the canvas (clipboard, arrange, typography, review, view). Prefer icons with `title` / `aria-label` for primary chrome; keep visible text for menus, forms, and destructive actions.
2. **Comments** — first-class on the project document (`comments[]` anchored to a block). Markers on the page; list in the inspector. Resolve/reopen like a lightweight Word review lane.
3. **Block edit affordances** — `locked`, `zIndex`; align-to-page; bring forward/send backward; duplicate/cut/copy/paste; undo/redo history for discrete edits.
4. **Edition tour** — skippable, step-through coach marks covering toolbox → place → inspect → data → preview → automation → comments → ribbon. Completion stored in `localStorage` (`texloopr.tour.done.v1`); restart from ··· menu.

Ephemeral UI (tour step, clipboard, history) stays out of the serialized project except comments/locks/z-order which travel with the document.

## Consequences

- Positive: dense calm chrome; review workflow; onboarding without docs
- Trade-offs: icons rely on tooltips for first-time discoverability; history is session-local and capped
- Follow-ups: multi-select, threaded replies, collaborative presence
