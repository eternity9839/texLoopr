/**
 * Local debug logger — file sink only when enabled (dev / debug builds /
 * TEXLOOPER_DEBUG_LOG). Deployed release packages stay silent by default.
 */
import { isDebugFileLoggerEnabled, isEphemeral } from "../runtimeConfig";
import type { ErrorSection } from "../model/appErrors";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  ts: string;
  level: LogLevel;
  section: ErrorSection | "app" | string;
  message: string;
  code?: string;
  id?: string;
  detail?: string;
  data?: Record<string, unknown>;
}

type Listener = (ev: LogEvent) => void;

const buffer: LogEvent[] = [];
const MAX_BUFFER = 500;
const listeners = new Set<Listener>();
let fileSinkReady: boolean | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function push(ev: LogEvent): void {
  buffer.push(ev);
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  for (const l of listeners) {
    try {
      l(ev);
    } catch {
      /* ignore */
    }
  }
  const line =
    ev.level === "error" || ev.level === "warn"
      ? `[texlooper:${ev.level}] ${ev.section} ${ev.code ?? ""} ${ev.message}`
      : `[texlooper:${ev.level}] ${ev.section} ${ev.message}`;
  if (ev.level === "error") console.error(line, ev.detail ?? "", ev.data ?? "");
  else if (ev.level === "warn") console.warn(line, ev.detail ?? "");
  else if (import.meta.env.DEV || ev.level === "info") console.info(line);

  void maybeAppendFile(ev);
}

async function maybeAppendFile(ev: LogEvent): Promise<void> {
  if (isEphemeral()) return;
  if (!isDebugFileLoggerEnabled()) return;
  try {
    const { hasTauriIpc } = await import("../runtimeConfig");
    if (!hasTauriIpc()) return;
    if (fileSinkReady === false) return;
    const { invoke } = await import("../platform/tauri");
    const ok = await invoke<boolean>("append_debug_log", {
      line: JSON.stringify(ev),
    });
    fileSinkReady = ok !== false;
  } catch {
    fileSinkReady = false;
  }
}

export function subscribeLog(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLogBuffer(): readonly LogEvent[] {
  return buffer;
}

export const log = {
  debug(section: LogEvent["section"], message: string, data?: Record<string, unknown>) {
    push({ ts: nowIso(), level: "debug", section, message, data });
  },
  info(section: LogEvent["section"], message: string, data?: Record<string, unknown>) {
    push({ ts: nowIso(), level: "info", section, message, data });
  },
  warn(section: LogEvent["section"], message: string, data?: Record<string, unknown>) {
    push({ ts: nowIso(), level: "warn", section, message, data });
  },
  error(
    section: LogEvent["section"],
    message: string,
    opts?: { code?: string; id?: string; detail?: string; data?: Record<string, unknown> },
  ) {
    push({
      ts: nowIso(),
      level: "error",
      section,
      message,
      code: opts?.code,
      id: opts?.id,
      detail: opts?.detail,
      data: opts?.data,
    });
  },
};
