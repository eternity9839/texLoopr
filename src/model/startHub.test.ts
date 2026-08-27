import { describe, expect, it } from "vitest";
import {
  canContinueFrom,
  continueLabelTitle,
  hasLocalDraftSnapshot,
  pickContinueProjectId,
} from "./startHub";
import type { ProjectSummary } from "../storage/types";

function summary(
  partial: Partial<ProjectSummary> & Pick<ProjectSummary, "id" | "name">,
): ProjectSummary {
  return {
    filesystemId: null,
    relativePath: null,
    meta: {},
    isActive: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("startHub", () => {
  it("hasLocalDraftSnapshot reads known keys", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
    };
    expect(hasLocalDraftSnapshot(storage)).toBe(false);
    map.set("texlooper.temp.active.v1", "{}");
    expect(hasLocalDraftSnapshot(storage)).toBe(true);
  });

  it("canContinueFrom requires catalog or draft", () => {
    expect(canContinueFrom([], false)).toBe(false);
    expect(canContinueFrom([], true)).toBe(true);
    expect(canContinueFrom([summary({ id: "a", name: "A" })], false)).toBe(
      true,
    );
  });

  it("pickContinueProjectId prefers current then active then newest", () => {
    const projects = [
      summary({
        id: "old",
        name: "Old",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      summary({
        id: "new",
        name: "New",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
      summary({
        id: "act",
        name: "Active",
        isActive: true,
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
    ];
    expect(pickContinueProjectId(projects, "old")).toBe("old");
    expect(pickContinueProjectId(projects, null)).toBe("act");
    expect(
      pickContinueProjectId(
        projects.filter((p) => !p.isActive),
        null,
      ),
    ).toBe("new");
  });

  it("continueLabelTitle falls back to draft name", () => {
    expect(continueLabelTitle([], null, "Drafty", true)).toBe("Drafty");
    expect(continueLabelTitle([], null, "Drafty", false)).toBe(null);
    expect(
      continueLabelTitle(
        [summary({ id: "a", name: "Catalog A" })],
        "a",
        "Ignored",
        false,
      ),
    ).toBe("Catalog A");
  });
});
