import { describe, expect, it } from "vitest";
import {
  assertAttachmentSize,
  buildPlaceDraft,
  MAX_ATTACHMENT_BYTES,
  MEDIA_SHEET_TOOLS,
  resizeTableCells,
  SHAPE_SHEET_TOOLS,
  TEXT_SHEET_TOOLS,
  TOOL_GROUPS,
} from "./placeTools";

describe("resizeTableCells", () => {
  it("grows and shrinks the matrix", () => {
    const cells = [
      ["A", "B"],
      ["C", "D"],
    ];
    expect(resizeTableCells(cells, 3, 3)).toEqual([
      ["A", "B", "Col 3"],
      ["C", "D", ""],
      ["", "", ""],
    ]);
    expect(resizeTableCells(cells, 1, 1)).toEqual([["A"]]);
  });
});

describe("assertAttachmentSize", () => {
  it("rejects files over 2 MB", () => {
    expect(assertAttachmentSize(MAX_ATTACHMENT_BYTES)).toBeNull();
    expect(assertAttachmentSize(MAX_ATTACHMENT_BYTES + 1)).toMatch(/too large/i);
  });
});

describe("buildPlaceDraft", () => {
  it("centers draft on click and leaves shapes unfilled", () => {
    const d = buildPlaceDraft("shape", null, { x: 100, y: 100 });
    expect(d.content.filled).toBe(false);
    expect(d.style.background).toBe("transparent");
    expect(d.at.x).toBeLessThan(100);
    expect(d.at.y).toBeLessThan(100);
  });

  it("applies heading preset typography", () => {
    const d = buildPlaceDraft("text", "heading1", { x: 0, y: 0 });
    expect(d.name).toBe("Heading 1");
    expect(d.style.fontSize).toBe(28);
  });

  it("styles data field drafts", () => {
    const d = buildPlaceDraft("data", null, { x: 40, y: 40 });
    expect(d.content.path).toBe("field");
    expect(d.style.color).toBe("#2f7d5c");
  });

  it("builds today / fixed / field date presets", () => {
    const today = buildPlaceDraft("date", "date-today", { x: 0, y: 0 });
    expect(today.content.source).toBe("today");
    const fixed = buildPlaceDraft("date", "date-fixed", { x: 0, y: 0 });
    expect(fixed.content.source).toBe("fixed");
    expect(String(fixed.content.fixed)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const field = buildPlaceDraft("date", "date-field", { x: 0, y: 0 });
    expect(field.content.source).toBe("field");
  });

  it("defaults signature and qrcode drafts", () => {
    const sig = buildPlaceDraft("signature", null, { x: 10, y: 10 });
    expect(sig.content.showLine).toBe(true);
    expect(sig.content.mode).toBe("open");
    expect(sig.content.caption).toContain("{{name}}");
    const qr = buildPlaceDraft("qrcode", null, { x: 10, y: 10 });
    expect(qr.content.value).toContain("tracking");
  });

  it("locks aspect for circle shape presets", () => {
    const d = buildPlaceDraft("shape", "circle", { x: 0, y: 0 });
    expect(d.lockAspectRatio).toBe(true);
    expect(d.w).toBe(d.h);
  });
});

describe("toolbox sheet membership", () => {
  it("groups text / shape / media sheets and keeps structure flat", () => {
    expect(TEXT_SHEET_TOOLS.map((t) => t.type)).toEqual([
      "paragraph",
      "text",
      "list",
      "data",
    ]);
    expect(SHAPE_SHEET_TOOLS.every((t) => t.type === "shape")).toBe(true);
    expect(SHAPE_SHEET_TOOLS.some((t) => t.preset === "circle")).toBe(true);
    expect(MEDIA_SHEET_TOOLS.map((t) => t.type)).toEqual(["picture", "files"]);
    expect(TOOL_GROUPS).toEqual([
      {
        id: "structure",
        tools: expect.arrayContaining([
          expect.objectContaining({ type: "table" }),
          expect.objectContaining({ type: "group" }),
        ]),
      },
    ]);
  });
});
