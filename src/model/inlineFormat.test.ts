import { describe, expect, it } from "vitest";
import {
  selectionHasFormat,
  toggleInlineFormat,
} from "./inlineFormat";

describe("inlineFormat", () => {
  it("wraps a selection with bold markers", () => {
    const r = toggleInlineFormat("Hello world", 6, 11, "bold");
    expect(r.text).toBe("Hello **world**");
    expect(r.selectionStart).toBe(8);
    expect(r.selectionEnd).toBe(13);
  });

  it("unwraps when markers already wrap the selection", () => {
    const r = toggleInlineFormat("Hello **world**", 8, 13, "bold");
    expect(r.text).toBe("Hello world");
  });

  it("detects active format around selection", () => {
    expect(selectionHasFormat("**AWS**", 2, 5, "bold")).toBe(true);
    expect(selectionHasFormat("AWS", 0, 3, "bold")).toBe(false);
  });
});
