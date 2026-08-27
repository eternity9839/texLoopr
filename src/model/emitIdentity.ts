const INSTALL_ID_KEY = "texlooper.install.id.v1";

/** Reserved project JSON key read by Rust PDF emit (ignored for layout). */
export const EMIT_TRACE_KEY = "_texlooperEmit";

export interface EmitTrace {
  instanceId: string;
  version: string;
  channel: string;
  projectId?: string | null;
}

function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Stable per-browser / per-desktop-profile id for correlating emitted artifacts.
 * Not an authenticated user id.
 */
export function getOrCreateInstallId(
  storage: Pick<Storage, "getItem" | "setItem"> | null = typeof localStorage !==
  "undefined"
    ? localStorage
    : null,
): string {
  if (!storage) return randomUuid();
  try {
    const existing = storage.getItem(INSTALL_ID_KEY)?.trim();
    if (existing) return existing;
    const next = randomUuid();
    storage.setItem(INSTALL_ID_KEY, next);
    return next;
  } catch {
    return randomUuid();
  }
}

export function appVersionLabel(): string {
  try {
    return typeof __APP_VERSION__ === "string" && __APP_VERSION__
      ? __APP_VERSION__
      : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function appChannelLabel(): string {
  try {
    return typeof __APP_CHANNEL__ === "string" && __APP_CHANNEL__
      ? __APP_CHANNEL__
      : "dev";
  } catch {
    return "dev";
  }
}

export function buildEmitTrace(opts?: {
  projectId?: string | null;
  installId?: string;
}): EmitTrace {
  return {
    instanceId: opts?.installId ?? getOrCreateInstallId(),
    version: appVersionLabel(),
    channel: appChannelLabel(),
    projectId: opts?.projectId ?? null,
  };
}

/** Clone a project JSON payload with emit-trace fields for PDF/EML backends. */
export function attachEmitTrace<T extends Record<string, unknown>>(
  project: T,
  opts?: { projectId?: string | null; installId?: string },
): T & { [EMIT_TRACE_KEY]: EmitTrace } {
  return {
    ...project,
    [EMIT_TRACE_KEY]: buildEmitTrace(opts),
  };
}
