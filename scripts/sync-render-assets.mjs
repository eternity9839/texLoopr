#!/usr/bin/env node
/**
 * Sync fonts + render-parity manifest for web UI and Rust PDF engine.
 * Run: npm run sync:render-assets
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "assets");
const publicFonts = join(root, "public", "fonts");

/** Keep in sync with `src/model/renderParity.ts` FONT_ASSET_FILES. */
const FONT_MANIFEST = {
  version: 1,
  fonts: {
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
  },
  fontStacks: {
    doc: '"Source Serif 4", Georgia, serif',
    ui: '"Sora", "Segoe UI", sans-serif',
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
    inter: '"Inter", "Segoe UI", sans-serif',
    display: '"Playfair Display", "Source Serif 4", serif',
  },
  styleDefaults: {
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
  },
};

/** @fontsource woff2 → assets/fonts/*.ttf (via wawoff2 when available). */
const FONT_SOURCES = [
  ["@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2", "source-serif-4-latin-400-normal.ttf"],
  ["@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2", "source-serif-4-latin-600-normal.ttf"],
  ["@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff2", "source-serif-4-latin-700-normal.ttf"],
  ["@fontsource/source-serif-4/files/source-serif-4-latin-400-italic.woff2", "source-serif-4-latin-400-italic.ttf"],
  ["@fontsource/source-serif-4/files/source-serif-4-latin-700-italic.woff2", "source-serif-4-latin-700-italic.ttf"],
  ["@fontsource/sora/files/sora-latin-400-normal.woff2", "sora-latin-400-normal.ttf"],
  ["@fontsource/sora/files/sora-latin-600-normal.woff2", "sora-latin-600-normal.ttf"],
  ["@fontsource/sora/files/sora-latin-700-normal.woff2", "sora-latin-700-normal.ttf"],
  ["@fontsource/inter/files/inter-latin-400-normal.woff2", "inter-latin-400-normal.ttf"],
  ["@fontsource/inter/files/inter-latin-600-normal.woff2", "inter-latin-600-normal.ttf"],
  ["@fontsource/inter/files/inter-latin-700-normal.woff2", "inter-latin-700-normal.ttf"],
  ["@fontsource/inter/files/inter-latin-400-italic.woff2", "inter-latin-400-italic.ttf"],
  ["@fontsource/inter/files/inter-latin-700-italic.woff2", "inter-latin-700-italic.ttf"],
  ["@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2", "playfair-display-latin-400-normal.ttf"],
  ["@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff2", "playfair-display-latin-600-normal.ttf"],
  ["@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2", "playfair-display-latin-700-normal.ttf"],
  ["@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff2", "playfair-display-latin-400-italic.ttf"],
  ["@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff2", "playfair-display-latin-700-italic.ttf"],
  ["@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2", "jetbrains-mono-latin-400-normal.ttf"],
  ["@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2", "jetbrains-mono-latin-600-normal.ttf"],
  ["@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2", "jetbrains-mono-latin-700-normal.ttf"],
  ["@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-italic.woff2", "jetbrains-mono-latin-400-italic.ttf"],
  ["@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-italic.woff2", "jetbrains-mono-latin-700-italic.ttf"],
];

async function woff2ToTtf(woff2Bytes) {
  try {
    const { default: wawoff2 } = await import("wawoff2");
    return wawoff2.decompress(woff2Bytes);
  } catch {
    return null;
  }
}

async function syncFonts() {
  mkdirSync(join(assetsDir, "fonts"), { recursive: true });
  mkdirSync(publicFonts, { recursive: true });

  let converted = 0;
  let copied = 0;
  for (const [relSrc, outName] of FONT_SOURCES) {
    const src = join(root, "node_modules", relSrc);
    const assetOut = join(assetsDir, "fonts", outName);
    const publicOut = join(publicFonts, outName);
    if (!existsSync(src)) {
      console.warn(`skip missing font source: ${relSrc}`);
      continue;
    }
    const woff2 = readFileSync(src);
    const ttf = await woff2ToTtf(woff2);
    if (ttf) {
      writeFileSync(assetOut, ttf);
      writeFileSync(publicOut, ttf);
      converted += 1;
    } else {
      copyFileSync(src, assetOut.replace(/\.ttf$/, ".woff2"));
      copyFileSync(src, publicOut.replace(/\.ttf$/, ".woff2"));
      console.warn(`wawoff2 unavailable — copied woff2 for ${outName}`);
    }
    copied += 1;
  }
  console.log(`fonts: ${copied} sources processed (${converted} ttf)`);
}

function writeManifest() {
  const json = `${JSON.stringify(FONT_MANIFEST, null, 2)}\n`;
  const assetPath = join(assetsDir, "render-parity.json");
  const publicPath = join(root, "public", "render-parity.json");
  writeFileSync(assetPath, json);
  writeFileSync(publicPath, json);
  console.log(`wrote ${assetPath}`);
}

await syncFonts();
writeManifest();
