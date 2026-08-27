/** Tauri desktop — static imports so the release bundle can invoke Rust commands. */
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import { bridgeTauriIpcFromParent, hasTauriIpc } from "../runtimeConfig";

export function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  bridgeTauriIpcFromParent();
  return tauriInvoke<T>(cmd, args);
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
