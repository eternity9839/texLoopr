import { describe, expect, it } from "vitest";
import {
  estimateCellHeight,
  estimateTableHeight,
  parseTableHeightMode,
} from "./tableLayout";
import {
  bandNeedsHeight,
  composeChromeBlocks,
  ensurePageChrome,
  mapChromeBandToPage,
  toBandLocalBlocks,
} from "./pageChrome";
import type { Block } from "./document";
import { createId } from "./document";

describe("tableLayout", () => {
  it("parses height mode", () => {
    expect(parseTableHeightMode("auto")).toBe("auto");
    expect(parseTableHeightMode("fixed")).toBe("fixed");
    expect(parseTableHeightMode(undefined)).toBe("fixed");
  });

  it("clamps row height between min and max", () => {
    const short = estimateCellHeight("Hi", 200, {
      fontSize: 12,
      lineHeight: 1.4,
      cellPadding: 6,
      rowMinHeight: 40,
      rowMaxHeight: 80,
    });
    expect(short).toBeGreaterThanOrEqual(40);
    const tall = estimateCellHeight("line\n".repeat(40), 80, {
      fontSize: 12,
      lineHeight: 1.4,
      cellPadding: 4,
      rowMinHeight: 20,
      rowMaxHeight: 60,
    });
    expect(tall).toBe(60);
  });

  it("sums row heights for a matrix", () => {
    const h = estimateTableHeight(
      [
        ["A", "B"],
        ["C\nD", "E"],
      ],
      {
        tableWidth: 280,
        cols: 2,
        rowMinHeight: 28,
        rowMaxHeight: 0,
        cellPadding: 6,
      },
    );
    expect(h).toBeGreaterThan(56);
  });
});

describe("pageChrome", () => {
  const mk = (partial: Partial<Block> & { name: string }): Block => ({
    id: createId(),
    type: "text",
    name: partial.name,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    w: partial.w ?? 100,
    h: partial.h ?? 20,
    content: partial.content ?? { text: "x" },
    style: {},
  });

  it("maps header and footer to absolute page coords", () => {
    const chrome = ensurePageChrome({
      header: {
        enabled: true,
        height: 80,
        blocks: [mk({ name: "H", x: 10, y: 12, h: 20 })],
      },
      footer: {
        enabled: true,
        height: 40,
        blocks: [mk({ name: "F", x: 10, y: 8, h: 16 })],
      },
    });
    const headerAbs = mapChromeBandToPage(chrome.header, "header", 960);
    expect(headerAbs[0]!.y).toBe(12);
    const footerAbs = mapChromeBandToPage(chrome.footer, "footer", 960);
    expect(footerAbs[0]!.y).toBe(960 - 40 + 8);
    const all = composeChromeBlocks(chrome, 960);
    expect(all).toHaveLength(2);
  });

  it("ignores disabled bands", () => {
    expect(
      composeChromeBlocks(
        {
          header: { enabled: false, height: 80, blocks: [mk({ name: "H" })] },
        },
        960,
      ),
    ).toHaveLength(0);
  });

  it("converts absolute blocks to band-local", () => {
    const local = toBandLocalBlocks(
      [mk({ name: "F", x: 40, y: 920, h: 20 })],
      "footer",
      960,
      48,
    );
    expect(local[0]!.y).toBe(960 - 48 > 920 ? 920 - (960 - 48) : Math.max(0, 920 - (960 - 48)));
    expect(bandNeedsHeight(local, 48)).toBeGreaterThanOrEqual(48);
  });
});
