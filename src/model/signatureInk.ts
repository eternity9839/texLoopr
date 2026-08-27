function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function looksLikeDemoPlaceholder(src: string): boolean {
  let decoded = src;
  try {
    decoded = decodeURIComponent(src);
  } catch {
    // Keep the original value when a URL contains malformed escapes.
  }
  return /authorized signature|demo[-_/ ]?signature|signature[-_/ ]?placeholder/i.test(
    decoded,
  );
}

export function signatureInkFromName(name: string): string {
  const clean = String(name ?? "").trim();
  if (!clean) return "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="96" viewBox="0 0 480 96"><text x="8" y="68" fill="#1c2430" font-family="cursive" font-size="52" font-style="italic">${escapeXml(clean)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function resolveSignatureInk(opts: {
  mode?: string;
  src?: string;
  caption?: string;
  name?: string;
}): string {
  const src = String(opts.src ?? "").trim();
  const mode = String(opts.mode ?? "").toLowerCase();
  if (mode !== "preset" && mode !== "prefilled") return src;
  if (src && !looksLikeDemoPlaceholder(src)) return src;
  const captionName = String(opts.caption ?? "").split(/\r?\n/, 1)[0]?.trim() ?? "";
  return signatureInkFromName(String(opts.name ?? "").trim() || captionName);
}
