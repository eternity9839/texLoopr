/** Tauri desktop — static imports so the release bundle can invoke Rust commands. */
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import { bridgeTauriIpcFromParent, hasTauriIpc } from "../runtimeConfig";
import { ErrorCodes } from "../model/appErrors";
import { log } from "../debug/logger";

export async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  bridgeTauriIpcFromParent();
  if (!hasTauriIpc()) {
    const err = new Error("Tauri invoke is not available in this runtime");
    log.error("ipc", cmd, {
      code: ErrorCodes.IPC_UNAVAILABLE,
      detail: err.message,
    });
    throw err;
  }
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (e) {
    log.error("ipc", cmd, {
      code: ErrorCodes.IPC_INVOKE,
      detail: e instanceof Error ? e.message : String(e),
      data: { cmd },
    });
    throw e;
  }
}

export function listen<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  bridgeTauriIpcFromParent();
  return tauriListen<T>(event, (e) => handler(e.payload));
}

export function isTauriShell(): boolean {
  return hasTauriIpc();
}
