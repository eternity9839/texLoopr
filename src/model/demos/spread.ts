import type { Block } from "../document";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../document";
import { footerPin, headerPin } from "../geometry";

function includesAny(name: string, needles: string[]): boolean {
  const n = name.toLowerCase();
  return needles.some((k) => n === k || n.includes(k));
}

/**
 * Pin chrome so samples fill the surface: header bands, footers, rails.
 * Conservative — only renames/pins known chrome, never body copy.
 */
export function spreadDemoBlocks(
  blocks: Block[],
  opts: {
    headerNames?: string[];
    footerNames?: string[];
    railNames?: string[];
    pageW?: number;
    pageH?: number;
  } = {},
): Block[] {
  const pageW = opts.pageW ?? PAGE_WIDTH;
  const pageH = opts.pageH ?? PAGE_HEIGHT;
  const headers = (
    opts.headerNames ?? [
      "letterhead",
      "page header",
      "header bar",
      "masthead",
      "top rule",
    ]
  ).map((s) => s.toLowerCase());
  const footers = (
    opts.footerNames ?? [
      "footer",
      "confidential",
      "page footer",
      "legal",
      "references available",
      "page number",
    ]
  ).map((s) => s.toLowerCase());
  const rails = (
    opts.railNames ?? ["rail", "sidebar", "side rail"]
  ).map((s) => s.toLowerCase());

  return blocks.map((block) => {
    if (block.pin) return block;
    const name = block.name;
    const next = { ...block };

    if (includesAny(name, rails)) {
      next.pin = { left: true, top: true, bottom: true };
      next.h = pageH;
      next.y = 0;
      next.x = Math.min(block.x, 0);
      return next;
    }

    if (includesAny(name, headers)) {
      next.pin = headerPin();
      return next;
    }

    // Wide short band at the very top — treat as header chrome
    if (block.y <= 8 && block.w >= pageW * 0.85 && block.h <= 72) {
      next.pin = headerPin();
      return next;
    }

    if (includesAny(name, footers)) {
      next.pin = footerPin();
      next.y = Math.max(0, pageH - block.h - 28);
      return next;
    }

    return next;
  });
}
