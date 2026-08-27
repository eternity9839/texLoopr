import type { Block } from "../document";

export const EMAIL_CONTENT_WIDTH = 600;
/** Comfortable side inset — never map canvas X into the email column. */
export const EMAIL_SIDE_PAD = 24;

export interface EmailLayoutItem {
  block: Block;
  /** Left padding inside the content column */
  padLeft: number;
  padRight: number;
  /** Gap above this row (from canvas Y deltas, clamped) */
  gapTop: number;
  /** Width used for the inner content cell */
  contentWidth: number;
}

/**
 * Flow layout for email/SMS: sort by canvas position, then stack in a single
 * column. Canvas X/Y are authorship hints only — they must not become huge
 * absolute margins in the HTML message.
 */
export function layoutEmailBlocks(
  blocks: Block[],
  contentWidth = EMAIL_CONTENT_WIDTH,
): EmailLayoutItem[] {
  const sorted = [...blocks].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id),
  );
  if (!sorted.length) return [];

  const side = EMAIL_SIDE_PAD;
  const innerMax = Math.max(120, contentWidth - side * 2);
  let prevBottom = sorted[0].y;

  return sorted.map((block, index) => {
    const gapTop =
      index === 0
        ? 0
        : Math.min(28, Math.max(6, Math.round(block.y - prevBottom)));
    prevBottom = block.y + Math.max(block.h, 1);

    const rawW = Math.round(block.w) || innerMax;
    const contentW = Math.min(rawW, innerMax);
    // Keep intentional right-aligned strips near the right edge when they are
    // narrow; otherwise fill the readable column.
    const alignRight =
      block.style?.textAlign === "right" && contentW < innerMax * 0.55;
    const padLeft = alignRight ? side + (innerMax - contentW) : side;
    const padRight = Math.max(0, contentWidth - padLeft - contentW);

    return {
      block,
      padLeft,
      padRight,
      gapTop,
      contentWidth: contentW,
    };
  });
}
