import { describe, expect, it } from "vitest";
import {
  indentedTextToListItems,
  listItemsToIndentedText,
  normalizeListItems,
  resolveListItems,
} from "./listData";

describe("listData", () => {
  it("normalizes flat strings and nested objects", () => {
    expect(normalizeListItems(["a", "b"])).toEqual([
      { text: "a" },
      { text: "b" },
    ]);
    expect(
      normalizeListItems([
        { text: "Root", children: [{ label: "Child" }] },
      ]),
    ).toEqual([{ text: "Root", children: [{ text: "Child" }] }]);
  });

  it("round-trips indented text", () => {
    const text = "One\n\tNested\n\t\tDeep\nTwo";
    const nodes = indentedTextToListItems(text);
    expect(nodes).toEqual([
      {
        text: "One",
        children: [{ text: "Nested", children: [{ text: "Deep" }] }],
      },
      { text: "Two" },
    ]);
    expect(listItemsToIndentedText(nodes)).toBe(text);
  });

  it("resolves hierarchy from sourcePath objects", () => {
    const row = {
      menu: [
        {
          label: "Fruit",
          children: [{ label: "Apple" }, { label: "Pear" }],
        },
        { label: "Bread" },
      ],
    } as Record<string, unknown>;
    const nodes = resolveListItems(
      {
        sourcePath: "menu",
        itemText: "{{label}}",
        childrenPath: "children",
      },
      row as never,
    );
    expect(nodes).toEqual([
      {
        text: "Fruit",
        children: [{ text: "Apple" }, { text: "Pear" }],
      },
      { text: "Bread" },
    ]);
  });
});
