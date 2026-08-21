import { describe, expect, it } from "vitest";
import { EditHistory } from "./history";
import { createEmptyProject, PAGE_WIDTH } from "./document";

describe("EditHistory", () => {
  it("undoes to previous snapshot", () => {
    const h = new EditHistory();
    const a = createEmptyProject();
    a.name = "A";
    const b = createEmptyProject();
    b.name = "B";
    h.push(a);
    const undone = h.undo(b);
    expect(undone).not.toBeNull();
    expect(undone!.name).toBe("A");
    const redone = h.redo(undone as NonNullable<typeof undone>);
    expect(redone).not.toBeNull();
    expect(redone!.name).toBe("B");
  });
});

describe("page constants", () => {
  it("matches design width", () => {
    expect(PAGE_WIDTH).toBe(720);
  });
});
