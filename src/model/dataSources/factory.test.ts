import { describe, expect, it } from "vitest";
import {
  loadDataSource,
  parseCsvRows,
  parseJsonRows,
  parseXmlRows,
} from "./factory";

describe("parseXmlRows", () => {
  it("maps repeating elements via rowPath", () => {
    const rows = parseXmlRows(
      `<catalog>
        <book id="1"><title>Ada</title></book>
        <book id="2"><title>Grace</title></book>
      </catalog>`,
      "catalog/book",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: "1", title: "Ada" });
    expect(rows[1]).toMatchObject({ id: "2", title: "Grace" });
  });

  it("auto-detects repeating children", () => {
    const rows = parseXmlRows(
      `<root><item name="a"/><item name="b"/><item name="c"/></root>`,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]?.name).toBe("a");
  });
});

describe("loadDataSource factory", () => {
  it("returns empty for none without existing rows", async () => {
    expect(await loadDataSource({ kind: "none" })).toEqual([]);
  });

  it("keeps existing rows for inbound", async () => {
    const rows = await loadDataSource(
      { kind: "inbound" },
      { existingRows: [{ name: "Ada" }] },
    );
    expect(rows).toEqual([{ name: "Ada" }]);
  });

  it("parses inline json / csv", async () => {
    expect(
      await loadDataSource({ kind: "json", inline: '[{"x":1}]' }),
    ).toEqual([{ x: 1 }]);
    expect(
      await loadDataSource({ kind: "csv", inline: "a,b\n1,2\n" }),
    ).toEqual([{ a: "1", b: "2" }]);
  });

  it("fetches http via injected fetchText", async () => {
    const rows = await loadDataSource(
      {
        kind: "http",
        url: "https://example.test/data.json",
        responseFormat: "json",
      },
      {
        fetchText: async () => '[{"ok":true}]',
      },
    );
    expect(rows).toEqual([{ ok: true }]);
  });

  it("rejects postgres sql", async () => {
    await expect(
      loadDataSource({
        kind: "sql",
        driver: "postgres",
        connection: "postgres://x",
        query: "SELECT 1",
      }),
    ).rejects.toThrow(/not implemented/i);
  });
});

describe("csv/json parsers", () => {
  it("rejects wrong formats", () => {
    expect(() => parseCsvRows('[{"a":1}]')).toThrow(/JSON/);
    expect(() => parseJsonRows("a,b\n1,2")).toThrow(/JSON/);
  });
});
