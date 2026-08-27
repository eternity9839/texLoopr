import { describe, expect, it } from "vitest";
import { createEmptyProject, createId } from "./document";
import { attachProjectDatasets, enrichPreviewContext } from "./runtime";
import { evaluateExpr, type RuntimeContext } from "./expr";
import { defaultOutputs } from "./workflow";
import { resolveTemplate } from "./bindings";

describe("attachProjectDatasets", () => {
  it("exposes datasets and nests a key-matched row onto data.<name>", () => {
    const project = createEmptyProject();
    const bankId = createId();
    project.datasets = [
      ...(project.datasets ?? []),
      {
        id: bankId,
        name: "bank",
        keyField: "currency",
        rows: [
          { currency: "EUR", iban: "BE68 1234", bic: "GKCCBEBB" },
          { currency: "USD", iban: "US64 SVBK", bic: "SVBKUS6S" },
        ],
      },
    ];

    const ctx: RuntimeContext = {
      data: { currency: "EUR", invoice_no: "INV-1" },
      output: { id: "o1", kind: "preview", name: "Preview" },
      device: { id: "screen", media: "screen", dpi: 96 },
      vars: {},
      env: { preview: true },
    };
    attachProjectDatasets(project, ctx, { currency: "EUR", invoice_no: "INV-1" });

    expect(ctx.datasets?.bank).toMatchObject({ keyField: "currency" });
    expect(ctx.data.bank).toMatchObject({ iban: "BE68 1234" });
    expect(resolveTemplate("{{bank.iban}}", { currency: "EUR" }, { ctx })).toBe(
      "BE68 1234",
    );
    expect(evaluateExpr("lookup('bank', currency, 'bic')", ctx)).toBe(
      "GKCCBEBB",
    );
  });

  it("does not nest when the key does not match", () => {
    const project = createEmptyProject();
    project.datasets = [
      {
        id: createId(),
        name: "bank",
        keyField: "currency",
        rows: [{ currency: "EUR", iban: "BE68" }],
      },
    ];
    const ctx = enrichPreviewContext(
      project,
      { currency: "GBP", invoice_no: "X" },
      defaultOutputs()[0]!,
    );
    expect(ctx.data.bank).toBeUndefined();
    expect(evaluateExpr("lookup('bank', currency, 'iban')", ctx)).toBeNull();
  });
});

describe("defaultOutputs", () => {
  it("includes Screen, Page, Email, Image — not SMS/push/API by default", () => {
    const kinds = defaultOutputs().map((o) => o.kind);
    expect(kinds).toContain("preview");
    expect(kinds).toContain("pdf");
    expect(kinds).toContain("image");
    expect(kinds).toContain("email");
    expect(kinds).not.toContain("sms");
    expect(kinds).not.toContain("mobile");
    expect(kinds).not.toContain("api");
    expect(defaultOutputs().find((o) => o.kind === "pdf")?.name).toBe("Page A4");
  });
});
