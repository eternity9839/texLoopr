import type { Block, BlockType } from "./document";
import { getChildBlocks, isContainerBlock } from "./groups";

export type ZOrderDirection = "front" | "forward" | "backward" | "back";

/** Default paint rank when zIndex is unset (matches canvas sort). */
export function layerRank(type: BlockType | string | undefined): number {
  if (type === "shape") return 0;
  if (type === "picture") return 1;
  return 2;
}

export function effectiveZ(block: Pick<Block, "zIndex" | "type">): number {
  return block.zIndex ?? layerRank(block.type);
}

export interface SiblingContext {
  /** Parent container id, or null for page-root siblings. */
  parentId: string | null;
  siblings: Block[];
  index: number;
}

/** Locate a block's sibling list (page root or group children). */
export function findSiblingContext(
  pageBlocks: Block[],
  blockId: string,
): SiblingContext | null {
  const walk = (
    siblings: Block[],
    parentId: string | null,
  ): SiblingContext | null => {
    const index = siblings.findIndex((b) => b.id === blockId);
    if (index >= 0) return { parentId, siblings, index };
    for (const b of siblings) {
      if (isContainerBlock(b)) {
        const found = walk(getChildBlocks(b), b.id);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(pageBlocks, null);
}

export function findBlockParentId(
  pageBlocks: Block[],
  blockId: string,
): string | null {
  return findSiblingContext(pageBlocks, blockId)?.parentId ?? null;
}

/** Ordered by paint order ascending (back → front). */
export function sortByEffectiveZ(blocks: Block[]): Block[] {
  return [...blocks].sort(
    (a, b) =>
      effectiveZ(a) - effectiveZ(b) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}

function normalizeZIndices(blocks: Block[]): Block[] {
  return blocks.map((b, i) => ({ ...b, zIndex: i + 1 }));
}

/** Apply z-order nudge within a sibling list; returns updated siblings. */
export function reorderSiblings(
  siblings: Block[],
  blockId: string,
  direction: ZOrderDirection,
): Block[] | null {
  const ctx = findSiblingContext(siblings, blockId);
  if (!ctx) return null;

  const ordered = sortByEffectiveZ(ctx.siblings);
  const idx = ordered.findIndex((b) => b.id === blockId);
  if (idx < 0) return null;

  const next = [...ordered];
  if (direction === "front") {
    const [item] = next.splice(idx, 1);
    next.push(item!);
  } else if (direction === "back") {
    const [item] = next.splice(idx, 1);
    next.unshift(item!);
  } else if (direction === "forward") {
    if (idx >= next.length - 1) return normalizeZIndices(next);
    [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
  } else {
    if (idx <= 0) return normalizeZIndices(next);
    [next[idx], next[idx - 1]] = [next[idx - 1]!, next[idx]!];
  }

  return normalizeZIndices(next);
}

/** Replace sibling list inside page tree after z-order change. */
export function applySiblingList(
  pageBlocks: Block[],
  parentId: string | null,
  newSiblings: Block[],
): Block[] {
  if (parentId === null) return newSiblings;
  return pageBlocks.map((b) => {
    if (b.id !== parentId) {
      if (isContainerBlock(b)) {
        return {
          ...b,
          content: {
            ...b.content,
            blocks: applySiblingList(getChildBlocks(b), parentId, newSiblings),
          },
        };
      }
      return b;
    }
    return {
      ...b,
      content: { ...b.content, blocks: newSiblings },
    };
  });
}

export function nudgeBlockZOrder(
  pageBlocks: Block[],
  blockId: string,
  direction: ZOrderDirection,
): Block[] | null {
  const ctx = findSiblingContext(pageBlocks, blockId);
  if (!ctx) return null;
  const updated = reorderSiblings(ctx.siblings, blockId, direction);
  if (!updated) return null;
  return applySiblingList(pageBlocks, ctx.parentId, updated);
}

export function stackIndexAmongSiblings(
  pageBlocks: Block[],
  blockId: string,
): { index: number; total: number } | null {
  const ctx = findSiblingContext(pageBlocks, blockId);
  if (!ctx) return null;
  const ordered = sortByEffectiveZ(ctx.siblings);
  const index = ordered.findIndex((b) => b.id === blockId);
  if (index < 0) return null;
  return { index: index + 1, total: ordered.length };
}
