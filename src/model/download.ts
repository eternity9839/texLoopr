import { hasTauriIpc } from "../runtimeConfig";

function browserDownloadDoc(): Document {
  try {
    if (window.top?.document) return window.top.document;
  } catch {
    /* cross-origin */
  }
  return document;
}

function bytesToBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i += 1) {
    binary += String.fromCharCode(data[i]!);
  }
  return btoa(binary);
}

/**
 * Persist bytes to disk.
 * Desktop: writes to ~/Downloads via Rust (returns absolute path).
 * Browser: triggers a blob download (returns null).
 */
export async function downloadBytes(
  data: Uint8Array,
  filename: string,
  mime = "application/octet-stream",
): Promise<string | null> {
  if (hasTauriIpc()) {
    const { invoke } = await import("../platform/tauri");
    return invoke<string>("save_bytes_cmd", {
      defaultName: filename,
      bytesBase64: bytesToBase64(data),
    });
  }

  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const doc = browserDownloadDoc();
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return null;
}

export async function downloadBase64(
  base64: string,
  filename: string,
  mime = "application/octet-stream",
): Promise<string | null> {
  if (hasTauriIpc()) {
    const { invoke } = await import("../platform/tauri");
    return invoke<string>("save_bytes_cmd", {
      defaultName: filename,
      bytesBase64: base64,
    });
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return downloadBytes(bytes, filename, mime);
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
