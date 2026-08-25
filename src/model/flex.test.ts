import { describe, expect, it } from "vitest";
import { Block } from "./document";
import { computeFlexRects } from "./flex";

function group(style: Record<string, unknown>, kids: Array<Partial<Block>>) {
  return {
    id: "g",
    type: "group",
    name: "G",
    x: 0,
    y: 0,
    w: 200,
    h: 300,
    content: { blocks: kids.map((k, i) => ({ id: `c${i}`, ...k })) },
    style,
  } as unknown as Block;
}

const kid = {
  type: "text" as const,
  name: "t",
  x: 0,
  y: 0,
  w: 100,
  h: 40,
};

describe("computeFlexRects", () => {
  it("returns empty unless flex layout is active", () => {
    expect(computeFlexRects(group({}, [kid])).size).toBe(0);
    expect(
      computeFlexRects(group({ layout: "absolute" }, [kid])).size,
    ).toBe(0);
  });

  it("stacks children vertically from the top by default", () => {
    const rects = computeFlexRects(
      group({ layout: "flex", padding: 10 }, [
        { ...kid },
        { ...kid },
        { ...kid },
      ]),
    );
    const a = rects.get("c0")!;
    const b = rects.get("c1")!;
    expect(a.y).toBe(10);
    expect(b.y).toBe(50);
    expect(a.x).toBe(10);
  });

  it("stretch fills the cross axis", () => {
    const r = computeFlexRects(
      group({ layout: "flex", padding: 10 }, [{ ...kid }]),
    ).get("c0")!;
    expect(r.w).toBe(180);
  });

  it("center + center centers a single child", () => {
    const r = computeFlexRects(
      group({ layout: "flex", direction: "row", justify: "center", alignItems: "center" }, [
        { ...kid },
      ]),
    ).get("c0")!;
    // main axis (x): free = 200-100 → 50 ; cross (y): (300-40)/2 = 130
    expect(r.x).toBeCloseTo(50, 5);
    expect(r.y).toBeCloseTo(130, 5);
  });

  it("space-between spreads children across the main axis", () => {
    const rects = computeFlexRects(
      group({ layout: "flex", direction: "row", justify: "space-between" }, [
        { ...kid },
        { ...kid },
        { ...kid },
      ]),
    );
    // free = 200-300 <0? No: extents sum=300 > 200 → free clamped to 0,
    // children overflow to the right in order.
    const xs = [...rects.values()].map((r) => r.x);
    expect(xs).toEqual([0, 100, 200]);
  });

  it("honours gap between children", () => {
    const rects = computeFlexRects(
      group({ layout: "flex", gap: 12 }, [{ ...kid }, { ...kid }]),
    );
    expect(rects.get("c1")!.y).toBe(52);
  });

  it("end alignment pushes children to the far edge", () => {
    const r = computeFlexRects(
      group({ layout: "flex", alignItems: "end" }, [{ ...kid }]),
    ).get("c0")!;
    expect(r.x).toBe(200 - 100); // cross axis = width in column mode
  });
});
