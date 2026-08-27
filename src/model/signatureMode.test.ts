import { describe, expect, it } from "vitest";
import { parseSignatureMode, resolveSignatureMode } from "./signatureMode";

describe("signatureMode", () => {
  it("parses explicit modes", () => {
    expect(parseSignatureMode("preset")).toBe("preset");
    expect(parseSignatureMode("prefilled")).toBe("preset");
    expect(parseSignatureMode("open")).toBe("open");
    expect(parseSignatureMode("other")).toBe("open");
  });

  it("infers from src when mode omitted", () => {
    expect(resolveSignatureMode({ src: "" })).toBe("open");
    expect(resolveSignatureMode({ src: "https://x/ink.png" })).toBe("preset");
    expect(resolveSignatureMode({ mode: "open", src: "https://x" })).toBe(
      "open",
    );
    expect(resolveSignatureMode({ mode: "preset", src: "" })).toBe("preset");
    expect(resolveSignatureMode({ mode: "prefilled", src: "" })).toBe("preset");
  });
});
