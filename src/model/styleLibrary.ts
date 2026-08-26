import type {
  Block,
  BlockStyle,
  CanvasPresetId,
  Page,
  PageMargins,
  Project,
  Watermark,
} from "./document";
import { createId } from "./document";

/** Typography + fill fields saved in a reusable text style. */
export type TextStylePatch = Partial<
  Pick<
    BlockStyle,
    | "fontSize"
    | "fontWeight"
    | "fontStyle"
    | "textDecoration"
    | "color"
    | "textAlign"
    | "textIndent"
    | "lineHeight"
    | "letterSpacing"
    | "fontFamily"
    | "textTransform"
    | "verticalAlign"
    | "background"
  >
>;

export interface TextStylePreset {
  id: string;
  name: string;
  style: TextStylePatch;
  /** Shipped presets — not persisted in project JSON. */
  builtin?: boolean;
}

export interface DocumentStylePreset {
  id: string;
  name: string;
  artboard?: CanvasPresetId;
  margins?: PageMargins;
  background?: string;
  watermark?: Watermark | null;
  /** Quick swatches (surface + ink + accents). */
  colorPalette?: string[];
  /** Default flex container styling for new groups. */
  groupStyle?: Partial<BlockStyle>;
  builtin?: boolean;
}

export const BUILTIN_TEXT_STYLES: TextStylePreset[] = [
  {
    id: "builtin-h1",
    name: "Heading 1",
    builtin: true,
    style: {
      fontSize: 28,
      fontWeight: 700,
      fontFamily: "display",
      lineHeight: 1.15,
      letterSpacing: -0.5,
      color: "#1a1814",
    },
  },
  {
    id: "builtin-h2",
    name: "Heading 2",
    builtin: true,
    style: {
      fontSize: 20,
      fontWeight: 600,
      fontFamily: "doc",
      lineHeight: 1.25,
      color: "#2a2622",
    },
  },
  {
    id: "builtin-body",
    name: "Body",
    builtin: true,
    style: {
      fontSize: 14,
      fontWeight: 400,
      fontFamily: "doc",
      lineHeight: 1.45,
      color: "#2a2622",
    },
  },
  {
    id: "builtin-caption",
    name: "Caption",
    builtin: true,
    style: {
      fontSize: 12,
      fontWeight: 400,
      fontFamily: "ui",
      lineHeight: 1.35,
      color: "#5c6570",
    },
  },
  {
    id: "builtin-label",
    name: "Label",
    builtin: true,
    style: {
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "ui",
      textTransform: "uppercase",
      letterSpacing: 1.2,
      color: "#5c6570",
    },
  },
];

export const BUILTIN_DOCUMENT_STYLES: DocumentStylePreset[] = [
  {
    id: "builtin-letter",
    name: "US Letter",
    builtin: true,
    artboard: "letter",
    margins: { top: 72, right: 72, bottom: 72, left: 72 },
    background: "#ffffff",
    colorPalette: ["#ffffff", "#1a1814", "#2a2622", "#5c6570", "#1e3a5f"],
    groupStyle: {
      layout: "flex",
      direction: "column",
      gap: 12,
      padding: 0,
    },
  },
  {
    id: "builtin-a4",
    name: "A4 document",
    builtin: true,
    artboard: "a4",
    margins: { top: 56, right: 56, bottom: 56, left: 56 },
    background: "#ffffff",
    colorPalette: ["#ffffff", "#1a1814", "#2f7d5c", "#5c6570", "#f0ebe3"],
    groupStyle: {
      layout: "flex",
      direction: "column",
      gap: 10,
    },
  },
  {
    id: "builtin-mobile",
    name: "Mobile card",
    builtin: true,
    artboard: "mobile",
    margins: { top: 24, right: 20, bottom: 24, left: 20 },
    background: "#f5f5f4",
    colorPalette: ["#f5f5f4", "#ffffff", "#111827", "#0d9488", "#6366f1"],
    groupStyle: {
      layout: "flex",
      direction: "column",
      gap: 16,
      padding: 16,
      borderRadius: 12,
    },
  },
  {
    id: "builtin-ig-post",
    name: "Instagram post",
    builtin: true,
    artboard: "igPost",
    margins: { top: 48, right: 48, bottom: 48, left: 48 },
    background: "#ffffff",
    colorPalette: ["#ffffff", "#000000", "#e1306c", "#833ab4", "#fccc63"],
    groupStyle: { layout: "flex", direction: "column", gap: 16, justify: 24 },
  },
  {
    id: "builtin-yt-thumb",
    name: "YouTube thumbnail",
    builtin: true,
    artboard: "ytThumb",
    margins: { top: 40, right: 48, bottom: 40, left: 48 },
    background: "#0f0f0f",
    colorPalette: ["#0f0f0f", "#ffffff", "#ff0000", "#272727", "#3ea6ff"],
    groupStyle: { layout: "flex", direction: "column", gap: 12, padding: 24 },
  },
];

