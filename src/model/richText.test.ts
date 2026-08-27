import { describe, expect, it } from "vitest";
import { parseInlineRichText, richTextToPlain } from "./richText";

describe("parseInlineRichText", () => {
  it("parses bold and italic", () => {
    const nodes = parseInlineRichText("**AWS** and *Azure*");
    expect(nodes).toEqual([
      { kind: "strong", children: [{ kind: "text", value: "AWS" }] },
      { kind: "text", value: " and " },
      { kind: "em", children: [{ kind: "text", value: "Azure" }] },
    ]);
  });

  it("parses links alongside emphasis", () => {
    const nodes = parseInlineRichText("See [docs](https://example.com) for **details**");
    expect(nodes[1]).toEqual({
      kind: "link",
      label: "docs",
      href: "https://example.com",
    });
  });

  it("leaves merge fields untouched", () => {
    expect(richTextToPlain("Hello {{name}} **bold**")).toBe("Hello {{name}} bold");
  });

  it("parses underline and strike", () => {
    const nodes = parseInlineRichText("++under++ and ~~gone~~");
    expect(nodes[0]).toEqual({
      kind: "u",
      children: [{ kind: "text", value: "under" }],
    });
    expect(nodes[2]).toEqual({
      kind: "del",
      children: [{ kind: "text", value: "gone" }],
    });
  });
});
