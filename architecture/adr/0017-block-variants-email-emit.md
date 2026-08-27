# 0017. Block variants and email emit

## Status

Accepted

## Context

Authors duplicated sibling blocks for language × output (ADR 0015). Selecting
Email only switched visibility on the absolute canvas — there was no HTML/EML
path (ADR 0014 follow-up).

## Decision

1. **`Block.variants`** — optional presentation overrides keyed by free-form
   `language` and/or `output` strings (not a fixed catalog). UI suggestions
   come from project data rows, `Project.language`, configured outputs, and
   condition axes. The base block remains the shared identity (logo, fields,
   geometry). At preview/render, the best-matching variant is shallow-merged
   (both axes > language-only > output-only).
2. **Hard hide** still uses `condition` when a block must not appear at all.
3. **Email Preview** — when Preview is on and `output.kind === "email"`, the
   studio shows an HTML email client frame (`buildEmailArtifacts`), not the
   absolute canvas.
4. **Emit** — multipart `.eml` (`text/plain` + `text/html`, CID images when
   data-URIs are present). Generated in TypeScript for web/desktop download;
   Render panel lists Email alongside PDF/Print. Every message includes
   tracing headers: `X-Mailer: texLooper/<version> (<channel>)`,
   `X-TexLooper-Version`, `X-TexLooper-Channel`, `X-TexLooper-Instance-Id`
   (stable install UUID in localStorage), and optional `X-TexLooper-Project-Id`.
5. **PDF / print** — the same correlators are written into PDF Info/XMP via
   Creator=`texLooper`, Producer=`texLooper/<version> (<channel>)`, Identifier=
   instance id, and Keywords mirroring the `X-TexLooper-*` header names.
   The frontend attaches `_texlooperEmit` on the project JSON before render.

## Consequences

- Sibling-condition stacks remain valid for exclusive channels (SMS vs email).
- Prefer variants when the same component should adapt (copy, size, padding)
  across language/output without losing a single Layers identity.
- Rust PDF may still use base presentation until variant resolve is ported;
  email emit is TS-first.