const TEXT_STYLE_KEYS: (keyof TextStylePatch)[] = [
  "fontSize",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "color",
  "textAlign",
  "textIndent",
  "lineHeight",
  "letterSpacing",
  "fontFamily",
  "textTransform",
  "verticalAlign",
  "background",
];

export function extractTextStyle(style: BlockStyle | undefined): TextStylePatch {
  const out: TextStylePatch = {};
  if (!style) return out;
  for (const key of TEXT_STYLE_KEYS) {
    const v = style[key];
    if (v !== undefined && v !== null && v !== "") {
      (out as Record<string, unknown>)[key] = v;
    }
  }
  return out;
}

export function mergeTextStyles(
  all: TextStylePreset[],
  saved: TextStylePreset[] | undefined,
): TextStylePreset[] {
  const user = (saved ?? []).filter((s) => !s.builtin);
  return [...all.filter((s) => s.builtin), ...user];
}

export function mergeDocumentStyles(
  all: DocumentStylePreset[],
  saved: DocumentStylePreset[] | undefined,
): DocumentStylePreset[] {
  const user = (saved ?? []).filter((s) => !s.builtin);
  return [...all.filter((s) => s.builtin), ...user];
}

export function listTextStyles(project: Project): TextStylePreset[] {
  return mergeTextStyles(BUILTIN_TEXT_STYLES, project.textStyles);
}

export function listDocumentStyles(project: Project): DocumentStylePreset[] {
  return mergeDocumentStyles(BUILTIN_DOCUMENT_STYLES, project.documentStyles);
}

export function findTextStyle(
  project: Project,
  id: string,
): TextStylePreset | undefined {
  return listTextStyles(project).find((s) => s.id === id);
}

export function findDocumentStyle(
  project: Project,
  id: string,
): DocumentStylePreset | undefined {
  return listDocumentStyles(project).find((s) => s.id === id);
}

export function textStyleFromBlock(block: Block, name: string): TextStylePreset {
  return {
    id: createId(),
    name: name.trim() || block.name || "Text style",
    style: extractTextStyle(block.style),
  };
}

function collectPaletteColors(page: Page, max = 8): string[] {
  const seen = new Set<string>();
  const add = (c: string | undefined) => {
    const v = (c ?? "").trim().toLowerCase();
    if (!v || v === "transparent" || seen.has(v)) return;
    seen.add(v);
  };
  add(page.background ?? "#ffffff");
  for (const b of page.blocks) {
    add(b.style.color);
    add(b.style.background);
    add(b.style.borderColor);
    if (seen.size >= max) break;
  }
  return [...seen].slice(0, max);
}

export function documentStyleFromProject(
  project: Project,
  page: Page,
  name: string,
  groupStyle?: Partial<BlockStyle>,
): DocumentStylePreset {
  return {
    id: createId(),
    name: name.trim() || "Document style",
    artboard: project.artboard,
    margins: page.margins ? { ...page.margins } : undefined,
    background: page.background,
    watermark: page.watermark ? { ...page.watermark } : null,
    colorPalette: collectPaletteColors(page),
    groupStyle: groupStyle ? { ...groupStyle } : undefined,
  };
}

export function applyTextStylePatch(
  style: BlockStyle | undefined,
  patch: TextStylePatch,
): BlockStyle {
  return { ...(style ?? {}), ...patch };
}

export type DocumentStyleApplyTarget = {
  project: Project;
  page: Page;
};

export function applyDocumentStylePreset(
  target: DocumentStyleApplyTarget,
  preset: DocumentStylePreset,
): { projectPatch: Partial<Project>; pagePatch: Partial<Page> } {
  const projectPatch: Partial<Project> = {};
  const pagePatch: Partial<Page> = {};

  if (preset.artboard) projectPatch.artboard = preset.artboard;
  if (preset.margins) pagePatch.margins = { ...preset.margins };
  if (preset.background !== undefined) pagePatch.background = preset.background;
  if (preset.watermark !== undefined) {
    pagePatch.watermark =
      preset.watermark === null ? undefined : { ...preset.watermark };
  }

  return { projectPatch, pagePatch };
}
