import { describe, expect, it } from "vitest";
import {
  assertAttachmentSize,
  buildPlaceDraft,
  MAX_ATTACHMENT_BYTES,
  resizeTableCells,
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
});
