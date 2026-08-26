import { describe, expect, it } from "vitest";
import { DEMO_LIBRARY, getDemo } from "./library";
import { parseDataInput } from "../bindings";
import { enrichPreviewContext } from "../runtime";
import { resolveTableSourceRows } from "../tableData";
import { CANVAS_PRESETS } from "../document";

describe("DEMO_LIBRARY", () => {
  it("ships conventional samples including landscape", () => {
    expect(DEMO_LIBRARY.length).toBeGreaterThanOrEqual(8);
    expect(DEMO_LIBRARY.map((d) => d.id)).toContain("letter");
    expect(DEMO_LIBRARY.map((d) => d.id)).toContain("invoice");
    expect(DEMO_LIBRARY.map((d) => d.id)).toContain("email");
    expect(DEMO_LIBRARY.map((d) => d.id)).toContain("landscape-slide");
    expect(DEMO_LIBRARY.map((d) => d.id)).toContain("a5-handout");
    expect(DEMO_LIBRARY.map((d) => d.id)).toContain("wedding");
  });

  it("assigns every demo a catalog bucket", () => {
    for (const entry of DEMO_LIBRARY) {
      expect(entry.bucket).toBeTruthy();
      expect(["business", "mass-publication", "personal", "ads"]).toContain(
        entry.bucket,
      );
    }
  });

  it("seeds Northline styles on branded samples", () => {
    for (const id of ["letter", "email", "welcome", "wedding", "advertisement"]) {
      const project = getDemo(id)!.build();
      expect(project.textStyles?.some((s) => s.id === "nl-h1")).toBe(true);
      expect(project.documentStyles?.length).toBeGreaterThan(0);
    }
  });

  it("letter exposes EN/FR language rows and gated body blocks", () => {
    const entry = getDemo("letter")!;
    const rows = parseDataInput(entry.sampleCsv);
    expect(rows.some((r) => r.language === "fr")).toBe(true);
    expect(rows.some((r) => r.language === "en")).toBe(true);
    const project = entry.build();
    const bodies = project.pages[0]!.blocks.filter((b) =>
      /Body (EN|FR)/.test(b.name),
    );
    expect(bodies.length).toBe(2);
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

  it("ships multi-page career and transform samples", () => {
    expect(getDemo("resume-sidebar")!.build().pages.map((p) => p.name)).toEqual([
      "Resume",
      "Projects",
    ]);
    expect(getDemo("resume-creative")!.build().pages.map((p) => p.name)).toEqual([
      "Portfolio CV",
      "Case notes",
    ]);
    expect(getDemo("transforms")!.build().pages).toHaveLength(3);
    expect(getDemo("letter")!.build().pages).toHaveLength(2);
  });

  it("invoice binds line tables to line_items and ships a bank dataset", () => {
    const entry = getDemo("invoice")!;
    const project = entry.build();
    expect(project.pages.map((p) => p.name)).toEqual([
      "Invoice",
      "Notes & remittance",
      "Product pack",
    ]);
    const tables = project.pages
      .flatMap((p) => p.blocks)
      .filter((b) => b.type === "table" && b.content.sourcePath === "line_items");
    expect(tables.length).toBeGreaterThanOrEqual(2);
    expect(tables.every((t) => t.content.header === true)).toBe(true);

    const fileTable = project.pages
      .flatMap((p) => p.blocks)
      .find((b) => b.type === "table" && b.content.sourcePath === "product_files");
    expect(fileTable).toBeTruthy();

    const bank = project.datasets?.find((d) => d.name === "bank");
    expect(bank?.keyField).toBe("currency");

    const rows = parseDataInput(entry.sampleCsv);
    expect(rows[0]?.line_items).toBeTruthy();
    expect(rows[0]?.product_files).toBeTruthy();
    expect(rows[0]?.pack_file_count).toBeGreaterThan(0);
    const ctx = enrichPreviewContext(project, rows[0]!, project.outputs![0]!);
    const body = resolveTableSourceRows(
      { sourcePath: "line_items" },
      rows[0]!,
      ctx,
    );
    expect(body.length).toBeGreaterThan(0);
    const files = resolveTableSourceRows(
      { sourcePath: "product_files" },
      rows[0]!,
      ctx,
    );
    expect(files.length).toBeGreaterThanOrEqual(4);
    expect(ctx.data.bank).toMatchObject({ bic: expect.any(String) });
  });

  it("memo agenda tables use sourcePath agenda", () => {
    const project = getDemo("memo")!.build();
    const agendaTables = project.pages
      .flatMap((p) => p.blocks)
      .filter((b) => b.type === "table" && b.content.sourcePath === "agenda");
    expect(agendaTables.length).toBeGreaterThanOrEqual(2);
  });

  it("advertisement binds SKUs and ships a stockists dataset", () => {
    const entry = getDemo("advertisement")!;
    const project = entry.build();
    const skuTables = project.pages
      .flatMap((p) => p.blocks)
      .filter((b) => b.type === "table" && b.content.sourcePath === "skus");
    expect(skuTables.length).toBeGreaterThanOrEqual(2);
    expect(skuTables.every((t) => t.content.header === true)).toBe(true);

    const stockistTable = project.pages
      .flatMap((p) => p.blocks)
      .find((b) => b.content.datasetName === "stockists");
    expect(stockistTable).toBeTruthy();

    const logos = project.pages
      .flatMap((p) => p.blocks)
      .filter((b) => b.name === "Logo");
    expect(logos.length).toBe(2);

    const promo = project.pages
      .flatMap((p) => p.blocks)
      .find((b) => b.name === "Promo badge");
    expect(String(promo?.content.text)).toContain("promo_amount");
    expect(promo?.style.background).toBe("#c45c26");

    const cta = project.pages
      .flatMap((p) => p.blocks)
      .find((b) => b.name === "CTA");
    expect(cta?.style.background).toBe("#0f6b63");
    expect(cta?.style.color).toBe("#ffffff");

    const back = project.pages.find((p) => p.name === "Back")!;
    expect(back.margins).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(back.blocks.some((b) => b.pin)).toBe(false);
    const banner = back.blocks.find((b) => b.name === "Back banner");
    expect(banner).toBeUndefined();
    const headline = back.blocks.find((b) => b.name === "Back headline");
    expect(headline?.y).toBeGreaterThanOrEqual(80);
    expect(headline?.style.background ?? "transparent").not.toBe("#0f6b63");
    expect(back.blocks.some((b) => b.pin)).toBe(false);

    const detail = project.pages
      .flatMap((p) => p.blocks)
      .find((b) => b.name === "Detail shot");
    const hero = project.pages
      .flatMap((p) => p.blocks)
      .find((b) => b.name === "Hero");
    expect(detail?.content.src).not.toBe(hero?.content.src);

    const rows = parseDataInput(entry.sampleCsv);
    expect(rows[0]?.promo_amount).toBe("20%");
    expect(Array.isArray(rows[0]?.skus)).toBe(true);
    const ctx = enrichPreviewContext(project, rows[0]!, project.outputs![0]!);
    const body = resolveTableSourceRows({ sourcePath: "skus" }, rows[0]!, ctx);
    expect(body.length).toBeGreaterThanOrEqual(2);
    const stores = resolveTableSourceRows(
      { datasetName: "stockists" },
      rows[0]!,
      ctx,
    );
    expect(stores.length).toBe(3);
  });

  it("letter sample uses the letter artboard", () => {
    const entry = getDemo("letter")!;
    expect(entry.artboard).toBe("letter");
    expect(entry.build().artboard).toBe("letter");
  });

  it("letter seeds project page chrome header and footer", () => {
    const project = getDemo("letter")!.build();
    expect(project.pageChrome?.header?.enabled).toBe(true);
    expect(project.pageChrome?.footer?.enabled).toBe(true);
    expect(project.pageChrome?.header?.blocks.length).toBeGreaterThan(0);
    expect(project.pageChrome?.footer?.blocks.length).toBeGreaterThan(0);
    // Letterhead lives in chrome, not duplicated on each page body.
    for (const page of project.pages) {
      expect(page.blocks.some((b) => b.name === "Letterhead")).toBe(false);
    }
  });

  it("a5-handout matches the a5 preset size", () => {
    const entry = getDemo("a5-handout")!;
    expect(entry.artboard).toBe("a5");
    const project = entry.build();
    expect(project.artboard).toBe("a5");
    const { w, h } = CANVAS_PRESETS.a5;
    const tallest = Math.max(
      ...project.pages.flatMap((p) => p.blocks.map((b) => b.y + b.h)),
    );
    expect(tallest).toBeLessThanOrEqual(h + 1);
    expect(w).toBe(505);
    expect(h).toBe(714);
  });

  it("landscape-slide matches the landscape preset size", () => {
    const entry = getDemo("landscape-slide")!;
    expect(entry.artboard).toBe("landscape");
    const project = entry.build();
    expect(project.artboard).toBe("landscape");
    const { w, h } = CANVAS_PRESETS.landscape;
    const widest = Math.max(
      ...project.pages.flatMap((p) => p.blocks.map((b) => b.x + b.w)),
    );
    expect(widest).toBeLessThanOrEqual(w + 1);
    expect(h).toBe(540);
  });

  it("landscape-slide uses output.kind conditions", () => {
    const blocks = getDemo("landscape-slide")!
      .build()
      .pages.flatMap((p) => p.blocks);
    const conditioned = blocks.filter((b) =>
      b.condition?.includes("output.kind"),
    );
    expect(conditioned.length).toBeGreaterThanOrEqual(2);
  });
});
