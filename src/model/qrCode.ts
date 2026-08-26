import { renderSVG } from "uqr";

export type QrEcc = "L" | "M" | "Q" | "H";

export function parseQrEcc(raw: unknown): QrEcc {
  if (raw === "L" || raw === "M" || raw === "Q" || raw === "H") return raw;
  return "M";
}

/** Build an SVG data-URL QR for canvas / preview. Empty payload → empty string. */
export function qrDataUrl(
  value: string,
  opts?: { ecc?: QrEcc; dark?: string; light?: string },
): string {
  const payload = value.trim();
  if (!payload) return "";
  try {
    const svg = renderSVG(payload, {
      ecc: opts?.ecc ?? "M",
      border: 1,
      pixelSize: 8,
      blackColor: opts?.dark?.trim() || "#1c2430",
      whiteColor: opts?.light?.trim() || "#ffffff",
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch {
    return "";
  }
}
