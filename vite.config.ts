import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";
import preact from "@preact/preset-vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.join(rootDir, "package.json"), "utf8"),
) as { version: string };
// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
const isTauriBuild = Boolean(process.env.TAURI_ENV_PLATFORM);

/** webkit2gtk: drop crossorigin on bundled assets (can block CSS/JS apply). */
function stripCrossoriginForTauri(): Plugin {
  return {
    name: "strip-crossorigin-tauri",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(
          /<script([^>]*?) crossorigin(?:="[^"]*")?([^>]*)>/gi,
          "<script$1$2>",
        )
        .replace(
          /<link([^>]*?) crossorigin(?:="[^"]*")?([^>]*)>/gi,
          "<link$1$2>",
        );
    },
  };
}

/** Inline desktop runtime flags; drop nginx config.js in Tauri builds. */
function tauriDesktopHtml(): Plugin {
  return {
    name: "tauri-desktop-html",
    enforce: "post",
    transformIndexHtml(html) {
      if (!isTauriBuild) return html;

      const stripped = html
        .replace(/\s*<script[^>]*src="\.\/config\.js"[^>]*><\/script>/gi, "")
        .replace(/<meta name="viewport"[^>]*>\s*/i, "");

      return stripped
        .replace(
          /<head>/i,
          `<head>
    <script>window.__TEXLOOPER__={profile:"desktop",ephemeral:false};</script>`,
        )
        .replace(/<html lang="en">/i, `<html lang="en" data-shell="desktop">`);
    },
  };
}

export default defineConfig({
  plugins: [preact(), ...(isTauriBuild ? [stripCrossoriginForTauri(), tauriDesktopHtml()] : [])],
  base: isTauriBuild ? "./" : "/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_CHANNEL__: JSON.stringify("alpha"),
  },
  resolve: {
    alias: {
      "@texlooper/platform": path.resolve(
        rootDir,
        isTauriBuild ? "src/platform/tauri.ts" : "src/platform/tauri.stub.ts",
      ),
    },
  },
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_ENV_"],
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  test: {
    environment: "node",
    alias: {
      "@texlooper/platform": path.resolve(rootDir, "src/platform/tauri.stub.ts"),
    },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows"
        ? "chrome105"
        : process.env.TAURI_ENV_PLATFORM
          ? "safari13"
          : undefined,
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
    chunkSizeWarningLimit: isTauriBuild ? 800 : 500,
  },
});
