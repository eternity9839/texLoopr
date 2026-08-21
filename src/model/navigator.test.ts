import { describe, expect, it } from "vitest";
import { buildOutlineRows, sortBlocks } from "../features/tree/DocumentTree";
import type { Block, Page } from "./document";

function block(partial: Partial<Block> & Pick<Block, "id" | "name">): Block {
  return {
    type: "text",
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    content: {},
    style: {},
    zIndex: 0,
    ...partial,
  };
}

describe("sortBlocks", () => {
  const items = [
    block({ id: "1", name: "B", type: "text", zIndex: 1 }),
    block({ id: "2", name: "A", type: "paragraph", zIndex: 5 }),
  ];

  it("sorts by pile z-order descending", () => {
    expect(sortBlocks(items, "z").map((b) => b.id)).toEqual(["2", "1"]);
  });

  it("sorts by name", () => {
    expect(sortBlocks(items, "name").map((b) => b.name)).toEqual(["A", "B"]);
  });
});

describe("buildOutlineRows", () => {
  const pages: Page[] = [
    {
      id: "p1",
      name: "Page 1",
      blocks: Array.from({ length: 100 }, (_, i) =>
        block({ id: `b${i}`, name: `Block ${i}`, zIndex: i }),
      ),
    },
    {
      id: "p2",
      name: "Page 2",
      blocks: [block({ id: "x", name: "Solo" })],
    },
  ];

  it("collapses inactive pages to headers only", () => {
    const rows = buildOutlineRows(pages, { p1: false, p2: false }, "", "document");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.kind === "page")).toBe(true);
  });

  it("expands thousands of siblings as flat rows", () => {
    const many: Page[] = [
      {
        id: "big",
        name: "Big",
        blocks: Array.from({ length: 2500 }, (_, i) =>
          block({ id: `n${i}`, name: `N${i}`, zIndex: i }),
        ),
      },
    ];
    const rows = buildOutlineRows(many, { big: true }, "", "z");
    expect(rows).toHaveLength(2501);
    expect(rows[0].kind).toBe("page");
    expect(rows[1].kind).toBe("block");
    if (rows[1].kind === "block") {
      expect(rows[1].block.zIndex).toBe(2499);
    }
  });

  it("filters by query; page count is full hierarchy size", () => {
    const rows = buildOutlineRows(pages, { p1: true }, "Block 9", "document");
    const pageRow = rows.find((r) => r.kind === "page" && r.page.id === "p1");
    expect(pageRow?.kind === "page" && pageRow.count).toBe(100);
    const blockRows = rows.filter((r) => r.kind === "block");
    expect(blockRows.length).toBe(11); // 9, 90-99
  });
});
