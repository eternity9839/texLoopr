/** Structured app errors with stable section codes (TL-<SECTION>-NNN). */

export type ErrorSection =
  | "boot"
  | "catalog"
  | "render"
  | "email"
  | "import"
  | "save"
  | "ipc"
  | "data"
  | "ui"
  | "unknown";

/** Well-known codes — keep stable; add new NNN values, do not renumber. */
export const ErrorCodes = {
  BOOT_HYDRATE: "TL-BOOT-001",
  BOOT_PROJECT_LOAD: "TL-BOOT-002",
  CATALOG_SAVE: "TL-CATALOG-001",
  CATALOG_LOAD: "TL-CATALOG-002",
  RENDER_NO_OUTPUT: "TL-RENDER-001",
  RENDER_BATCH: "TL-RENDER-002",
  RENDER_EMPTY: "TL-RENDER-003",
  EMAIL_BUILD: "TL-EMAIL-001",
  IMPORT_PDF: "TL-IMPORT-001",
  IMPORT_JSON: "TL-IMPORT-002",
  SAVE_DOWNLOAD: "TL-SAVE-001",
  IPC_INVOKE: "TL-IPC-001",
  IPC_UNAVAILABLE: "TL-IPC-002",
  DATA_PARSE: "TL-DATA-001",
  DATA_SOURCE: "TL-DATA-002",
  UI_UNEXPECTED: "TL-UI-001",
  UNKNOWN: "TL-UNKNOWN-001",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes] | string;

export interface AppErrorReport {
  /** Opaque instance id (unique per occurrence) */
  id: string;
  /** Stable section code, e.g. TL-RENDER-002 */
  code: ErrorCode;
  section: ErrorSection;
  message: string;
  detail?: string;
  at: number;
}

let seq = 0;

export function sectionFromCode(code: string): ErrorSection {
  const m = /^TL-([A-Z]+)-\d+$/i.exec(code.trim());
  if (!m) return "unknown";
  const s = m[1]!.toLowerCase();
  switch (s) {
    case "boot":
    case "catalog":
    case "render":
    case "email":
    case "import":
    case "save":
    case "ipc":
    case "data":
    case "ui":
      return s;
    default:
      return "unknown";
  }
}

export function createErrorReport(input: {
  code: ErrorCode;
  message: string;
  detail?: string;
  section?: ErrorSection;
  cause?: unknown;
}): AppErrorReport {
  seq += 1;
  const section = input.section ?? sectionFromCode(String(input.code));
  const causeDetail =
    input.detail ??
    (input.cause instanceof Error
      ? input.cause.message
      : input.cause != null
        ? String(input.cause)
        : undefined);
  return {
    id: `err_${Date.now().toString(36)}_${seq}`,
    code: input.code,
    section,
    message: input.message,
    detail: causeDetail,
    at: Date.now(),
  };
}

export function formatErrorForClipboard(err: AppErrorReport): string {
  const lines = [
    `code: ${err.code}`,
    `id: ${err.id}`,
    `section: ${err.section}`,
    `message: ${err.message}`,
  ];
  if (err.detail) lines.push(`detail: ${err.detail}`);
  lines.push(`at: ${new Date(err.at).toISOString()}`);
  return lines.join("\n");
}
