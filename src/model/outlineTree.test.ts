import { describe, expect, it } from "vitest";
import type { Block, Page, Project } from "./document";
import {
  accentForKey,
  blockBindingHint,
  buildOutlineRows,
  expandKeyFormat,
  expandKeyGroup,
  expandKeyPage,
  expandKeyProject,
  extractMergePaths,
  findBlockAncestors,
  isExpanded,
  outlineKinKey,
} from "./outlineTree";
import { defaultOutputs } from "./workflow";

function page(id: string, blocks: Block[]): Page {
  return { id, name: id, blocks };
}

function b(id: string, type: Block["type"] = "text"): Block {
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
  };
}

describe("outlineTree", () => {
  it("builds project → page → nested group children", () => {
    const group: Block = {
      ...b("grp", "group"),
      content: { blocks: [b("child")] },
    };
    const proj: Project = {
      name: "Demo",
      author: "",
      subject: "",
      description: "",
      published: false,
      lastSaved: null,
      activePageId: "p1",
      pages: [page("p1", [group])],
      outputs: defaultOutputs(),
    };
    const expanded = {
      [expandKeyProject()]: true,
      [expandKeyPage("p1")]: true,
      [expandKeyGroup("grp")]: true,
    };
    const rows = buildOutlineRows({ project: proj, expanded });
    expect(rows.some((r) => r.kind === "project")).toBe(true);
    expect(rows.some((r) => r.kind === "page")).toBe(true);
    expect(rows.filter((r) => r.kind === "block").map((r) => r.block.id)).toEqual([
      "grp",
      "child",
    ]);
  });

  it("injects format rows when showFormatsInTree is on", () => {
    const proj: Project = {
      name: "Demo",
      author: "",
      subject: "",
      description: "",
      published: false,
      lastSaved: null,
      activePageId: "p1",
      pages: [page("p1", [b("a")])],
      outputs: defaultOutputs(),
    };
    const expanded = {
      [expandKeyProject()]: true,
      [expandKeyPage("p1")]: true,
      [expandKeyFormat("p1", "out-preview")]: true,
    };
    const rows = buildOutlineRows({
      project: proj,
      expanded,
      showFormatsInTree: true,
    });
    expect(rows.some((r) => r.kind === "format")).toBe(true);
  });

  it("finds block ancestor chain", () => {
    const group: Block = {
      ...b("g", "group"),
      content: { blocks: [b("c")] },
    };
    expect(findBlockAncestors([group], "c").map((a) => a.id)).toEqual(["g"]);
  });

  it("isExpanded respects explicit false", () => {
    expect(isExpanded({ [expandKeyProject()]: false }, expandKeyProject())).toBe(
      false,
    );
  });

  it("extractMergePaths includes table cells, sourcePath, and datasets", () => {
    const table: Block = {
      ...b("t", "table"),
      content: {
        sourcePath: "skus",
        datasetName: "stockists",
        cells: [
          ["SKU", "Price"],
          ["{{sku}}", "{{price|currency:EUR}}"],
        ],
      },
    };
    const paths = extractMergePaths(table);
    expect(paths).toContain("sku");
    expect(paths).toContain("price");
    expect(paths).toContain("skus");
    expect(paths).toContain("dataset:stockists");
  });

  it("blockBindingHint summarizes bindings for Layers dots", () => {
    const text: Block = {
      ...b("x", "text"),
      content: { text: "Hi {{cta}}" },
    };
    expect(blockBindingHint(text)?.label).toContain("cta");
    expect(blockBindingHint(b("plain", "shape"))).toBeNull();
  });

  it("accentForKey is stable and outlineKinKey distinguishes page vs group", () => {
    expect(accentForKey("page:a")).toBe(accentForKey("page:a"));
    expect(accentForKey("page:a")).not.toBe(accentForKey("page:b"));
    expect(outlineKinKey("p1", null)).toBe("page:p1");
    expect(outlineKinKey("p1", "g1")).toBe("group:g1");
  });
});
