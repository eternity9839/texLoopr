import { describe, expect, it } from "vitest";
import { buildBrowserPdfDocument } from "./browserPdf";
import { createEmptyProject } from "./document";
import { resumeEngineering } from "./demos/personal/resumeEngineering";

describe("buildBrowserPdfDocument", () => {
  it("flattens pages for a pdf output", () => {
    const project = createEmptyProject();
    const output = {
      id: "out-pdf",
      name: "PDF",
      kind: "pdf" as const,
    };
    const doc = buildBrowserPdfDocument({
      project,
      row: {},
      output,
    });
    expect(doc.pages.length).toBeGreaterThan(0);
    expect(doc.pages[0]!.width).toBeGreaterThan(0);
    expect(doc.pages[0]!.height).toBeGreaterThan(0);
  });

  it("builds a printable model for the resume sample with experience groups", () => {
    const project = resumeEngineering();
    const groups = (project.pages[0]?.blocks ?? []).filter(
      (b) => b.type === "group",
    );
    expect(groups.length).toBeGreaterThan(0);
    expect(
      groups.some(
        (g) =>
          Array.isArray(g.content.blocks) &&
          (g.content.blocks as unknown[]).length > 0,
      ),
    ).toBe(true);

    const output =
      project.outputs?.find((o) => o.kind === "pdf" || o.kind === "print") ?? {
        id: "out-pdf",
        name: "PDF",
        kind: "pdf" as const,
      };
    const doc = buildBrowserPdfDocument({
      project,
      row: {},
      output,
    });
    expect(doc.pages.length).toBeGreaterThan(0);
    expect(doc.pages[0]!.blocks.length).toBeGreaterThan(0);
  });
});
