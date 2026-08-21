import { describe, expect, it } from "vitest";
import {
  evaluateCondition,
  parseDataInput,
  resolveItemsPath,
  resolveTemplate,
  SAMPLE_CSV,
} from "./bindings";
import { createEmptyProject, createId } from "./document";
import { reduceInsertBlock } from "../state/store";

describe("resolveTemplate", () => {
  it("replaces known paths", () => {
    expect(resolveTemplate("Hi {{name}}", { name: "Ada" })).toBe("Hi Ada");
  });

  it("keeps tokens when missing in edition mode", () => {
    expect(resolveTemplate("Hi {{name}}", {})).toBe("Hi {{name}}");
  });

  it("empties missing tokens in preview mode", () => {
    expect(
      resolveTemplate("Hi {{name}}", {}, { missingAsEmpty: true }),
    ).toBe("Hi ");
  });

  it("applies number currency date replace slice pad", () => {
    expect(resolveTemplate("{{n|number:2}}", { n: "3.14159" })).toBe("3.14");
    expect(resolveTemplate("{{n|currency:EUR}}", { n: "12.5" })).toMatch(/12/);
    expect(resolveTemplate("{{d|date:iso}}", { d: "2024-06-15T12:00:00Z" })).toBe(
      "2024-06-15",
    );
    expect(resolveTemplate("{{s|replace:a:o}}", { s: "cat" })).toBe("cot");
    expect(resolveTemplate("{{s|slice:0:2}}", { s: "abcd" })).toBe("ab");
    expect(resolveTemplate("{{s|pad:4:0}}", { s: "7" })).toBe("0007");
  });

  it("expands #if / else", () => {
    expect(
      resolveTemplate("{{#if role}}yes{{else}}no{{/if}}", { role: "dev" }),
    ).toBe("yes");
    expect(
      resolveTemplate("{{#if role}}yes{{else}}no{{/if}}", {}),
    ).toBe("no");
  });

  it("resolves nested JSON paths", () => {
    expect(
      resolveTemplate("{{customer.name}}", {
        customer: { name: "Ada", city: "London" },
      }),
    ).toBe("Ada");
  });
});

describe("evaluateCondition", () => {
  it("treats empty as true", () => {
    expect(evaluateCondition(undefined, {})).toBe(true);
  });

  it("checks field presence", () => {
    expect(evaluateCondition("role", { role: "dev" })).toBe(true);
    expect(evaluateCondition("role", {})).toBe(false);
    expect(evaluateCondition("!role", {})).toBe(true);
  });
});

describe("parseDataInput", () => {
  it("parses sample CSV", () => {
    const rows = parseDataInput(SAMPLE_CSV);
    expect(rows).toHaveLength(3);
    expect(rows[0].name).toBe("Ada Lovelace");
  });

  it("parses JSON array preserving nested arrays", () => {
    const rows = parseDataInput(
      `[{"a":1,"lines":[{"sku":"A"},{"sku":"B"}]}]`,
    );
    expect(rows[0].a).toBe(1);
    expect(rows[0].lines).toEqual([{ sku: "A" }, { sku: "B" }]);
  });
});

describe("resolveItemsPath", () => {
  it("reads array fields", () => {
    expect(
      resolveItemsPath("lines", { lines: [{ a: 1 }, { a: 2 }] }),
    ).toHaveLength(2);
  });
});

describe("reduceInsertBlock", () => {
  it("inserts into active page", () => {
    const project = createEmptyProject();
    const result = reduceInsertBlock(project, "paragraph", 0);
    expect(result.project.pages[0].blocks).toHaveLength(1);
    expect(result.blockId).toBeTruthy();
    expect(createId()).not.toBe(result.blockId);
  });
});
