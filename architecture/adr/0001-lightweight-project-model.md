# ADR 0001: Lightweight project model as the single source of truth

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** project maintainers

## Context

texLoopr spans multiple surfaces (UI, and later API and CLI). Without a shared project representation, each surface tends to invent its own shapes, which makes persistence, import/export, and feature work inconsistent and hard to evolve.

We need one lightweight model that everything builds on so a project is always saved and manageable the same way, regardless of how the user interacts with it.

## Decision

Introduce a **lightweight project model** as the base for all product work.

- The project model is the canonical representation of user work (metadata, pages, blocks, bindings, and related state needed to reproduce a document).
- UI, API, and CLI all read and write this same model (or a versioned serialization of it), not surface-specific schemas.
- The model stays **lightweight**: plain, serializable data (e.g. JSON-friendly), minimal runtime coupling, easy to persist, diff, and validate.
- Storage and transport treat a project as a first-class artifact: save/load, list, and mutate go through this model.

Current in-app starting point lives under `src/model/` (`Project` / `Page` / `Block`); future API and CLI must converge on the same (or explicitly versioned) shape rather than forking it.

## Consequences

- Positive:
  - One mental model across UI, API, and CLI
  - Persistence and interchange stay straightforward (serialize the project)
  - Features can be added against a stable core instead of per-surface ad hoc state
- Negative / trade-offs:
  - UI-only convenience state must stay out of the core model (or be clearly marked ephemeral)
  - Evolving the schema needs versioning/migration discipline once API/CLI exist
- Follow-ups:
  - Document the canonical schema (fields, invariants) next to this ADR or in `src/model/`
  - Define on-disk / wire format versioning when first exposing API or CLI
  - Keep store/commands as adapters over the model, not a second source of truth
