import { describe, expect, it } from "vitest";
import { resolveSignatureInk, signatureInkFromName } from "./signatureInk";

describe("signatureInk", () => {
  it("creates deterministic escaped SVG ink from a name", () => {
    const first = signatureInkFromName('Ada & "Lin" <CEO>');
    expect(first).toBe(signatureInkFromName('Ada & "Lin" <CEO>'));
    expect(first).toContain("data:image/svg+xml;charset=utf-8,");
    expect(decodeURIComponent(first)).toContain(
      "Ada &amp; &quot;Lin&quot; &lt;CEO&gt;",
    );
  });

  it("returns no ink for an empty name", () => {
    expect(signatureInkFromName("  ")).toBe("");
  });

  it("fills preset ink from name or the first caption line", () => {
    expect(
      decodeURIComponent(resolveSignatureInk({ mode: "preset", name: "Ada" })),
    ).toContain(">Ada</text>");
    expect(
      decodeURIComponent(
        resolveSignatureInk({
          mode: "prefilled",
          caption: "Grace Hopper\nRear Admiral",
        }),
      ),
    ).toContain(">Grace Hopper</text>");
  });

  it("replaces demo placeholders but preserves real and open signatures", () => {
    const demo =
      "data:image/svg+xml;charset=utf-8,%3Ctext%3EAuthorized%20signature%3C%2Ftext%3E";
    expect(
      decodeURIComponent(
        resolveSignatureInk({ mode: "preset", src: demo, name: "Ada" }),
      ),
    ).toContain(">Ada</text>");
    expect(
      resolveSignatureInk({
        mode: "preset",
        src: "https://cdn.example.com/ada.png",
        name: "Ada",
      }),
    ).toBe("https://cdn.example.com/ada.png");
    expect(resolveSignatureInk({ mode: "open", name: "Ada" })).toBe("");
  });
});
