/**
 * Vite production build for the desktop shell.
 * Ensures TAURI_ENV_PLATFORM is set so vite aliases @texlooper/platform to
 * the real Tauri IPC module (not the web stub). `tauri build` already sets
 * this; plain `npm run build:tauri` / cargo rebuilds often do not.
 */
import { spawnSync } from "node:child_process";

if (!process.env.TAURI_ENV_PLATFORM) {
  process.env.TAURI_ENV_PLATFORM =
    process.platform === "win32"
      ? "windows"
      : process.platform === "darwin"
        ? "darwin"
        : "linux";
}

const result = spawnSync("vite", ["build"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
