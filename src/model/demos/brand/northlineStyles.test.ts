import { describe, expect, it } from "vitest";
import {
  northlineTextStyles,
  northlineDocumentStyles,
  northlineStyleExtras,
} from "./northlineStyles";
import { listTextStyles, listDocumentStyles } from "../../styleLibrary";
import { createEmptyProject } from "../../document";

describe("northlineStyles", () => {
  it("ships unique text and document style ids", () => {
    const text = northlineTextStyles();
    const docs = northlineDocumentStyles();
    expect(text.length).toBeGreaterThanOrEqual(12);
    expect(docs.length).toBeGreaterThanOrEqual(6);
    expect(new Set(text.map((s) => s.id)).size).toBe(text.length);
    expect(new Set(docs.map((s) => s.id)).size).toBe(docs.length);
  });

  it("merges into style library lists", () => {
    const extras = northlineStyleExtras();
    const project = {
      ...createEmptyProject(),
      textStyles: extras.textStyles,
      documentStyles: extras.documentStyles,
    };
    const texts = listTextStyles(project);
    const docs = listDocumentStyles(project);
    expect(texts.some((s) => s.id === "nl-h1")).toBe(true);
    expect(docs.some((s) => s.id === "nl-doc-letter")).toBe(true);
  });
});
