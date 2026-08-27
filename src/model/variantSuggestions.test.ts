import { describe, expect, it } from "vitest";
import {
  dynamicConditionPresets,
  suggestLanguages,
  suggestOutputs,
} from "./variantSuggestions";
import type { Project } from "./document";

describe("variantSuggestions", () => {
  it("suggests languages from project and rows only", () => {
    expect(
      suggestLanguages({ language: "fr" }, [
        { language: "de" },
        { lang: "nl" },
        { language: "fr" },
      ]),
    ).toEqual(["fr", "de", "nl"]);
  });

  it("suggests outputs from enabled project profiles", () => {
    const project = {
      outputs: [
        { id: "1", kind: "pdf", enabled: true },
        { id: "2", kind: "email", enabled: true },
        { id: "3", kind: "print", enabled: false },
        { id: "4", kind: "custom-fax", enabled: true },
      ],
    } as unknown as Project;
    expect(suggestOutputs(project).map((o) => o.value)).toEqual([
      "pdf",
      "email",
      "custom-fax",
    ]);
  });

  it("builds condition chips without a fixed language catalog", () => {
    const project = {
      language: "pt",
      outputs: [{ id: "1", kind: "pdf", enabled: true }],
      conditions: [
        {
          id: "c1",
          name: "Status",
          var: "status",
          values: [{ label: "Open", value: "open" }],
        },
      ],
    } as unknown as Project;
    const chips = dynamicConditionPresets(project, []);
    expect(chips.some((c) => c.value.includes("vars.status"))).toBe(true);
    expect(chips.some((c) => c.value === "vars.language == 'pt'")).toBe(true);
    expect(chips.some((c) => c.value === "output.kind == 'pdf'")).toBe(true);
    expect(chips.some((c) => c.value.includes("'en'"))).toBe(false);
  });
});
