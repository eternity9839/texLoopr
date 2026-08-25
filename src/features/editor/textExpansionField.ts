import type { JSX } from "preact";
import {
  applyTextExpansion,
  type ExpansionTrigger,
} from "../../model/textExpansions";
import { prefs } from "../../state/store";

function triggerFromKey(key: string): ExpansionTrigger | null {
  if (key === " ") return "space";
  if (key === "Tab") return "tab";
  if (key === "Enter") return "enter";
  return null;
}

/** Attach Emmet-style expansion to a text control (Space / Tab / Enter). */
export function onTextExpansionKeyDown(
  e: JSX.TargetedKeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  onValue: (next: string, cursor: number) => void,
): void {
  if (prefs.value.textExpansionsEnabled === false) return;
  const trigger = triggerFromKey(e.key);
  if (!trigger) return;
  if (trigger === "tab" && e.shiftKey) return;

  const el = e.currentTarget;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;
  if (start !== end) return;

  const value = el.value;
  const applied = applyTextExpansion(value, start, trigger);
  if (!applied) return;

  e.preventDefault();
  onValue(applied.text, applied.cursor);
  queueMicrotask(() => {
    el.setSelectionRange(applied.cursor, applied.cursor);
  });
}
