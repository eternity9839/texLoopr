/** Signature block presentation mode. */
export type SignatureMode = "preset" | "open";

export function parseSignatureMode(raw: unknown): SignatureMode {
  // "prefilled" is the user-facing alias for preset ink + identity.
  if (raw === "preset" || raw === "prefilled") return "preset";
  if (raw === "open") return "open";
  return "open";
}

export function resolveSignatureMode(
  content: Record<string, unknown>,
): SignatureMode {
  const parsed = parseSignatureMode(content.mode);
  if (content.mode === "preset" || content.mode === "prefilled" || content.mode === "open") {
    return parsed;
  }
  const src = String(content.src ?? "").trim();
  return src ? "preset" : "open";
}
