import { describe, expect, it } from "vitest";
import type { Block, Page, Project } from "./document";
import {
  applyDocumentStylePreset,
  extractTextStyle,
  listTextStyles,
  textStyleFromBlock,
} from "./styleLibrary";

describe("styleLibrary", () => {
  it("extracts typography fields from block style", () => {
    const patch = extractTextStyle({
      fontSize: 24,
      fontWeight: 700,
      color: "#111",
      padding: 12,
      gap: 8,
    });
    expect(patch.fontSize).toBe(24);
    expect(patch.fontWeight).toBe(700);
    expect(patch.color).toBe("#111");
    expect(patch).not.toHaveProperty("padding");
    expect(patch).not.toHaveProperty("gap");
  });

  it("creates text style preset from block", () => {
    const block = {
      id: "b1",
      type: "text",
      name: "Title",
      x: 0,
      y: 0,
      w: 100,
      h: 40,
      content: { text: "Hi" },
      style: { fontSize: 22, fontWeight: 600 },
    } as Block;
    const preset = textStyleFromBlock(block, "Hero");
    expect(preset.name).toBe("Hero");
    expect(preset.style.fontSize).toBe(22);
    expect(preset.id).toBeTruthy();
  });

  it("merges builtins with user text styles", () => {
    const project = {
      textStyles: [{ id: "u1", name: "Brand", style: { fontSize: 16 } }],
    } as Project;
    const all = listTextStyles(project);
    expect(all.some((s) => s.id === "builtin-body")).toBe(true);
    expect(all.some((s) => s.id === "u1")).toBe(true);
  });

  it("applies document style to project and page patches", () => {
    const project = { artboard: "document" } as Project;
    const page = { background: "#fff" } as Page;
    const { projectPatch, pagePatch } = applyDocumentStylePreset(
      { project, page },
      {
        id: "x",
        name: "Test",
        artboard: "a4",
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
        background: "#f5f5f4",
      },
    );
    expect(projectPatch.artboard).toBe("a4");
    expect(pagePatch.background).toBe("#f5f5f4");
    expect(pagePatch.margins?.top).toBe(40);
  });
});
