import { beforeEach, describe, expect, it } from "vitest";
import {
  activePage,
  activeTool,
  activeToolPreset,
  armSelectTool,
  createProject,
  editRequestId,
  insertBlockPlaced,
  select,
  selectedIds,
} from "../../state/store";
import {
  handleCanvasShortcut,
  handleEditorShortcut,
  SHORTCUT_SECTIONS,
} from "./editorShortcuts";

function keyEvent(
  key: string,
  mods: Partial<{
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
  }> = {},
): KeyboardEvent {
  return {
    key,
    ctrlKey: Boolean(mods.ctrlKey),
    metaKey: Boolean(mods.metaKey),
    shiftKey: Boolean(mods.shiftKey),
    altKey: Boolean(mods.altKey),
    preventDefault() {},
    target: null,
  } as KeyboardEvent;
}

describe("editorShortcuts tool sheets", () => {
  beforeEach(() => {
    createProject();
    armSelectTool();
    editRequestId.value = null;
  });

  it("maps T / S / I to text, shape, media place defaults", () => {
    expect(
      handleEditorShortcut(keyEvent("t"), {
        preview: false,
        overlayOpen: false,
      }),
    ).toBe(true);
    expect(activeTool.value).toBe("paragraph");

    expect(
      handleEditorShortcut(keyEvent("s"), {
        preview: false,
        overlayOpen: false,
      }),
    ).toBe(true);
    expect(activeTool.value).toBe("shape");
    expect(activeToolPreset.value).toBe("rect");

    expect(
      handleEditorShortcut(keyEvent("i"), {
        preview: false,
        overlayOpen: false,
      }),
    ).toBe(true);
    expect(activeTool.value).toBe("picture");
  });

  it("lists Enter/F2 in the edit shortcuts help", () => {
    const edit = SHORTCUT_SECTIONS.find(
      (s) => s.titleKey === "shortcutSectionEdit",
    );
    expect(edit?.rows.some((r) => r.actionKey === "shortcutEditText")).toBe(
      true,
    );
  });

  it("Enter requests edit on a single text-like selection", () => {
    const before = new Set(
      (activePage.value?.blocks ?? []).map((b) => b.id),
    );
    insertBlockPlaced("paragraph");
    const id = (activePage.value?.blocks ?? []).find((b) => !before.has(b.id))
      ?.id;
    expect(id).toBeTruthy();
    select({ kind: "block", id: id! });
    expect(selectedIds.value).toEqual([id]);
    expect(handleCanvasShortcut(keyEvent("Enter"), false)).toBe(true);
    expect(editRequestId.value).toBe(id);
  });
});
