/* Local / Tauri default — override apiBaseUrl to hit `texlooper-cli serve` (ADR 0016). */
window.__TEXLOOPER__ = {
  profile: "dev",
  ephemeral: false,
  // apiBaseUrl: "http://127.0.0.1:8787",
};
