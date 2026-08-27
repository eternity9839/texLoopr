# 0015. Document language

## Status

Accepted

## Context

Templates need alternate copy per locale (EN/FR/NL/…) without separate projects.
Conditions already evaluate against `data`, `output`, `vars`, and `env`. Authors need a
stable language signal that works in Edit, Preview, and headless render.

## Decision

1. **Resolve language** in this order: session Preview override → row `language` or
   `lang` → `Project.language` → `"en"`.
2. **Inject** the resolved code as `vars.language` and `env.language` on the runtime
   context (JS and Rust).
3. **Gate** blocks/pages with expressions such as `vars.language == 'fr'`, often
   composed with `output.kind` via `&&`.
4. **Authoring**: Data tab (blocks) and Design → Visibility (pages) use toggle chips
   that compose clauses; Clear wipes the expression.
5. **Preview** exposes Row / EN / FR / NL / DE chips for a session override without
   changing CSV rows.
6. **Edit** can ghost failed-condition branches (`showInactiveBranches`) so stacked
   language/output alternates remain selectable.

## Consequences

- Welcome and wedding-style demos may still use paired siblings at the same geometry.
- Formats tree dimming respects active language as well as output kind.
- Prefer [`Block.variants`](0017-block-variants-email-emit.md) when the same component
  should adapt presentation per language/output without duplicating identity.
