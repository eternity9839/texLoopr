import { describe, expect, it } from "vitest";
import {
  injectDocumentLanguage,
  resolveDocumentLanguage,
  withLanguageContext,
} from "./documentLanguage";
import type { RuntimeContext } from "./expr";
import { enrichPreviewContext } from "./runtime";
import { defaultOutputs } from "./workflow";
import type { Project } from "./document";

function emptyCtx(): RuntimeContext {
  return {
    data: {},
    output: {},
    device: {},
    vars: {},
    env: {},
  };
}

describe("documentLanguage", () => {
  it("prefers row language over project and lang over empty", () => {
    expect(
      resolveDocumentLanguage({ language: "en" }, { language: "FR" }),
    ).toBe("fr");
    expect(
      resolveDocumentLanguage({ language: "en" }, { lang: "nl" }),
    ).toBe("nl");
    expect(resolveDocumentLanguage({ language: "DE" }, {})).toBe("de");
    expect(resolveDocumentLanguage({}, undefined)).toBe("en");
  });

  it("injects vars.language and env.language", () => {
    const ctx = withLanguageContext(emptyCtx(), "FR");
    expect(ctx.vars.language).toBe("fr");
    expect(ctx.env.language).toBe("fr");
  });

  it("enrichPreviewContext seeds language from row", () => {
    const project = {
      language: "en",
      datasets: [],
      workflow: [],
    } as unknown as Project;
    const output = defaultOutputs().find((o) => o.kind === "pdf")!;
    const ctx = enrichPreviewContext(project, { language: "fr", name: "Ada" }, output);
    expect(ctx.vars.language).toBe("fr");
    expect(ctx.env.language).toBe("fr");
  });

  it("injectDocumentLanguage mutates context", () => {
    const ctx = emptyCtx();
    injectDocumentLanguage(ctx, { language: "en" }, { lang: "nl" });
    expect(ctx.vars.language).toBe("nl");
  });
});
