import { beforeEach, describe, expect, it } from "vitest";
import {
  activePage,
  addComment,
  addNamedDataset,
  alignSelected,
  canRedo,
  canUndo,
  copySelected,
  createProject,
  cycleActiveOutput,
  cyclePreviewRow,
  dataRows,
  deleteSelection,
  historyActionLog,
  insertBlockPlaced,
  insertPrebuildRecipe,
  loadDemoSample,
  nudgeSelection,
  placeCascade,
  prefs,
  prebuildPickerOpen,
  pasteClipboard,
  previewRowIndex,
  project,
  redoEdit,
  select,
  selectBlockToggle,
  selectBlocks,
  selection,
  selectedIds,
  setInsertPlacement,
  undoEdit,
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

describe("feature: prebuild insert (soft-compat)", () => {
  it("does not insert or open a picker when placing prebuild from tools", () => {
    insertBlockPlaced("prebuild");
    expect(prebuildPickerOpen.value).toBe(false);
    expect(blocks()).toHaveLength(0);
  });

  it("still expands recipes via insertPrebuildRecipe for legacy callers", () => {
    const recipe = PREBUILD_RECIPES[0]!;
    insertPrebuildRecipe(recipe.id);
    const expected = recipe.build({ x: 0, y: 0 });
    const added = blocks().slice(-expected.length);
    expect(added).toHaveLength(expected.length);
    expect(selection.value?.kind).toBe("block");
    expect(selection.value?.id).toBe(added[added.length - 1]!.id);
    expect(prebuildPickerOpen.value).toBe(false);
  });

  it("cascades consecutive recipe inserts so they never overlap", () => {
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
    expect(piece.x).toBe(Math.round((PAGE_WIDTH - recipe.w) / 2));
    expect(piece.y).toBe(Math.round((PAGE_HEIGHT - recipe.h) / 2));
  });

  it("honors the margins placement using normalized surface margins", () => {
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

describe("feature: project artboard + empty data", () => {
  it("createProject clears rows and syncs document artboard prefs", () => {
    createProject();
    expect(dataRows.value).toEqual([]);
    expect(project.value.artboard).toBe("document");
    expect(prefs.value.canvasPreset).toBe("document");
    expect(project.value.datasets?.[0]?.rows).toEqual([]);
  });

  it("loadDemoSample applies landscape artboard from the catalog entry", () => {
    loadDemoSample("landscape-slide");
    expect(project.value.artboard).toBe("landscape");
    expect(prefs.value.canvasPreset).toBe("landscape");
  });
});

describe("feature: named datasets", () => {
  it("addNamedDataset appends a table and can bind a table block", () => {
    createProject();
    const known = new Set(
      (activePage.value?.blocks ?? []).map((b) => b.id),
    );
    insertBlockPlaced("table");
    const table = (activePage.value?.blocks ?? []).find((b) => !known.has(b.id));
    expect(table?.type).toBe("table");

    const before = project.value.datasets?.length ?? 0;
    const id = addNamedDataset({
      name: "line_items",
      keyField: "invoice_no",
      bindTableId: table!.id,
    });
    expect(project.value.datasets?.some((d) => d.id === id)).toBe(true);
    expect(project.value.datasets?.length).toBe(before + 1);

    const bound = activePage.value?.blocks.find((b) => b.id === table!.id);
    expect(bound?.content.datasetName).toBe("line_items");
    expect(bound?.content.sourcePath).toBe("");
  });

  it("loadDemoSample invoice fills primary rows and keeps the bank dataset", () => {
    loadDemoSample("invoice");
    expect(dataRows.value.length).toBeGreaterThan(0);
    expect(dataRows.value[0]).toHaveProperty("line_items");
    const bank = project.value.datasets?.find((d) => d.name === "bank");
    expect(bank?.keyField).toBe("currency");
    expect(bank?.rows.length).toBeGreaterThan(0);
    const primary =
      project.value.datasets?.find(
        (d) => d.id === project.value.primaryDatasetId,
      ) ?? project.value.datasets?.find((d) => d.name === "primary");
    expect(primary?.rows.length).toBe(dataRows.value.length);
  });

  it("loadDemoSample memo parses agenda arrays on each row", () => {
    loadDemoSample("memo");
    const agenda = dataRows.value[0]?.agenda;
    expect(Array.isArray(agenda)).toBe(true);
    expect((agenda as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("feature: preview navigation", () => {
  it("cyclePreviewRow wraps through data rows", () => {
    loadDemoSample("advertisement");
    const n = dataRows.value.length;
    expect(n).toBeGreaterThan(1);
    previewRowIndex.value = 0;
    cyclePreviewRow(1);
    expect(previewRowIndex.value).toBe(1);
    previewRowIndex.value = n - 1;
    cyclePreviewRow(1);
    expect(previewRowIndex.value).toBe(0);
    cyclePreviewRow(-1);
    expect(previewRowIndex.value).toBe(n - 1);
  });

  it("cycleActiveOutput wraps through project outputs", () => {
    loadDemoSample("advertisement");
    const ids = (project.value.outputs ?? []).map((o) => o.id);
    expect(ids.length).toBeGreaterThan(1);
    const first = ids[0]!;
    project.value = { ...project.value, activeOutputId: first };
    cycleActiveOutput(1);
    expect(project.value.activeOutputId).toBe(ids[1]);
    project.value = {
      ...project.value,
      activeOutputId: ids[ids.length - 1]!,
    };
    cycleActiveOutput(1);
    expect(project.value.activeOutputId).toBe(first);
  });
});

describe("feature: selection clipboard", () => {
  it("copies and pastes multiple selected blocks", () => {
    const a = insertText();
    const b = insertText();
    selectBlocks([a, b]);
    copySelected();
    const countBefore = blocks().length;
    pasteClipboard();
    expect(blocks().length).toBe(countBefore + 2);
    expect(selectedIds.value).toHaveLength(2);
  });
});

describe("feature: edit history", () => {
  it("records labeled actions and supports undo/redo", () => {
    insertText();
    expect(canUndo()).toBe(true);
    expect(historyActionLog().some((row) => row.label === "Insert text")).toBe(
      true,
    );
    const nameBefore = project.value.name;
    undoEdit();
    expect(canRedo()).toBe(true);
    redoEdit();
    expect(project.value.name).toBe(nameBefore);
  });

  it("clears history when starting a blank project", () => {
    insertText();
    expect(canUndo()).toBe(true);
    createProject();
    expect(canUndo()).toBe(false);
    expect(historyActionLog()).toEqual([
      { label: "Current state", kind: "current" },
    ]);
  });
});
