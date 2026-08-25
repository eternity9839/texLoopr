import { describe, expect, it } from "vitest";
import type { Block, Page, Project } from "./document";
import {
  buildOutlineRows,
  expandKeyPage,
  expandKeyProject,
  sortBlocksList,
} from "./outlineTree";
import { defaultOutputs } from "./workflow";

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

function projectFromPages(pages: Page[]): Project {
  return {
    name: "Test",
    author: "",
    subject: "",
    description: "",
    published: false,
    lastSaved: null,
    activePageId: pages[0]?.id ?? "p1",
    pages,
    outputs: defaultOutputs(),
  };
}

describe("sortBlocksList", () => {
  const items = [
    block({ id: "1", name: "B", type: "text", zIndex: 1 }),
    block({ id: "2", name: "A", type: "paragraph", zIndex: 5 }),
  ];

  it("sorts by pile z-order descending", () => {
    expect(sortBlocksList(items, "z").map((b) => b.id)).toEqual(["2", "1"]);
  });

  it("sorts by name", () => {
    expect(sortBlocksList(items, "name").map((b) => b.name)).toEqual(["A", "B"]);
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
    const rows = buildOutlineRows({
      project: projectFromPages(pages),
      expanded: {
        [expandKeyProject()]: true,
        [expandKeyPage("p1")]: false,
        [expandKeyPage("p2")]: false,
      },
    });
    expect(rows.filter((r) => r.kind === "page")).toHaveLength(2);
    expect(rows.filter((r) => r.kind === "block")).toHaveLength(0);
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
    const rows = buildOutlineRows({
      project: projectFromPages(many),
      expanded: {
        [expandKeyProject()]: true,
        [expandKeyPage("big")]: true,
      },
      sort: "z",
    });
    expect(rows.length).toBeGreaterThan(2500);
    expect(rows.some((r) => r.kind === "page")).toBe(true);
    const firstBlock = rows.find((r) => r.kind === "block");
    expect(firstBlock?.kind === "block" && firstBlock.block.zIndex).toBe(2499);
  });

  it("filters by query; page count is full hierarchy size", () => {
    const rows = buildOutlineRows({
      project: projectFromPages(pages),
      expanded: {
        [expandKeyProject()]: true,
        [expandKeyPage("p1")]: true,
      },
      query: "Block 9",
    });
    const pageRow = rows.find((r) => r.kind === "page" && r.page.id === "p1");
    expect(pageRow?.kind === "page" && pageRow.count).toBe(100);
    const blockRows = rows.filter((r) => r.kind === "block");
    expect(blockRows.length).toBe(11);
  });
});
