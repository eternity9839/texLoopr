import { beforeEach, describe, expect, it } from "vitest";
import {
  activePage,
  addComment,
  alignSelected,
  createProject,
  deleteSelection,
  insertBlockPlaced,
  closePrebuildPicker,
  insertPrebuildRecipe,
  nudgeSelection,
  placeCascade,
  prebuildPickerOpen,
  project,
  select,
  selectBlockToggle,
  selection,
  selectedIds,
  setInsertPlacement,
  updateBlock,
} from "../state/store";
import { PREBUILD_RECIPES } from "../model/prebuild/library";
import { normalizeMargins, PAGE_HEIGHT, PAGE_WIDTH } from "../model/document";

function blocks() {
  return activePage.value?.blocks ?? [];
}

function blockById(id: string) {
  return blocks().find((b) => b.id === id);
}

/** Insert a plain text block and return its id (insert does not return it). */
function insertText(): string {
  const known = new Set(blocks().map((b) => b.id));
  insertBlockPlaced("text");
  const added = blocks().find((b) => !known.has(b.id));
  expect(added).toBeTruthy();
  return added!.id;
}

beforeEach(() => {
  createProject();
  prebuildPickerOpen.value = false;
  setInsertPlacement("cascade");
});

describe("feature: prebuild picker flow", () => {
  it("never inserts blindly — the prebuild tool only opens the picker", () => {
    insertBlockPlaced("prebuild");
    expect(prebuildPickerOpen.value).toBe(true);
    expect(blocks()).toHaveLength(0);
    closePrebuildPicker();
    expect(prebuildPickerOpen.value).toBe(false);
  });

  it("expands every recipe piece onto the page and selects the last", () => {
    const recipe = PREBUILD_RECIPES[0]!;
    insertPrebuildRecipe(recipe.id);
    const expected = recipe.build({ x: 0, y: 0 });
    const added = blocks().slice(-expected.length);
    expect(added).toHaveLength(expected.length);
    expect(selection.value?.kind).toBe("block");
    expect(selection.value?.id).toBe(added[added.length - 1]!.id);
    expect(prebuildPickerOpen.value).toBe(false);
  });

  it("cascades consecutive inserts so they never overlap", () => {
    const recipe = PREBUILD_RECIPES[0]!;
    insertPrebuildRecipe(recipe.id);
    const firstX = blocks()[0]!.x;
    const firstCount = blocks().length;
    insertPrebuildRecipe(recipe.id);
    expect(blocks()).toHaveLength(firstCount * 2);
    expect(placeCascade.value).toBeGreaterThan(0);
    expect(blocks()[firstCount]!.x).not.toBe(firstX);
  });

  it("ignores unknown recipe ids", () => {
    insertPrebuildRecipe("no-such-recipe");
    expect(blocks()).toHaveLength(0);
  });

  it("honors the center placement", () => {
    setInsertPlacement("center");
    insertPrebuildRecipe(PREBUILD_RECIPES[0]!.id);
    const recipe = PREBUILD_RECIPES[0]!;
    const piece = blocks()[0]!;
    // pieces sit relative to the recipe origin, which is centered on the page
    expect(piece.x).toBe(Math.round((PAGE_WIDTH - recipe.w) / 2));
    expect(piece.y).toBe(Math.round((PAGE_HEIGHT - recipe.h) / 2));
  });

  it("honors the margins placement using normalized page margins", () => {
    setInsertPlacement("margins");
    const m = normalizeMargins(activePage.value?.margins);
    insertPrebuildRecipe(PREBUILD_RECIPES[0]!.id);
    const piece = blocks()[0]!;
    expect(piece.x).toBe(m.left);
    expect(piece.y).toBe(m.top);
  });
});

describe("feature: multi-select nudge", () => {
  it("moves every selected unlocked block by the same delta", () => {
    const a = insertText();
    const b = insertText();
    select({ kind: "block", id: a });
    selectBlockToggle(b);
    expect([...selectedIds.value].sort()).toEqual([a, b].sort());
    const A = blockById(a)!;
    const B = blockById(b)!;
    nudgeSelection(10, -6);
    expect(blockById(a)!.x).toBe(A.x + 10);
    expect(blockById(a)!.y).toBe(A.y - 6);
    expect(blockById(b)!.x).toBe(B.x + 10);
    expect(blockById(b)!.y).toBe(B.y - 6);
  });

  it("skips locked blocks while nudging the rest", () => {
    const free = insertText();
    const locked = insertText();
    updateBlock(locked, { locked: true });
    select({ kind: "block", id: free });
    selectBlockToggle(locked);
    const freeBefore = blockById(free)!;
    const lockedBefore = blockById(locked)!;
    nudgeSelection(5, 5);
    expect(blockById(free)!.x).toBe(freeBefore.x + 5);
    expect(blockById(free)!.y).toBe(freeBefore.y + 5);
    expect(blockById(locked)!.x).toBe(lockedBefore.x);
    expect(blockById(locked)!.y).toBe(lockedBefore.y);
  });
});

describe("feature: align selected", () => {
  function twoBlocks(): [string, string] {
    const a = insertText();
    const b = insertText();
    select({ kind: "block", id: a });
    selectBlockToggle(b);
    return [a, b];
  }

  it("aligns left edges to the shared bounding box", () => {
    const [a, b] = twoBlocks();
    const B = blockById(b)!;
    updateBlock(b, { x: B.x + 120, y: B.y + 60 });
    const minX = Math.min(blockById(a)!.x, blockById(b)!.x);
    alignSelected("left");
    expect(blockById(a)!.x).toBe(minX);
    expect(blockById(b)!.x).toBe(minX);
  });

  it("centers both blocks on one horizontal middle line", () => {
    const [a, b] = twoBlocks();
    const B = blockById(b)!;
    updateBlock(b, { y: B.y + 90 });
    alignSelected("middle");
    const A2 = blockById(a)!;
    const B2 = blockById(b)!;
    expect(A2.y + A2.h / 2).toBeCloseTo(B2.y + B2.h / 2, 5);
  });

  it("falls back to page alignment for a single selection", () => {
    const id = twoBlocks()[0]!;
    select({ kind: "block", id });
    alignSelected("center-x");
    const blk = blockById(id)!;
    expect(blk.x).toBe(Math.round((PAGE_WIDTH - blk.w) / 2));
  });

  it("does nothing when nothing is selected", () => {
    const before = JSON.stringify(project.value);
    selection.value = null;
    selectedIds.value = [];
    alignSelected("bottom");
    expect(JSON.stringify(project.value)).toBe(before);
  });
});

describe("feature: delete selection cleans up comments", () => {
  it("removes the block and its comments together", () => {
    const id = insertText();
    addComment("needs review", id);
    expect(project.value.comments).toHaveLength(1);
    select({ kind: "block", id });
    deleteSelection();
    expect(blockById(id)).toBeUndefined();
    expect(project.value.comments).toHaveLength(0);
    expect(selection.value).toBeNull();
    expect(selectedIds.value).toEqual([]);
  });
});
