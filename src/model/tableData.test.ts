import { describe, expect, it } from "vitest";
import type { RuntimeContext } from "./expr";
import {
  fieldKeyFromHeader,
  mapTableItemToCells,
  resolveTableSourceRows,
  tableColumnTemplates,
} from "./tableData";

const runtime: RuntimeContext = {
  data: { invoice_no: "INV-1", currency: "EUR", decision_date: "2026-08-28" },
  output: { id: "o1", kind: "preview", name: "Preview" },
  device: { id: "screen", media: "screen", dpi: 96 },
  vars: {},
  env: { preview: true },
  datasets: {
    lines: {
      keyField: "invoice_no",
      rows: [
        { invoice_no: "INV-1", description: "Platform", qty: 1, amount: 2000 },
        { invoice_no: "INV-1", description: "Seats", qty: 12, amount: 480 },
        { invoice_no: "INV-2", description: "Other", qty: 1, amount: 99 },
      ],
    },
    bank: {
      keyField: "currency",
      rows: [
        { currency: "EUR", iban: "BE68" },
        { currency: "USD", iban: "US64" },
      ],
    },
  },
};

describe("tableData", () => {
  it("slugs header labels to field keys", () => {
    expect(fieldKeyFromHeader("Amount (EUR)")).toBe("amount_eur");
    expect(fieldKeyFromHeader("{{description}}")).toBe("description");
    expect(fieldKeyFromHeader("Rate|currency:EUR")).toBe("rate");
  });

  it("loads rows from a named dataset filtered by keyField", () => {
    const rows = resolveTableSourceRows(
      { datasetName: "lines" },
      { invoice_no: "INV-1" },
      runtime,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]!.description).toBe("Platform");
  });

  it("returns all dataset rows when the primary lacks the key field", () => {
    const rows = resolveTableSourceRows(
      { datasetName: "lines" },
      { name: "Ada" },
      runtime,
    );
    expect(rows).toHaveLength(3);
  });

  it("returns empty when dataset name is unknown", () => {
    expect(
      resolveTableSourceRows({ datasetName: "missing" }, {}, runtime),
    ).toEqual([]);
  });

  it("prefers datasetName over sourcePath when both are set", () => {
    const rows = resolveTableSourceRows(
      {
        datasetName: "bank",
        sourcePath: "line_items",
      },
      { currency: "EUR", line_items: [{ description: "ignored" }] },
      runtime,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.iban).toBe("BE68");
  });

  it("loads nested arrays via sourcePath", () => {
    const rows = resolveTableSourceRows(
      { sourcePath: "line_items" },
      {
        line_items: [
          { description: "A", amount: 1 },
          { description: "B", amount: 2 },
        ],
      },
      runtime,
    );
    expect(rows).toHaveLength(2);
  });

  it("parses JSON-string line_items on the primary row", () => {
    const rows = resolveTableSourceRows(
      { sourcePath: "line_items" },
      {
        line_items: JSON.stringify([{ description: "JSON", amount: 9 }]),
      },
      runtime,
    );
    expect(rows).toEqual([{ description: "JSON", amount: 9 }]);
  });

  it("synthesizes column templates from headers when no template row", () => {
    const tpl = tableColumnTemplates(
      [["Description", "Qty", "Amount"]],
      true,
    );
    expect(tpl).toEqual([
      "{{description}}",
      "{{qty}}",
      "{{amount}}",
    ]);
  });

  it("uses template row for column mapping", () => {
    const tpl = tableColumnTemplates(
      [
        ["Description", "Qty", "Amount"],
        ["{{description}}", "{{qty}}", "{{amount|currency:EUR}}"],
      ],
      true,
    );
    expect(tpl[0]).toBe("{{description}}");
    const cells = mapTableItemToCells(
      { description: "Platform", qty: 1, amount: 2000 },
      tpl,
      true,
      runtime,
    );
    expect(cells[0]).toBe("Platform");
    expect(cells[1]).toBe("1");
    expect(cells[2]).toMatch(/2[,.]?000|€/);
  });

  it("falls back to parent ctx fields when the item lacks them", () => {
    const cells = mapTableItemToCells(
      { topic: "Goals" },
      ["{{topic}}", "Notes by {{decision_date}}"],
      true,
      runtime,
    );
    expect(cells[0]).toBe("Goals");
    expect(cells[1]).toContain("2026-08-28");
  });

  it("reads literal headers as field keys when templates have no braces", () => {
    const cells = mapTableItemToCells(
      { Description: "Fee", qty: 2 },
      ["Description", "qty"],
      true,
      runtime,
    );
    expect(cells[0]).toBe("Fee");
    expect(cells[1]).toBe("2");
  });

  it("forces literal columns with = prefix (skips field lookup)", () => {
    const cells = mapTableItemToCells(
      { Notes: "from data" },
      ["=Fixed note", "{{Notes}}"],
      true,
      runtime,
    );
    expect(cells[0]).toBe("Fixed note");
    expect(cells[1]).toBe("from data");
  });

  it("keeps = templates when deriving column templates", () => {
    expect(
      tableColumnTemplates(
        [
          ["A", "B"],
          ["{{a}}", "=N/A"],
        ],
        true,
      ),
    ).toEqual(["{{a}}", "=N/A"]);
  });
});
