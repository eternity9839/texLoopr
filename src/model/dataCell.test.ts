import { describe, expect, it } from "vitest";
import {
  cellDisplaySummary,
  formatCellEditor,
  isObjectArray,
  nestedTableHeaders,
  parseCellEditor,
} from "./dataCell";

describe("dataCell", () => {
  it("summarizes object arrays without [object Object]", () => {
    const items = [
      { sku: "A", qty: 1 },
      { sku: "B", qty: 2 },
    ];
    expect(cellDisplaySummary(items)).toBe("2 items · sku, qty");
    expect(cellDisplaySummary(items)).not.toContain("[object Object]");
  });

  it("formats and parses nested JSON for the editor", () => {
    const prev = [{ sku: "X" }];
    const text = formatCellEditor(prev);
    expect(text).toContain('"sku"');
    expect(parseCellEditor(text, prev)).toEqual(prev);
  });

  it("detects object arrays for nested tables", () => {
    expect(isObjectArray([{ a: 1 }, { b: 2 }])).toBe(true);
    expect(isObjectArray([1, 2])).toBe(false);
    expect(isObjectArray([])).toBe(false);
  });

  it("collects nested table headers across rows", () => {
    expect(
      nestedTableHeaders([{ sku: "a", qty: 1 }, { sku: "b", amount: 9 }]),
    ).toEqual(expect.arrayContaining(["sku", "qty", "amount"]));
  });
});
