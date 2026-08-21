# ADR 0003: Pixel-accurate document geometry and adaptive chrome density

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** project maintainers
- **Related:** [ADR 0001](0001-lightweight-project-model.md), [ADR 0002](0002-studio-information-architecture.md)

## Context

Block `x/y/w/h` appear in the final rendered output. Fractional or drifted resize values would misalign documents across Preview and future exports. Separately, the studio chrome must stay usable across viewport sizes and user preference without forking layouts.

## Decision

1. **Document geometry** is stored and rendered as **integer CSS pixels**. Resize uses fixed opposite edges with 1px accuracy (`src/model/geometry.ts`). Move may optionally snap to an 8px grid via prefs; **size never snaps**.
2. Exact W/H (and X/Y) are editable in the Inspector as integers.
3. **Adaptive chrome** is driven by the **`density`** preference (`comfortable` | `compact`) plus fluid CSS tokens (`clamp`, container queries on `.app-shell`). Buttons, tool sizes, bar height, and rail widths share the same token set (`--control-h`, `--tool-size`, `--nav-width`, …).
4. **Appearance themes** (`stone` | `nova` | `mist` | `dusk`) swap chrome color tokens via `data-theme` on `.app-shell`. The **document page is always `#ffffff`** (true paper) in every theme so WYSIWYG stays honest; only chrome, board, and edges adapt. Default chrome is `stone`.

## Consequences

- Positive: output-stable block sizes; consistent control sizing across widths; one preference for UI scale; themeable chrome without forking layouts
- Negative / trade-offs: very narrow viewports may hide navigator/inspector (container queries); dusk accent is brighter for dark-chrome contrast
- Follow-ups: export pipelines must consume the same integer geometry
