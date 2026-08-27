import { describe, expect, it } from "vitest";
import type { Block } from "./document";
import {
  pickVariant,
  resolveBlockPresentation,
  scoreVariant,
  type BlockVariant,
} from "./blockVariants";

function block(partial?: Partial<Block>): Block {
  return {
    id: "b1",
    type: "text",
    name: "Title",
    x: 0,
    y: 0,
    w: 100,
    h: 20,
    content: { text: "Hello" },
    style: { fontSize: 14, color: "#111" },
    ...partial,
  };
}

describe("scoreVariant", () => {
  it("scores both axes highest", () => {
    expect(scoreVariant({ language: "fr", output: "email" }, "fr", "email")).toBe(
      3,
    );
    expect(scoreVariant({ language: "fr" }, "fr", "email")).toBe(2);
    expect(scoreVariant({ output: "email" }, "fr", "email")).toBe(1);
    expect(scoreVariant({}, "fr", "email")).toBe(0);
  });

  it("rejects mismatches", () => {
    expect(scoreVariant({ language: "en" }, "fr", "email")).toBe(-1);
    expect(scoreVariant({ output: "pdf" }, "fr", "email")).toBe(-1);
  });
});

describe("resolveBlockPresentation", () => {
  const variants: BlockVariant[] = [
    {
      id: "v-email",
      output: "email",
      w: 560,
      content: { text: "Email hello" },
    },
    {
      id: "v-fr",
      language: "fr",
      content: { text: "Bonjour" },
      style: { color: "#c00" },
    },
    {
      id: "v-fr-email",
      language: "fr",
      output: "email",
      content: { text: "Bonjour email" },
      y: 40,
    },
  ];

  it("returns base when no variants match", () => {
    const b = block({ variants });
    expect(resolveBlockPresentation(b, "de", "sms").content.text).toBe("Hello");
  });

  it("prefers both-axes over language-only or output-only", () => {
    const b = block({ variants });
    const resolved = resolveBlockPresentation(b, "fr", "email");
    expect(resolved.content.text).toBe("Bonjour email");
    expect(resolved.y).toBe(40);
    expect(pickVariant(variants, "fr", "email")?.id).toBe("v-fr-email");
  });

  it("uses language-only when output has no dedicated variant", () => {
    const b = block({ variants });
    expect(resolveBlockPresentation(b, "fr", "pdf").content.text).toBe(
      "Bonjour",
    );
    expect(resolveBlockPresentation(b, "fr", "pdf").style.color).toBe("#c00");
  });

  it("uses output-only for matching channel", () => {
    const b = block({ variants });
    expect(resolveBlockPresentation(b, "en", "email").content.text).toBe(
      "Email hello",
    );
    expect(resolveBlockPresentation(b, "en", "email").w).toBe(560);
  });

  it("keeps the same block id", () => {
    const b = block({ variants });
    expect(resolveBlockPresentation(b, "fr", "email").id).toBe("b1");
  });
});
