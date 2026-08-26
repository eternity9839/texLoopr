import { describe, expect, it } from "vitest";
import {
  applyTemplateFilters,
  assertMergeTemplate,
  mergeChipLabel,
  normalizeFilterSegment,
  parseFilterPipe,
} from "./templateFilters";

describe("templateFilters", () => {
  it("normalizes paren and colon forms", () => {
    expect(normalizeFilterSegment("trim()")).toBe("trim");
    expect(normalizeFilterSegment("add(1)")).toBe("add:1");
    expect(normalizeFilterSegment('default("n/a")')).toBe("default:n/a");
    expect(normalizeFilterSegment("split(,)")).toBe("split:,");
    expect(normalizeFilterSegment("currency:EUR")).toBe("currency:EUR");
  });

  it("parses filter pipes", () => {
    expect(parseFilterPipe("price | mul(1.21) | currency(EUR)")).toEqual({
      path: "price",
      filters: ["mul:1.21", "currency:EUR"],
    });
  });

  it("applies string split → join", () => {
    expect(
      applyTemplateFilters("a,b,c", ["split:,", "join: / "]),
    ).toBe("a / b / c");
  });

  it("applies basic maths then currency", () => {
    const out = applyTemplateFilters("100", ["mul:1.21", "currency:EUR"]);
    expect(out).toMatch(/121/);
  });

  it("add / div / round", () => {
    expect(applyTemplateFilters("2", ["add:3"])).toBe("5");
    expect(applyTemplateFilters("10", ["div:4", "round:2"])).toBe("2.5");
    expect(applyTemplateFilters("-3", ["abs"])).toBe("3");
  });

  it("seeds random stably", () => {
    const a = applyTemplateFilters("x", ["random:1:10"], { seedKey: "sku" });
    const b = applyTemplateFilters("x", ["random:1:10"], { seedKey: "sku" });
    expect(a).toBe(b);
  });

  it("builds chip labels with filters", () => {
    expect(mergeChipLabel("name", ["trim"])).toContain("trim");
    expect(mergeChipLabel("price", ["mul:1.21", "currency:EUR"])).toMatch(
      /EUR/,
    );
  });

  it("asserts unknown filter, div:0, bad date", () => {
    const fails = assertMergeTemplate(
      "Hi {{name|nope}} {{n|div:0}} {{d|date:short}}",
      { name: "Ada", n: "10", d: "not-a-date" },
    );
    expect(fails.some((f) => f.message.includes("Unknown"))).toBe(true);
    expect(fails.some((f) => f.message.includes("zero"))).toBe(true);
    expect(fails.some((f) => f.message.includes("date"))).toBe(true);
  });

  it("asserts non-numeric math", () => {
    const fails = assertMergeTemplate("{{title|add:1}}", { title: "Dear" });
    expect(fails.some((f) => f.message.includes("not numeric"))).toBe(true);
  });
});
