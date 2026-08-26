import { describe, expect, it } from "vitest";
import { parseMergeSegments } from "./mergeSegments";

describe("parseMergeSegments", () => {
  it("splits plain text and merge tokens", () => {
    expect(parseMergeSegments("Hi {{name|upper}} — {{role}}")).toEqual([
      { kind: "text", text: "Hi " },
      {
        kind: "merge",
        raw: "{{name|upper}}",
        path: "name",
        label: "name",
      },
      { kind: "text", text: " — " },
      { kind: "merge", raw: "{{role}}", path: "role", label: "role" },
    ]);
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
