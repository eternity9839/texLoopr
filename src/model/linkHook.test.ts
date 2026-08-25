import { describe, expect, it } from "vitest";
import { resolveLinkTarget } from "./linkHook";

describe("linkHook", () => {
  it("builds mailto and tel hrefs", () => {
    expect(
      resolveLinkTarget("mailto", "hello@example.com", { email: "x" }),
    ).toBe("mailto:hello@example.com");
    expect(resolveLinkTarget("tel", "5551234", {})).toBe("tel:5551234");
    expect(resolveLinkTarget("url", "example.com", {})).toBe(
      "https://example.com",
    );
    expect(resolveLinkTarget("anchor", "intro", {})).toBe("#intro");
  });

  it("resolves merge fields in targets", () => {
    expect(
      resolveLinkTarget("mailto", "{{email}}", { email: "a@b.co" }),
    ).toBe("mailto:a@b.co");
  });
});
