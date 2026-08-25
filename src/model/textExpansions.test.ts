import { describe, expect, it } from "vitest";
import {
  applyTextExpansion,
  dataSourceToFieldPath,
  matchTextExpansion,
} from "./textExpansions";

describe("textExpansions", () => {
  it("maps data-source paths to merge fields", () => {
    expect(dataSourceToFieldPath("email")).toBe("email");
    expect(dataSourceToFieldPath("source2/email")).toBe("source2.email");
  });

  it("expands data-source shorthand", () => {
    const m = matchTextExpansion("Hello data-source://email");
    expect(m?.insert).toBe("{{email}}");
  });

  it("expands URLs on space", () => {
    const input = "Visit https://texlooper.dev";
    const r = applyTextExpansion(input, input.length, "space");
    expect(r?.text).toBe("Visit [texlooper.dev](https://texlooper.dev) ");
  });

  it("expands @field shorthand", () => {
    const input = "Hi @name";
    const r = applyTextExpansion(input, input.length, "space");
    expect(r?.text).toBe("Hi {{name}} ");
  });

  it("expands mailto links", () => {
    const m = matchTextExpansion("mailto:hello@example.com");
    expect(m?.insert).toBe("[hello@example.com](mailto:hello@example.com)");
  });
});
