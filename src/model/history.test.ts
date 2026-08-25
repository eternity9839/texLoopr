import { describe, expect, it } from "vitest";
import {
  EditHistory,
  isEditHistorySnapshot,
  type EditHistorySnapshot,
} from "./history";
import { createEmptyProject, PAGE_WIDTH } from "./document";

describe("EditHistory", () => {
  it("undoes to previous snapshot", () => {
    const h = new EditHistory();
    const a = createEmptyProject();
    a.name = "A";
    const b = createEmptyProject();
    b.name = "B";
    h.push(a, "Rename to B");
    const undone = h.undo(b);
    expect(undone).not.toBeNull();
    expect(undone!.name).toBe("A");
    const redone = h.redo(undone as NonNullable<typeof undone>);
    expect(redone).not.toBeNull();
    expect(redone!.name).toBe("B");
  });

  it("tracks labeled actions in the timeline", () => {
    const h = new EditHistory();
    const a = createEmptyProject();
    const b = createEmptyProject();
    b.name = "B";
    const c = createEmptyProject();
    c.name = "C";
    h.push(a, "First");
    h.push(b, "Second");
    expect(h.actionLog()).toEqual([
      { label: "First", kind: "past" },
      { label: "Second", kind: "past" },
      { label: "Current state", kind: "current" },
    ]);
    h.undo(c);
    expect(h.actionLog()).toEqual([
      { label: "First", kind: "past" },
      { label: "Current state", kind: "current" },
      { label: "Second", kind: "future" },
    ]);
  });

  it("round-trips through snapshots", () => {
    const h = new EditHistory();
    const a = createEmptyProject();
    a.name = "A";
    const b = createEmptyProject();
    b.name = "B";
    h.push(a, "Edit A");
    h.undo(b);
    const snap = h.toSnapshot();
    expect(snap).not.toBeNull();
    expect(isEditHistorySnapshot(snap)).toBe(true);

    const restored = new EditHistory();
    restored.loadSnapshot(snap as EditHistorySnapshot);
    expect(restored.canRedo()).toBe(true);
    expect(restored.actionLog()).toEqual([
      { label: "Current state", kind: "current" },
      { label: "Edit A", kind: "future" },
    ]);
  });
});

describe("page constants", () => {
  it("matches design width", () => {
    expect(PAGE_WIDTH).toBe(720);
  });
});
