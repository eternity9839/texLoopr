import { describe, expect, it } from "vitest";
import { DEMO_LIBRARY, getDemo } from "./library";

describe("DEMO_LIBRARY", () => {
  it("ships 9 conventional samples", () => {
    expect(DEMO_LIBRARY.length).toBeGreaterThanOrEqual(8);
    expect(DEMO_LIBRARY.map((d) => d.id)).toContain("letter");
    expect(DEMO_LIBRARY.map((d) => d.id)).toContain("invoice");
    expect(DEMO_LIBRARY.map((d) => d.id)).toContain("email");
  });

  it("builds projects with pages and blocks", () => {
    for (const entry of DEMO_LIBRARY) {
      const project = entry.build();
      expect(project.pages.length).toBeGreaterThan(0);
      const blocks = project.pages.flatMap((p) => p.blocks);
      expect(blocks.length).toBeGreaterThan(0);
      expect(entry.sampleCsv.trim().length).toBeGreaterThan(0);
    }
  });

  it("resolves getDemo", () => {
    expect(getDemo("contract")?.title).toMatch(/agreement/i);
  });
});
