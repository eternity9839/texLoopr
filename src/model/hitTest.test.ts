import { describe, expect, it } from "vitest";
import { blocksAtPoint, isBackdropBlock } from "./hitTest";
import type { Block } from "./document";

function block(partial: Partial<Block> & Pick<Block, "id">): Block {
  return {
    type: "text",
    name: partial.id,
    x: 0,
    y: 0,
    w: 100,
    h: 40,
    content: {},
    style: {},
    ...partial,
  };
}

describe("hitTest", () => {
  it("returns stacked blocks front-most first", () => {
    const front = block({ id: "front", zIndex: 5, x: 10, y: 10, w: 80, h: 30 });
    const back = block({
      id: "back",
      type: "shape",
      zIndex: 0,
      x: 0,
      y: 0,
      w: 720,
      h: 960,
      content: { shape: "rect" },
    });
    const hits = blocksAtPoint([back, front], 40, 20, 720, 960);
    expect(hits.map((b) => b.id)).toEqual(["front", "back"]);
  });

  it("prefers narrower blocks at the same z-index", () => {
    const rail = block({
      id: "rail",
      type: "shape",
      zIndex: 0,
      x: 0,
      y: 0,
      w: 12,
      h: 960,
      content: { shape: "rect" },
    });
    const wash = block({
      id: "wash",
      type: "shape",
      zIndex: 0,
      x: 0,
      y: 0,
      w: 720,
      h: 200,
      content: { shape: "rect" },
    });
    const hits = blocksAtPoint([wash, rail], 6, 100, 720, 960);
    expect(hits[0]?.id).toBe("rail");
  });

  it("flags large low shapes as backdrops", () => {
    const wash = block({
      id: "wash",
      type: "shape",
      zIndex: 0,
      x: 0,
      y: 0,
      w: 720,
      h: 200,
      content: { shape: "rect" },
    });
    expect(isBackdropBlock(wash, { x: 0, y: 0, w: 720, h: 200 }, 720, 960)).toBe(
      true,
    );
    expect(isBackdropBlock(wash, { x: 0, y: 0, w: 40, h: 40 }, 720, 960)).toBe(
      false,
    );
  });
});
