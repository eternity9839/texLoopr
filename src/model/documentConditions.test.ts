import { describe, expect, it } from "vitest";
import {
  conditionChipValues,
  createProjectCondition,
  injectProjectConditions,
  resolveConditionValue,
} from "./documentConditions";
import type { RuntimeContext } from "./expr";

function emptyCtx(): RuntimeContext {
  return {
    data: {},
    output: {},
    device: {},
    vars: {},
    env: {},
  };
}

describe("documentConditions", () => {
  const status = createProjectCondition({
    name: "Status",
    var: "status",
    default: "open",
    values: [
      { label: "open", value: "open" },
      { label: "paid", value: "paid" },
    ],
  });

  it("resolves override → row → default", () => {
    expect(resolveConditionValue(status, { status: "paid" }, "past_due")).toBe(
      "past_due",
    );
    expect(resolveConditionValue(status, { status: "paid" })).toBe("paid");
    expect(resolveConditionValue(status, {})).toBe("open");
  });

  it("injects vars and env", () => {
    const ctx = emptyCtx();
    injectProjectConditions(
      ctx,
      { conditions: [status] },
      { status: "past_due" },
    );
    expect(ctx.vars.status).toBe("past_due");
    expect(ctx.env.status).toBe("past_due");
  });

  it("honors session override map by id", () => {
    const ctx = emptyCtx();
    injectProjectConditions(
      ctx,
      { conditions: [status] },
      { status: "open" },
      { [status.id]: "paid" },
    );
    expect(ctx.vars.status).toBe("paid");
  });

  it("discovers chip values from rows and pins", () => {
    const chips = conditionChipValues(status, [
      { status: "open" },
      { status: "past_due" },
      { status: "paid" },
    ]);
    expect(chips.map((c) => c.value)).toEqual(
      expect.arrayContaining(["open", "paid", "past_due"]),
    );
  });
});
