import { describe, expect, it } from "vitest";
import { parseMergeSegments } from "./mergeSegments";

describe("parseMergeSegments", () => {
  it("splits plain text and merge tokens with filter labels", () => {
    const segs = parseMergeSegments("Hi {{name|upper}} — {{role}}");
    expect(segs).toEqual([
      { kind: "text", text: "Hi " },
      {
        kind: "merge",
        raw: "{{name|upper}}",
        path: "name",
        filters: ["upper"],
        label: "name · upper",
      },
      { kind: "text", text: " — " },
      {
        kind: "merge",
        raw: "{{role}}",
        path: "role",
        filters: [],
        label: "role",
      },
    ]);
  });

  it("normalizes paren filters in chip labels", () => {
    const segs = parseMergeSegments("{{price|mul(1.21)|currency(EUR)}}");
    expect(segs[0]).toMatchObject({
      kind: "merge",
      path: "price",
      filters: ["mul:1.21", "currency:EUR"],
    });
    expect((segs[0] as { label: string }).label).toContain("EUR");
  });

  it("leaves #if blocks as plain text", () => {
    const segs = parseMergeSegments("{{#if role}}yes{{/if}}");
    expect(segs.every((s) => s.kind === "text")).toBe(true);
  });

  it("returns a single text segment when there are no merges", () => {
    expect(parseMergeSegments("plain")).toEqual([
      { kind: "text", text: "plain" },
    ]);
  });
});
