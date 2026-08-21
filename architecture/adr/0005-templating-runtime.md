# ADR 0005: Templating runtime — outputs, workflow, conditions, scripts

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** project maintainers
- **Related:** [ADR 0001](0001-lightweight-project-model.md)

## Context

Bulk document generation needs more than `{{field}}` substitution. Authors need:
- Different behaviour per **output** (preview, PDF, print device, API emit)
- **Conditions** driven by data, output, and device
- Ordered **workflows** (bind → filter → script → render → emit)
- Limited **scripting** without shipping a full programming language

## Decision

Extend the project document (ADR 0001) with:

1. **`outputs`** — named profiles (`preview` | `pdf` | `print` | `api` | `image`) with optional device/API config
2. **`workflow`** — ordered steps with optional `when` expressions
3. **`scripts`** — named `expr` or `template` bodies evaluated in a sandboxed expression language
4. **Expression engine** — TypeScript (`src/model/expr.ts`) and Rust (`src-tauri/src/template.rs`); safe comparisons/logic/helpers; **no** arbitrary `eval` / network from scripts. Prefer Rust via Tauri when available (ADR 0009).
5. **Template filters** — `{{name|upper}}`, `{{x|default:y}}`, etc.

Runtime context for conditions/scripts:

```
data.*   row fields
output.* active output profile (id, kind, …)
device.* print/device hints from the output
vars.*   project/catalog variables (injected at run)
env.*    runtime flags (e.g. env.preview)
```

Only the active project document (including these fields) is in memory; catalog persistence unchanged (ADR 0004).

## Consequences

- Positive: one model for UI/CLI/API; output-aware documents; predictable sandbox
- Negative / trade-offs: expression language is intentionally small; keep Rust/JS parity for shared commands
- Follow-ups: real PDF/print drivers and HTTP emit adapters behind `emit` steps; advanced template composition in [ADR 0008](0008-advanced-templates.md); batch `workflow_run_many`
