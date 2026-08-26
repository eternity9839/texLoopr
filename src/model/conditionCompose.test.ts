import { describe, expect, it } from "vitest";
import {
  conditionHasClause,
  joinConditionClauses,
  splitConditionClauses,
  toggleConditionClause,
} from "./conditionCompose";

describe("conditionCompose", () => {
  it("splits and joins && clauses", () => {
    expect(splitConditionClauses("  a &&  b  ")).toEqual(["a", "b"]);
    expect(joinConditionClauses(["a", "b"])).toBe("a && b");
    expect(splitConditionClauses("")).toEqual([]);
    expect(splitConditionClauses(null)).toEqual([]);
  });

  it("toggles clauses on and off", () => {
    expect(toggleConditionClause("", "vars.language == 'fr'")).toBe(
      "vars.language == 'fr'",
    );
    expect(
      toggleConditionClause(
        "output.kind == 'pdf'",
        "vars.language == 'fr'",
      ),
    ).toBe("output.kind == 'pdf' && vars.language == 'fr'");
    expect(
      toggleConditionClause(
        "output.kind == 'pdf' && vars.language == 'fr'",
        "vars.language == 'fr'",
      ),
    ).toBe("output.kind == 'pdf'");
    expect(
      toggleConditionClause("vars.language == 'fr'", "vars.language == 'fr'"),
    ).toBe("");
  });

  it("normalizes whitespace when matching", () => {
    expect(
      conditionHasClause("vars.language  ==  'fr'", "vars.language == 'fr'"),
    ).toBe(true);
  });
});
