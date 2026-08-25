# ADR 0007: Navigator as a dense, virtualized outline

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** project maintainers
- **Related:** [ADR 0002](0002-studio-information-architecture.md), [ADR 0003](0003-pixel-geometry-and-density.md)

## Context

Pages can accumulate thousands of stacked (“piled”) blocks. A naïve DOM tree that mounts every node becomes unusable. The navigator also felt like a detached panel rather than an embedded outline rail.

## Decision

1. **Embedded outline rail** — flush chrome, compact rows, filter in the rail header; project/pages as collapsible outline nodes.
2. **Lazy expansion** — only expanded pages render their block lists; inactive pages show a count chip until opened.
3. **Windowed block lists** — virtualize block rows (`rowHeight` × visible window + overscan) so thousands of siblings stay O(visible).
4. **Local sort** — document order, z-order (pile), name, or type — without mutating the document model.
5. **Filter** — name/type substring match; matching pages auto-expand for discovery.
6. **Virtual format branches** (optional pref `showFormatsInTree`) — project outputs (Screen, PDF, Email, …) appear as collapsible rows under each surface; block rows grey when `condition` fails for that output kind.
7. **Group twisties** — nested group/repeat children collapse independently; z-order uses sibling-aware swap/normalize in `src/model/layerStack.ts` (page root and group children).

No virtualization library dependency; a small list window in `src/ui/VirtualList.tsx` is enough.

## Consequences

- Positive: scales to large pages; denser studio; searchable outline; multi-output visibility in one tree
- Trade-offs: non-expanded pages hide block DOM (by design); filter is client-side substring only; format branches are virtual (not separate documents per channel)
- Follow-ups: drag-reorder in the outline (partially addressed via ribbon/Design stack controls)
