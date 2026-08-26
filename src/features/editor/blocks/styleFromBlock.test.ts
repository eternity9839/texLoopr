import { describe, expect, it } from "vitest";
import { styleFromBlock } from "./index";
import type { Block } from "../../../model/document";

function block(style: Block["style"]): Block {
  return {
    id: "b1",
    type: "group",
    name: "G",
    x: 0,
    y: 0,
    w: 200,
    h: 100,
    content: {},
    style,
  };
}

describe("styleFromBlock", () => {
  it("applies padding as CSS for absolute blocks", () => {
    const s = styleFromBlock(block({ padding: 12 }));
    expect(s.padding).toBe(12);
  });

  it("zeros CSS padding when flex layout owns the inset", () => {
    const s = styleFromBlock(block({ layout: "flex", padding: 12 }));
    expect(s.padding).toBe(0);
  });

  it("clips overflow when corners are rounded", () => {
    const s = styleFromBlock(block({ borderRadius: 999, background: "#c45c26" }));
    expect(s.borderRadius).toBe(999);
    expect(s.overflow).toBe("hidden");
  });

  it("rewrites weak ink against dark backdrop when contrast assist is on", () => {
    const s = styleFromBlock(block({ color: "#2a2622" }), {
      contrastAssist: true,
      backdrop: "#1a2332",
    });
    expect(s.color).toBe("#f4f7fb");
  });

  it("leaves authored ink when contrast assist is off", () => {
    const s = styleFromBlock(block({ color: "#2a2622" }), {
      contrastAssist: false,
      backdrop: "#1a2332",
    });
    expect(s.color).toBe("#2a2622");
  });
});
