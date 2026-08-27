import type { Block } from "../document";

export const EMAIL_CONTENT_WIDTH = 600;

export interface EmailLayoutItem {
  block: Block;
  /** Left padding inside the 600px column derived from block.x */
  padLeft: number;
  padRight: number;
}

/** Sort visible blocks top-to-bottom, left-to-right for a single-column email. */
export function layoutEmailBlocks(
  blocks: Block[],
  contentWidth = EMAIL_CONTENT_WIDTH,
): EmailLayoutItem[] {
  const sorted = [...blocks].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id),
  );
  return sorted.map((block) => {
    const padLeft = Math.max(0, Math.round(block.x));
    const used = padLeft + Math.round(block.w);
    const padRight = Math.max(0, contentWidth - used);
    return { block, padLeft, padRight };
  });
}
