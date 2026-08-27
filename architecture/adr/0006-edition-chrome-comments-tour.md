# ADR 0006: Edition chrome — contextual bar, comments, guided tour

- **Status:** accepted (amended 2026-08-25)
- **Date:** 2026-08-21
- **Deciders:** project maintainers
- **Related:** [ADR 0001](0001-lightweight-project-model.md), [ADR 0002](0002-studio-information-architecture.md)

## Context

Page editing was powerful but opaque: mixed text/icon chrome, no Word-style review, and no Designer-like align/layer actions. Later iterations stacked a full ribbon, floating toolbox, bottom appearance dock, and inspector — starving the canvas.

## Decision

1. **Pro stack (Canva / Photoshop style)** — Edit layout is `tools (44px) | canvas | inspector`. No bottom property dock. Layers live in the inspector, not a second left rail.
2. **Left tool palette** — icon-only insert tools in quiet groups; custom objects open as a side sheet. Prebuild recipes are out of chrome (custom objects / future custom forms). Insert is not duplicated on the ribbon.
3. **Contextual selection bar** — appears only when there is a selection or clipboard: clipboard, group, align, z-order, lock, comments. No insert dropdowns or typography row.
4. **Inspector tabs** — Layers · Design · Data · Comments · Meta. Design owns appearance + geometry + typography; Data owns merge fields and conditions.
5. **Status strip + Appearance menu** — thin bottom bar for grid/snap/rulers; header Appearance (sliders) toggles tools/inspector/status/grid/rulers/comments/margins.
6. **Comments** — first-class on the project (`comments[]` anchored to a block). Markers on the surface; list in the inspector.
7. **Preview kinds** — only **configured channel modalities** on `project.outputs` appear in the Preview toolbar (Screen, Page, Print, Email, SMS, Push, Image). Missing kinds are hidden, not greyed. **API is not an output** (data ingress via HTTP sources). The `pdf` kind is labeled **Page** in chrome.
8. **Edition tour** — skippable coach marks covering palette → place → contextual bar → inspector → data → preview → automation. Completion in `localStorage` (`texlooper.tour.done.v1`).
9. **Terminology** — user-facing chrome says **surface** (print page, email, SMS, push); model may still use `Page`. Condition axes (`Project.conditions`) drive Preview scenario chips like language (ADR 0018).

## Consequences

- Positive: canvas-first chrome; one home per concern; denser pro UI
- Trade-offs: icons rely on tooltips for discoverability; history is session-local and capped
- Follow-ups: threaded replies, collaborative presence
