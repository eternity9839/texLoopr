import { describe, expect, it } from "vitest";
import type { Block, BlockStyle } from "./document";
import {
  contrastRatio,
  ensureReadableInk,
  hexLuminance,
  isDarkFill,
  isLightInk,
  isOpaqueFill,
  resolveEditBackdrop,
} from "./contrast";

function block(
  id: string,
  patch: Partial<Block> & { style?: Partial<BlockStyle> },
): Block {
  return {
    id,
    type: patch.type ?? "text",
    name: id,
    x: patch.x ?? 0,
    y: patch.y ?? 0,
    w: patch.w ?? 100,
    h: patch.h ?? 40,
    content: patch.content ?? {},
    style: { ...(patch.style ?? {}) } as BlockStyle,
    zIndex: patch.zIndex,
  };
}

describe("contrast", () => {
  it("detects opaque fills and luminance", () => {
    expect(isOpaqueFill("transparent")).toBe(false);
    expect(isOpaqueFill("#1a2332")).toBe(true);
    expect(hexLuminance("#ffffff")).toBeGreaterThan(0.9);
    expect(hexLuminance("#1a2332")).toBeLessThan(0.2);
    expect(isDarkFill("#1a2332")).toBe(true);
    expect(isDarkFill("#ffffff")).toBe(false);
    expect(isLightInk("#ffffff")).toBe(true);
    expect(isLightInk("#2a2622")).toBe(false);
  });

  it("ensureReadableInk flips when contrast is weak", () => {
    expect(contrastRatio("#2a2622", "#1a2332")!).toBeLessThan(3);
    expect(ensureReadableInk("#2a2622", "#1a2332")).toBe("#f4f7fb");
    expect(ensureReadableInk("#ffffff", "#1a2332")).toBe("#ffffff");
    expect(ensureReadableInk("#c0c0c0", "#ffffff")).toBe("#1c2430");
    // Already readable muted on rail stays
    expect(ensureReadableInk("#9aa4b2", "#1a2332")).toBe("#9aa4b2");
  });

  it("resolveEditBackdrop uses own opaque fill first", () => {
    const cta = block("cta", {
      style: { background: "#0f6b63", color: "#ffffff" },
    });
    expect(resolveEditBackdrop(cta, [cta], "#ffffff")).toBe("#0f6b63");
  });

  it("resolveEditBackdrop finds opaque rail behind transparent text", () => {
    const rail = block("rail", {
      type: "shape",
      x: 0,
      y: 0,
      w: 220,
      h: 960,
      style: { background: "#1a2332" },
      zIndex: 0,
    });
    const contact = block("contact", {
      x: 16,
      y: 160,
      w: 188,
      h: 72,
      style: { color: "#9aa4b2" },
      zIndex: 1,
    });
    expect(resolveEditBackdrop(contact, [rail, contact], "#ffffff")).toBe(
      "#1a2332",
    );
  });

  it("resolveEditBackdrop falls back to page background", () => {
    const text = block("t", { style: { color: "#111" } });
    expect(resolveEditBackdrop(text, [text], "#fbf7ef")).toBe("#fbf7ef");
    expect(resolveEditBackdrop(text, [text], null)).toBe("#ffffff");
  });

  it("resolveEditBackdrop prefers ancestor group fill over page", () => {
    const child = block("child", {
      x: 10,
      y: 10,
      w: 80,
      h: 20,
      style: { color: "#eee" },
    });
    const group = block("grp", {
      type: "group",
      x: 0,
      y: 0,
      w: 200,
      h: 100,
      style: { background: "#0f6b63" },
      content: { blocks: [child] },
    });
    expect(resolveEditBackdrop(child, [group], "#ffffff")).toBe("#0f6b63");
  });
});
