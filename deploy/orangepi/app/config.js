/* Ephemeral hosted demo — same-origin Rust API via Traefik /v1 (ADR 0016). */
window.__TEXLOOPER__ = {
  profile: "ephemeral",
  ephemeral: true,
  // Same origin: Traefik routes /v1 → texlooper-api (Pangolin handles access).
  apiBaseUrl: "/",
};
