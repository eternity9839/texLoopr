/** Trigger a browser download for raw bytes. */
export function downloadBytes(
  data: Uint8Array,
  filename: string,
  mime = "application/octet-stream",
): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadBase64(
  base64: string,
  filename: string,
  mime = "application/octet-stream",
): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  downloadBytes(bytes, filename, mime);
}

export function mimeForOutputKind(kind: string): string {
  switch (kind) {
    case "pdf":
    case "print":
      return "application/pdf";
    case "image":
      return "image/png";
    case "email":
      return "message/rfc822";
    default:
      return "application/octet-stream";
  }
}
