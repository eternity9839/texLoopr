import { signal } from "@preact/signals";

export type TextEditSession = {
  blockId: string;
  textareaRef: { current: HTMLTextAreaElement | null };
  value: string;
  onApply: (text: string, start: number, end: number) => void;
  /** Bumped when selection changes so ribbon buttons refresh. */
  tick: number;
};

export const textEditSession = signal<TextEditSession | null>(null);

export function registerTextEditSession(session: TextEditSession): void {
  textEditSession.value = session;
}

export function clearTextEditSession(blockId?: string): void {
  const cur = textEditSession.value;
  if (!cur) return;
  if (blockId && cur.blockId !== blockId) return;
  textEditSession.value = null;
}

export function bumpTextEditSelection(): void {
  const cur = textEditSession.value;
  if (!cur) return;
  textEditSession.value = { ...cur, tick: cur.tick + 1 };
}
