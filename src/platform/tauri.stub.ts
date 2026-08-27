/** Web / HTTP API runtimes — Tauri IPC is unavailable. */
export async function invoke<T>(
  _cmd: string,
  _args?: Record<string, unknown>,
): Promise<T> {
  throw new Error("Tauri invoke is not available in this runtime");
}

export async function listen<T>(
  _event: string,
  _handler: (payload: T) => void,
): Promise<() => void> {
  throw new Error("Tauri events are not available in this runtime");
}

export function isTauriShell(): boolean {
  return false;
}
