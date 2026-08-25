import type { Block, CustomObject } from "./document";
import { createId } from "./document";
import {
  resolveItemsPath,
  type DataRow,
} from "./bindings";
import type { ExprValue, RuntimeContext } from "./expr";

export function isContainerBlock(block: Block): boolean {
  return block.type === "group" || block.type === "repeat";
}

/** Case-insensitive match on a block's name and type. */
export function matchesQuery(block: Block, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${block.name} ${block.type}`.toLowerCase().includes(q);
}

export function getChildBlocks(block: Block): Block[] {
  const raw = block.content.blocks;
  return Array.isArray(raw) ? (raw as Block[]) : [];
}

export function withChildBlocks(block: Block, children: Block[]): Block {
  return {
    ...block,
    content: {
      ...block.content,
      blocks: children,
    },
  };
}

export function isRepeatingGroup(block: Block): boolean {
  if (block.type === "repeat") return true;
  if (block.type !== "group") return false;
  return Boolean(String(block.content.itemsPath ?? "").trim());
}

/** Bounding box of blocks in page space. */
export function boundsOf(blocks: Block[]): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  if (blocks.length === 0) return { x: 0, y: 0, w: 120, h: 48 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of blocks) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return {
    x: minX,
    y: minY,
    w: Math.max(24, maxX - minX),
    h: Math.max(24, maxY - minY),
  };
}

/** Wrap blocks into a group; children become relative to the group origin. */
export function makeGroupFromBlocks(
  blocks: Block[],
  name = "Group",
): Block {
  const box = boundsOf(blocks);
  const children = blocks.map((b, i) => ({
    ...b,
    x: b.x - box.x,
    y: b.y - box.y,
    zIndex: b.zIndex ?? i + 1,
  }));
  return {
    id: createId(),
    type: "group",
    name,
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    content: { blocks: children },
    style: {},
    zIndex: Math.max(0, ...blocks.map((b) => b.zIndex ?? 0)) + 1,
  };
}

export function ungroupBlock(group: Block): Block[] {
  if (!isContainerBlock(group)) return [group];
  return getChildBlocks(group).map((c, i) => ({
    ...c,
    id: c.id || createId(),
    x: group.x + c.x,
    y: group.y + c.y,
    zIndex: (group.zIndex ?? 0) + (c.zIndex ?? i),
  }));
}

export function customObjectFromGroup(group: Block, name: string): CustomObject {
  const children = getChildBlocks(group);
  return {
    id: createId(),
    name: name.trim() || group.name || "Custom object",
    createdAt: new Date().toISOString(),
    w: group.w,
    h: group.h,
    blocks: children.map((c) => ({
      ...structuredClone(c),
      id: createId(),
    })),
    itemsPath: String(group.content.itemsPath ?? "") || undefined,
    itemVar: String(group.content.itemVar ?? "") || undefined,
  };
}

export function expandCustomObject(
  obj: CustomObject,
  origin: { x: number; y: number },
): Block {
  const children = (obj.blocks ?? []).map((c) => ({
    ...structuredClone(c),
    id: createId(),
  }));
  return {
    id: createId(),
    type: "group",
    name: obj.name,
    x: origin.x,
    y: origin.y,
    w: obj.w,
    h: obj.h,
    content: {
      blocks: children,
      ...(obj.itemsPath
        ? { itemsPath: obj.itemsPath, itemVar: obj.itemVar ?? "item" }
        : {}),
    },
    style: {},
    zIndex: 1,
  };
}

export function getRepeatChildren(block: Block): Block[] {
  return getChildBlocks(block);
}

export function setRepeatChildren(block: Block, children: Block[]): Block {
  return withChildBlocks(block, children);
}

export function repeatRowHeight(children: Block[], gap = 8): number {
  if (children.length === 0) return 48;
  let max = 0;
  for (const c of children) {
    max = Math.max(max, c.y + c.h);
  }
  return max + gap;
}

/**
 * Expand repeating groups for preview into flat absolute-positioned clones.
 * Nested non-repeating groups stay as frames with children flattened one level.
 */
export function flattenBlocksForPreview(
  blocks: Block[],
  row: DataRow | undefined,
  runtime: RuntimeContext | undefined,
): { blocks: Block[]; itemContexts: Map<string, RuntimeContext> } {
  const out: Block[] = [];
  const itemContexts = new Map<string, RuntimeContext>();

  const walk = (
    list: Block[],
    ox: number,
    oy: number,
    zBase: number,
  ) => {
    for (const block of list) {
      if (isRepeatingGroup(block)) {
        const itemsPath = String(block.content.itemsPath ?? "line_items");
        const itemVar = String(block.content.itemVar ?? "item");
        const children = getChildBlocks(block);
        const items = resolveItemsPath(itemsPath, row, runtime);
        const rowH = repeatRowHeight(children);

        if (items.length === 0) {
          out.push({
            ...block,
            x: ox + block.x,
            y: oy + block.y,
            content: { ...block.content, _previewEmpty: true },
          });
          continue;
        }

        items.forEach((item, index) => {
          const itemCtx = mergeItemContext(runtime, row, itemVar, item, index);
          for (const child of children) {
            const cloneId = `${block.id}__${index}__${child.id}`;
            if (isContainerBlock(child) && !isRepeatingGroup(child)) {
              walk(
                [child],
                ox + block.x,
                oy + block.y + index * rowH,
                zBase + (block.zIndex ?? 0),
              );
              continue;
            }
            const clone: Block = {
              ...child,
              id: cloneId,
              x: ox + block.x + child.x,
              y: oy + block.y + child.y + index * rowH,
              zIndex:
                zBase +
                (block.zIndex ?? 0) +
                (child.zIndex ?? 0) +
                index,
            };
            out.push(clone);
            if (itemCtx) itemContexts.set(cloneId, itemCtx);
          }
        });
        continue;
      }

      if (block.type === "group") {
        const children = getChildBlocks(block);
        if (children.length === 0) {
          out.push({
            ...block,
            x: ox + block.x,
            y: oy + block.y,
            zIndex: zBase + (block.zIndex ?? 0),
          });
          continue;
        }
        walk(
          children,
          ox + block.x,
          oy + block.y,
          zBase + (block.zIndex ?? 0),
        );
        continue;
      }

      out.push({
        ...block,
        x: ox + block.x,
        y: oy + block.y,
        zIndex: zBase + (block.zIndex ?? 0),
      });
    }
  };

  walk(blocks, 0, 0, 0);
  return { blocks: out, itemContexts };
}

export function mergeItemContext(
  base: RuntimeContext | undefined,
  row: DataRow | undefined,
  itemVar: string,
  item: ExprValue,
  index: number,
): RuntimeContext | undefined {
  if (!base) return undefined;
  const itemObj =
    item && typeof item === "object" && !Array.isArray(item)
      ? (item as Record<string, ExprValue>)
      : { value: item };

  const data: Record<string, ExprValue> = {
    ...base.data,
    ...(row ?? {}),
    ...itemObj,
    [itemVar]: item,
    [`${itemVar}_index`]: index,
  };

  return {
    ...base,
    data,
    vars: {
      ...base.vars,
      [itemVar]: item,
      index,
    },
  };
}

export function findBlockDeep(blocks: Block[], id: string): Block | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (isContainerBlock(b)) {
      const found = findBlockDeep(getChildBlocks(b), id);
      if (found) return found;
    }
  }
  return null;
}

export function removeBlockDeep(blocks: Block[], id: string): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.id === id) continue;
    if (isContainerBlock(b)) {
      out.push(withChildBlocks(b, removeBlockDeep(getChildBlocks(b), id)));
    } else {
      out.push(b);
    }
  }
  return out;
}

export function updateBlockDeep(
  blocks: Block[],
  id: string,
  updater: (b: Block) => Block,
): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return updater(b);
    if (isContainerBlock(b)) {
      return withChildBlocks(b, updateBlockDeep(getChildBlocks(b), id, updater));
    }
    return b;
  });
}

export function flattenOutline(
  blocks: Block[],
  depth = 0,
): { block: Block; depth: number }[] {
  const rows: { block: Block; depth: number }[] = [];
  for (const b of blocks) {
    rows.push({ block: b, depth });
    if (isContainerBlock(b)) {
      rows.push(...flattenOutline(getChildBlocks(b), depth + 1));
    }
  }
  return rows;
}

export function defaultRepeatChildren(): Block[] {
  return [
    {
      id: createId(),
      type: "text",
      name: "Item label",
      x: 8,
      y: 8,
      w: 200,
      h: 24,
      content: { text: "{{description|default:Item}}" },
      style: { fontSize: 12, color: "#2a2622" },
      zIndex: 1,
    },
    {
      id: createId(),
      type: "text",
      name: "Item amount",
      x: 220,
      y: 8,
      w: 100,
      h: 24,
      content: { text: "{{amount|currency:EUR}}" },
      style: { fontSize: 12, color: "#2a2622", textAlign: "right" },
      zIndex: 2,
    },
  ];
}
