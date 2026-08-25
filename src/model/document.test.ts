import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  cssTransformFromStyle,
  LIST_STYLES,
  normalizeMargins,
  PAGE_HEIGHT,
  PAGE_WIDTH,
} from "./document";

describe("feature: page margins model", () => {
  it("fills missing sides with the default margins", () => {
    const m = normalizeMargins({ top: 90 });
    expect(m).toEqual({
      top: 90,
      right: expect.any(Number),
      bottom: expect.any(Number),
      left: expect.any(Number),
    });
    expect(m.left).toBeGreaterThan(0);
  });

  it("keeps every provided side", () => {
    const m = normalizeMargins({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(m).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });

  it("returns all defaults for an empty request", () => {
    const m = normalizeMargins();
    expect(Object.values(m).every((v) => v >= 0)).toBe(true);
    expect(m.top).toBeGreaterThan(0);
    expect(m.left).toBeGreaterThan(0);
  });
});

describe("feature: watermark + background page chrome", () => {
  it("supports draft/confidential/custom watermarks on a page", () => {
    const project = createEmptyProject();
    const page = project.pages[0]!;
    page.watermark = { kind: "draft", opacity: 0.08, angle: -30 };
    expect(page.watermark.kind).toBe("draft");
    page.watermark = { text: "ACME INTERNAL", fontSize: 64 };
    expect(page.watermark.text).toBe("ACME INTERNAL");
    page.background = "#fbf7ef";
    expect(page.background).toMatch(/^#/);
  });

  it("keeps pages inside the fixed document canvas", () => {
    expect(PAGE_WIDTH).toBeGreaterThanOrEqual(320);
    expect(PAGE_HEIGHT).toBeGreaterThanOrEqual(PAGE_WIDTH);
  });
});

describe("feature: list marker styles", () => {
  it("offers the full bullet/numbering palette", () => {
    const values = LIST_STYLES.map((s) => s.value);
    for (const v of [
      "disc",
      "circle",
      "square",
      "decimal",
      "upper-roman",
      "lower-alpha",
      "none",
    ]) {
      expect(values).toContain(v);
    }
  });

  it("labels are human-readable and unique", () => {
    const labels = LIST_STYLES.map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.every((l) => l.length > 0)).toBe(true);
  });
});

describe("feature: fresh documents", () => {
  it("start with one active page and no blocks", () => {
    const p = createEmptyProject();
    expect(p.pages).toHaveLength(1);
    expect(p.activePageId).toBe(p.pages[0]!.id);
    expect(p.pages[0]!.blocks).toEqual([]);
    expect(p.comments ?? []).toEqual([]);
  });

  it("owns a document artboard and an empty primary dataset", () => {
    const p = createEmptyProject();
    expect(p.artboard).toBe("document");
    expect(p.datasets).toHaveLength(1);
    expect(p.datasets![0]!.rows).toEqual([]);
    expect(p.primaryDatasetId).toBe(p.datasets![0]!.id);
  });
});

describe("feature: cssTransformFromStyle", () => {
  it("returns empty for identity", () => {
    expect(cssTransformFromStyle({})).toBe("");
  });

  it("composes rotate and mirrors", () => {
    expect(cssTransformFromStyle({ rotate: -12, mirrorX: true })).toBe(
      "rotate(-12deg) scaleX(-1)",
    );
    expect(cssTransformFromStyle({ mirrorY: true })).toBe("scaleY(-1)");
  });
});
