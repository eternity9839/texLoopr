/**
 * Northline brand style pack for demo samples.
 * Seeded onto Project.textStyles / documentStyles (user-tier, not builtins).
 */

import type {
  DocumentStylePreset,
  TextStylePreset,
} from "../../styleLibrary";

/** Core brand inks */
export const NL = {
  ink: "#1c2430",
  inkMuted: "#5c6570",
  inkFaint: "#9aa3ad",
  accent: "#0f6b63",
  accentSoft: "#e6f2f0",
  paper: "#ffffff",
  paperWarm: "#f7f4ef",
  paperCool: "#f2f4f7",
  danger: "#b42318",
  data: "#2f7d5c",
  rule: "#d8dde3",
} as const;

export const NORTHLINE_PALETTE = [
  NL.paper,
  NL.ink,
  NL.inkMuted,
  NL.accent,
  NL.paperWarm,
  NL.data,
];

export function northlineTextStyles(): TextStylePreset[] {
  return [
    {
      id: "nl-display",
      name: "Northline Display",
      style: {
        fontSize: 36,
        fontWeight: 700,
        fontFamily: "display",
        lineHeight: 1.1,
        letterSpacing: -0.8,
        color: NL.ink,
      },
    },
    {
      id: "nl-h1",
      name: "Northline H1",
      style: {
        fontSize: 28,
        fontWeight: 700,
        fontFamily: "display",
        lineHeight: 1.15,
        letterSpacing: -0.5,
        color: NL.ink,
      },
    },
    {
      id: "nl-h2",
      name: "Northline H2",
      style: {
        fontSize: 20,
        fontWeight: 600,
        fontFamily: "doc",
        lineHeight: 1.25,
        color: NL.ink,
      },
    },
    {
      id: "nl-h3",
      name: "Northline H3",
      style: {
        fontSize: 16,
        fontWeight: 600,
        fontFamily: "ui",
        lineHeight: 1.3,
        color: NL.ink,
      },
    },
    {
      id: "nl-lead",
      name: "Northline Lead",
      style: {
        fontSize: 17,
        fontWeight: 400,
        fontFamily: "doc",
        lineHeight: 1.5,
        color: NL.inkMuted,
      },
    },
    {
      id: "nl-body",
      name: "Northline Body",
      style: {
        fontSize: 14,
        fontWeight: 400,
        fontFamily: "doc",
        lineHeight: 1.45,
        color: NL.ink,
      },
    },
    {
      id: "nl-body-tight",
      name: "Northline Body tight",
      style: {
        fontSize: 13,
        fontWeight: 400,
        fontFamily: "doc",
        lineHeight: 1.35,
        color: NL.ink,
      },
    },
    {
      id: "nl-caption",
      name: "Northline Caption",
      style: {
        fontSize: 12,
        fontWeight: 400,
        fontFamily: "ui",
        lineHeight: 1.35,
        color: NL.inkMuted,
      },
    },
    {
      id: "nl-label",
      name: "Northline Label",
      style: {
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "ui",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        color: NL.inkMuted,
      },
    },
    {
      id: "nl-fineprint",
      name: "Northline Fine print",
      style: {
        fontSize: 9,
        fontWeight: 400,
        fontFamily: "ui",
        lineHeight: 1.4,
        color: NL.inkFaint,
      },
    },
    {
      id: "nl-pullquote",
      name: "Northline Pull quote",
      style: {
        fontSize: 18,
        fontWeight: 500,
        fontFamily: "display",
        fontStyle: "italic",
        lineHeight: 1.4,
        color: NL.accent,
      },
    },
    {
      id: "nl-cta",
      name: "Northline CTA",
      style: {
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "ui",
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: NL.paper,
        background: NL.accent,
        textAlign: "center",
      },
    },
    {
      id: "nl-data",
      name: "Northline Data field",
      style: {
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "ui",
        color: NL.data,
      },
    },
    {
      id: "nl-table-header",
      name: "Northline Table header",
      style: {
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "ui",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        color: NL.ink,
        background: NL.accentSoft,
      },
    },
  ];
}

export function northlineDocumentStyles(): DocumentStylePreset[] {
  return [
    {
      id: "nl-doc-letter",
      name: "Northline Letter",
      artboard: "letter",
      margins: { top: 72, right: 72, bottom: 72, left: 72 },
      background: NL.paper,
      colorPalette: [...NORTHLINE_PALETTE],
      groupStyle: {
        layout: "flex",
        direction: "column",
        gap: 12,
      },
    },
    {
      id: "nl-doc-a4",
      name: "Northline A4 brief",
      artboard: "a4",
      margins: { top: 56, right: 56, bottom: 56, left: 56 },
      background: NL.paper,
      colorPalette: [...NORTHLINE_PALETTE],
      groupStyle: { layout: "flex", direction: "column", gap: 10 },
    },
    {
      id: "nl-doc-landscape",
      name: "Northline Landscape deck",
      artboard: "landscape",
      margins: { top: 40, right: 48, bottom: 40, left: 48 },
      background: NL.paper,
      colorPalette: [...NORTHLINE_PALETTE],
      groupStyle: { layout: "flex", direction: "row", gap: 24 },
    },
    {
      id: "nl-doc-a5",
      name: "Northline A5 handout",
      artboard: "a5",
      margins: { top: 40, right: 36, bottom: 40, left: 36 },
      background: NL.paperWarm,
      colorPalette: [...NORTHLINE_PALETTE],
    },
    {
      id: "nl-doc-invite",
      name: "Northline Invitation",
      artboard: "a5",
      margins: { top: 48, right: 40, bottom: 48, left: 40 },
      background: NL.paperWarm,
      watermark: {
        text: "NORTHLINE",
        opacity: 0.06,
        angle: -24,
        layer: "behind",
      },
      colorPalette: [NL.paperWarm, NL.ink, NL.accent, NL.inkMuted, "#c4a574"],
    },
    {
      id: "nl-doc-label",
      name: "Northline Label",
      artboard: "notification",
      margins: { top: 16, right: 16, bottom: 16, left: 16 },
      background: NL.paper,
      colorPalette: [NL.paper, NL.ink, NL.accent, NL.inkMuted],
    },
    {
      id: "nl-doc-social",
      name: "Northline Social post",
      artboard: "igPost",
      margins: { top: 48, right: 48, bottom: 48, left: 48 },
      background: NL.accent,
      colorPalette: [NL.accent, NL.paper, NL.ink, "#c4a574"],
    },
  ];
}

/** Drop into shell(..., extras) for branded samples. */
export function northlineStyleExtras(language = "en"): {
  textStyles: TextStylePreset[];
  documentStyles: DocumentStylePreset[];
  language: string;
} {
  return {
    textStyles: northlineTextStyles(),
    documentStyles: northlineDocumentStyles(),
    language,
  };
}

/** Lookup a text style patch by id (for inlining on demo blocks). */
export function nlText(id: string): TextStylePreset["style"] {
  const found = northlineTextStyles().find((s) => s.id === id);
  return found?.style ?? {};
}
