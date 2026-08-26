import { describe, expect, it } from "vitest";
import { evaluateExpr, evaluateConditionExpr } from "./expr";
import type { RuntimeContext } from "./expr";
import { resolveTemplate, evaluateCondition } from "./bindings";
import { runWorkflow } from "./runtime";
import { createDemoProject } from "./demos/library";
import { defaultOutputs, optionalOutputTemplates } from "./workflow";

const ctx: RuntimeContext = {
  data: { name: "Ada", role: "Math", company: "AE" },
  output: { id: "o1", kind: "print", name: "Label" },
  device: { id: "label-203dpi", media: "label", dpi: 203 },
  vars: { region: "eu" },
  env: { preview: true },
};

describe("evaluateExpr", () => {
  it("compares output and device", () => {
    expect(
      evaluateExpr("output.kind == 'print' && device.media == 'label'", ctx),
    ).toBe(true);
    expect(evaluateExpr("output.kind == 'pdf'", ctx)).toBe(false);
  });

  it("supports helpers", () => {
    expect(evaluateExpr("empty(data.missing)", ctx)).toBe(true);
    expect(evaluateExpr("upper(data.name)", ctx)).toBe("ADA");
    expect(evaluateExpr("includes(data.company, 'a')", ctx)).toBe(true);
  });

  it("looks up a linked dataset row by key", () => {
    const withDs: RuntimeContext = {
      ...ctx,
      data: { ...ctx.data, employee_id: "E1" },
      datasets: {
        salary: {
          keyField: "employee_id",
          rows: [
            { employee_id: "E1", amount: 72000 },
            { employee_id: "E2", amount: 64000 },
          ],
        },
      },
    };
    expect(evaluateExpr("lookup('salary', employee_id, 'amount')", withDs)).toBe(
      72000,
    );
    expect(evaluateExpr("lookup('salary', 'E2', 'amount')", withDs)).toBe(64000);
  });

  it("supports or/and/not", () => {
    expect(evaluateExpr("!empty(data.name) && (output.kind == 'api' || device.dpi >= 200)", ctx)).toBe(
      true,
    );
  });
});

describe("template filters", () => {
  it("applies upper and default", () => {
    expect(
      resolveTemplate("{{name|upper}} / {{x|default:n/a}}", { name: "ada" }),
    ).toBe("ADA / n/a");
  });

  it("resolves device paths from context", () => {
    expect(
      resolveTemplate("{{device.dpi}}dpi", {}, { ctx, missingAsEmpty: true }),
    ).toBe("203dpi");
  });

  it("supports #if branches", () => {
    expect(
      resolveTemplate("{{#if name}}Hi {{name}}{{else}}anon{{/if}}", {
        name: "Ada",
      }),
    ).toBe("Hi Ada");
  });
});

describe("evaluateCondition with expressions", () => {
  it("keeps legacy field checks", () => {
    expect(evaluateCondition("role", { role: "x" })).toBe(true);
    expect(evaluateCondition("!role", {})).toBe(true);
  });

  it("evaluates rich expressions", () => {
    expect(
      evaluateCondition("output.kind == 'print'", ctx.data, ctx),
    ).toBe(true);
    expect(evaluateConditionExpr("false", ctx)).toBe(false);
  });
});

describe("runWorkflow", () => {
  it("runs demo project against print output", () => {
    const project = createDemoProject();
    const print = optionalOutputTemplates().find((o) => o.kind === "print")!;
    const result = runWorkflow({
      project,
      row: { name: "Ada", company: "AE", role: "Math" },
      output: print,
      preview: false,
    });
    expect(result.skippedRow).toBe(false);
    expect(result.ok).toBe(true);
    expect(result.emit?.kind).toBe("print");
    expect(result.scriptResults["script-greeting"]).toContain("ADA");
  });

  it("skips empty names via filter", () => {
    const project = createDemoProject();
    const preview = defaultOutputs().find((o) => o.kind === "preview")!;
    const result = runWorkflow({
      project,
      row: { name: "", company: "x" },
      output: preview,
      preview: true,
    });
    expect(result.skippedRow).toBe(true);
  });
});
