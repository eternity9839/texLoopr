import { describe, expect, it } from "vitest";
import { flattenBlocksForPreview, defaultRepeatChildren } from "./repeat";
import type { Block } from "./document";
import { createId } from "./document";
import { enrichPreviewContext, previewContext } from "./runtime";
import { createEmptyProject } from "./document";
import { defaultOutputs } from "./workflow";

describe("flattenBlocksForPreview", () => {
  it("expands repeat children per array item", () => {
    const children = defaultRepeatChildren();
    const repeat: Block = {
      id: createId(),
      type: "repeat",
      name: "Lines",
      x: 10,
      y: 20,
      w: 400,
      h: 40,
      content: {
        itemsPath: "line_items",
        itemVar: "item",
        blocks: children,
      },
      style: {},
    };
    const ctx = previewContext(
      {
        line_items: [
          { description: "A", amount: 10 },
          { description: "B", amount: 20 },
        ],
      },
      defaultOutputs()[0],
    );
    const { blocks, itemContexts } = flattenBlocksForPreview(
      [repeat],
      {
        line_items: [
          { description: "A", amount: 10 },
          { description: "B", amount: 20 },
        ],
      },
      ctx,
    );
    expect(blocks).toHaveLength(children.length * 2);
    expect(itemContexts.size).toBe(children.length * 2);
    expect(blocks[0].y).toBeGreaterThanOrEqual(20);
  });
});

describe("enrichPreviewContext", () => {
  it("writes script results into vars/data", () => {
    const project = createEmptyProject();
    const script = project.scripts![0];
    project.workflow = [
      {
        id: "s1",
        name: "Run greeting",
        type: "script",
        config: { scriptId: script.id },
      },
    ];
    const out = defaultOutputs().find((o) => o.kind === "preview")!;
    const ctx = enrichPreviewContext(project, { name: "Ada" }, out);
    const key = script.name.replace(/\s+/g, "_").toLowerCase();
    expect(ctx.vars[key] != null || ctx.data[key] != null).toBe(true);
  });
});
