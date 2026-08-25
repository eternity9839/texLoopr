import { describe, expect, it } from "vitest";
import { SHAPE_VARIANTS, type ShapeVariant } from "./document";
import { styleFromBlock } from "../features/editor/blocks";
import type { Block } from "./document";

function shapeBlock(
  variant: ShapeVariant,
  style: Block["style"] = {},
): Block {
  return {
    id: "s1",
    type: "shape",
    name: "Shape",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    content: { variant, shape: variant, filled: true },
    style: { background: "#c45c26", ...style },
  };
}

describe("shape forms", () => {
  it("exposes every form in SHAPE_VARIANTS", () => {
    const values = SHAPE_VARIANTS.map((s) => s.value);
    for (const v of [
      "rect",
      "rounded",
      "ellipse",
      "circle",
      "triangle",
      "diamond",
      "line",
    ] as ShapeVariant[]) {
      expect(values).toContain(v);
    }
  });

  it("clips overflow when border radius makes a square into a circle", () => {
    const s = styleFromBlock(
      shapeBlock("rect", { borderRadius: 50, background: "#c45c26" }),
    );
    expect(s.borderRadius).toBe(50);
    expect(s.overflow).toBe("hidden");
  });

  it("leaves overflow unset on sharp rectangles", () => {
    const s = styleFromBlock(shapeBlock("rect", { borderRadius: 0 }));
    expect(s.overflow).toBeUndefined();
  });
});
