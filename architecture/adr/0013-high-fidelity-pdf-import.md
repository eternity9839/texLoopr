# ADR 0013: High-fidelity PDF import (later)

- **Status:** proposed
- **Date:** 2026-08-26
- **Deciders:** project maintainers
- **Related:** [ADR 0012](0012-pdf-structure-import.md), [ADR 0009](0009-rust-runtime-backbone.md)

## Context

ADR 0012 recovers a usable block tree from PDFs but does not preserve fonts, line wrapping, nested groups, or vector artwork. Some marketing/print workflows will need closer visual parity.

## Decision (deferred)

When prioritized, implement a **second** Rust import path (not a TS rewrite) that may use pdfium/Skia (or equivalent) to:

- Preserve or approximate fonts and metrics
- Recover wrapped text runs more accurately
- Optionally group related regions
- Still **not** auto-infer merge variables; still prefer placeholders over copying proprietary image assets unless the user opts in

v1 structure import (ADR 0012) remains the default path.

## Consequences

- Positive: clear scope boundary; no blocking of structure import / headless render.
- Trade-offs: dual import paths to maintain; native deps / binary size.
- Follow-ups: product toggle “Structure vs High fidelity”; shared progress event schema.
