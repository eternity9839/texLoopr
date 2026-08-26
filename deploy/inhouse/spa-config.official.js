/* Official site profile — point at authenticated API. */
window.__TEXLOOPER__ = {
  profile: "official",
  apiBaseUrl: "https://api.texlooper.example",
  // Prefer injecting apiKey via edge auth / short-lived token in production.
  ephemeral: false,
};
