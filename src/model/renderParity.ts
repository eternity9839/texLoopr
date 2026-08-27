/**
 * Shared render contract between the web preview and the Rust PDF engine.
 * Keep font paths and style defaults in sync — run `npm run sync:render-assets`.
 */
import type { BlockStyle, FontPreset } from "./document";
import { FONT_STACKS } from "./document";

export const RENDER_PARITY_VERSION = 1;

/** Relative paths from the repo `assets/` root (mirrored under `public/` for the web). */
export type FontAssetSlot = {
  regular: string;
  semibold: string;
  bold: string;
  italic: string;
  boldItalic: string;
};

export const FONT_ASSET_FILES: Record<FontPreset, FontAssetSlot> = {
  doc: {
    regular: "fonts/source-serif-4-latin-400-normal.ttf",
    semibold: "fonts/source-serif-4-latin-600-normal.ttf",
    bold: "fonts/source-serif-4-latin-700-normal.ttf",
    italic: "fonts/source-serif-4-latin-400-italic.ttf",
    boldItalic: "fonts/source-serif-4-latin-700-italic.ttf",
  },
  ui: {
    regular: "fonts/sora-latin-400-normal.ttf",
    semibold: "fonts/sora-latin-600-normal.ttf",
    bold: "fonts/sora-latin-700-normal.ttf",
    italic: "fonts/sora-latin-400-normal.ttf",
    boldItalic: "fonts/sora-latin-700-normal.ttf",
  },
  inter: {
    regular: "fonts/inter-latin-400-normal.ttf",
    semibold: "fonts/inter-latin-600-normal.ttf",
    bold: "fonts/inter-latin-700-normal.ttf",
    italic: "fonts/inter-latin-400-italic.ttf",
    boldItalic: "fonts/inter-latin-700-italic.ttf",
  },
  display: {
    regular: "fonts/playfair-display-latin-400-normal.ttf",
    semibold: "fonts/playfair-display-latin-600-normal.ttf",
    bold: "fonts/playfair-display-latin-700-normal.ttf",
    italic: "fonts/playfair-display-latin-400-italic.ttf",
    boldItalic: "fonts/playfair-display-latin-700-italic.ttf",
  },
  mono: {
    regular: "fonts/jetbrains-mono-latin-400-normal.ttf",
    semibold: "fonts/jetbrains-mono-latin-600-normal.ttf",
    bold: "fonts/jetbrains-mono-latin-700-normal.ttf",
    italic: "fonts/jetbrains-mono-latin-400-italic.ttf",
    boldItalic: "fonts/jetbrains-mono-latin-700-italic.ttf",
  },
};

/** CSS font-family stacks (preview) — PDF uses FONT_ASSET_FILES instead. */
export const FONT_PRESET_STACKS = FONT_STACKS;

/** Default block body styles when fields are unset (matches editor.css + styleFromBlock). */
export const RENDER_STYLE_DEFAULTS: Required<
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
    | "background"
    | "borderRadius"
    | "borderWidth"
    | "opacity"
    | "padding"
    | "listStyle"
    | "fontFamily"
    | "textTransform"
    | "verticalAlign"
    | "whiteSpace"
  >
> = {
  fontSize: 14,
  fontWeight: 400,
  fontStyle: "normal",
  textDecoration: "none",
  color: "#2a2622",
  textAlign: "left",
  textIndent: 0,
  lineHeight: 1.4,
  letterSpacing: 0,
  background: "transparent",
  borderRadius: 0,
  borderWidth: 0,
  opacity: 1,
  padding: 0,
  listStyle: "disc",
  fontFamily: "doc",
  textTransform: "none",
  verticalAlign: "top",
  whiteSpace: "pre-wrap",
};

export type RenderParityManifest = {
  version: number;
  fonts: Record<FontPreset, FontAssetSlot>;
  fontStacks: typeof FONT_STACKS;
  styleDefaults: typeof RENDER_STYLE_DEFAULTS;
};

export function buildRenderParityManifest(): RenderParityManifest {
  return {
    version: RENDER_PARITY_VERSION,
    fonts: FONT_ASSET_FILES,
    fontStacks: FONT_STACKS,
    styleDefaults: RENDER_STYLE_DEFAULTS,
  };
}

/** Public URL prefix for bundled fonts in the Vite app. */
export const PUBLIC_FONT_BASE = "/fonts";

export function publicFontUrl(relativePath: string): string {
  const base = relativePath.replace(/^fonts\//, "");
  return `${PUBLIC_FONT_BASE}/${base}`;
}
