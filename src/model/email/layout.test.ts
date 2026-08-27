import { describe, expect, it } from "vitest";
import { layoutEmailBlocks, EMAIL_SIDE_PAD } from "./layout";
import type { Block } from "../document";

function blk(partial: Partial<Block> & Pick<Block, "id" | "x" | "y" | "w" | "h">): Block {
  return {
    type: "text",
    name: partial.name ?? partial.id,
    content: { text: "x" },
    style: {},
    ...partial,
  };
}

describe("layoutEmailBlocks", () => {
  it("stacks in flow order without canvas X as huge padding", () => {
    const items = layoutEmailBlocks([
      blk({ id: "a", x: 40, y: 80, w: 520, h: 40 }),
      blk({ id: "b", x: 40, y: 140, w: 520, h: 60 }),
    ]);
    expect(items).toHaveLength(2);
    expect(items[0].padLeft).toBe(EMAIL_SIDE_PAD);
    expect(items[0].contentWidth).toBeLessThanOrEqual(600 - EMAIL_SIDE_PAD * 2);
    expect(items[1].gapTop).toBeGreaterThan(0);
    expect(items[1].gapTop).toBeLessThanOrEqual(28);
  });

  it("does not turn A4 x=400 into a clipped column", () => {
    const items = layoutEmailBlocks([
      blk({ id: "wide", x: 400, y: 0, w: 300, h: 20 }),
    ]);
    expect(items[0].padLeft + items[0].contentWidth).toBeLessThanOrEqual(600);
  });
});
