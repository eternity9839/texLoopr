import { describe, expect, it } from "vitest";
import type { Block } from "./document";
import {
  effectiveZ,
  findSiblingContext,
  nudgeBlockZOrder,
  sortByEffectiveZ,
  stackIndexAmongSiblings,
} from "./layerStack";

function b(id: string, z?: number, type: Block["type"] = "text"): Block {
  return {
    id,
    type,
    name: id,
    x: 0,
    y: 0,
    w: 40,
    h: 20,
    content: { text: id },
    style: {},
    zIndex: z,
  };
}

describe("layerStack", () => {
  it("uses layerRank when zIndex is missing", () => {
    expect(effectiveZ(b("a", undefined, "shape"))).toBe(0);
    expect(effectiveZ(b("a", undefined, "text"))).toBe(2);
  });

  it("finds siblings inside a group", () => {
    const group: Block = {
      ...b("g", 5, "group"),
      content: {
        blocks: [b("c1", 1), b("c2", 2)],
      },
    };
    const page = [b("a", 1), group, b("b", 3)];
    const ctx = findSiblingContext(page, "c2");
    expect(ctx?.parentId).toBe("g");
    expect(ctx?.siblings.map((s) => s.id)).toEqual(["c1", "c2"]);
  });

  it("brings forward by swapping adjacent z-indices", () => {
    const page = [b("back", 1), b("mid", 2), b("front", 3)];
    const next = nudgeBlockZOrder(page, "mid", "forward")!;
    const ordered = sortByEffectiveZ(next).map((x) => x.id);
    expect(ordered).toEqual(["back", "front", "mid"]);
  });

  it("send to back moves block first in paint order", () => {
    const page = [b("a", 3), b("b", 2), b("c", 1)];
    const next = nudgeBlockZOrder(page, "a", "back")!;
    expect(sortByEffectiveZ(next).map((x) => x.id)).toEqual(["a", "c", "b"]);
  });

  it("reports stack index among siblings", () => {
    const page = [b("a", 1), b("b", 2), b("c", 3)];
    expect(stackIndexAmongSiblings(page, "b")).toEqual({ index: 2, total: 3 });
  });
});
