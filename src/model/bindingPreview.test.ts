import { describe, expect, it } from "vitest";
import {
  bindingPreviewLabel,
  hasMergeBinding,
  resolveBindingPreview,
} from "./bindingPreview";

describe("bindingPreview", () => {
  it("detects merge bindings", () => {
    expect(hasMergeBinding("{{name}}")).toBe(true);
    expect(hasMergeBinding("https://x.com")).toBe(false);
  });

  it("labels bound paths", () => {
    expect(bindingPreviewLabel("{{email|default:x}}")).toBe("email");
  });

  it("resolves static and bound previews", () => {
    expect(resolveBindingPreview("https://a.test", { name: "A" })).toBe(
      "https://a.test",
    );
    expect(
      resolveBindingPreview("{{name}}", { name: "Ada" }),
    ).toBe("Ada");
    expect(resolveBindingPreview("{{name}}", undefined)).toBeNull();
  });
});
