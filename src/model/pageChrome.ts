import type {
  Block,
  BlockPin,
  PageChromeBand,
  PageChromeSlot,
  ProjectPageChrome,
} from "./document";
import { DEFAULT_MARGINS, createId } from "./document";

export function emptyChromeBand(
  height = DEFAULT_MARGINS.top,
): PageChromeBand {
  return { enabled: false, height, blocks: [] };
}

export function ensurePageChrome(
  chrome: ProjectPageChrome | undefined | null,
): ProjectPageChrome {
  return {
    header: chrome?.header
      ? {
          enabled: Boolean(chrome.header.enabled),
          height: Math.max(24, Number(chrome.header.height) || DEFAULT_MARGINS.top),
          blocks: [...(chrome.header.blocks ?? [])],
          background: chrome.header.background,
        }
      : emptyChromeBand(DEFAULT_MARGINS.top),
    footer: chrome?.footer
      ? {
          enabled: Boolean(chrome.footer.enabled),
          height: Math.max(
            24,
            Number(chrome.footer.height) || DEFAULT_MARGINS.bottom,
          ),
          blocks: [...(chrome.footer.blocks ?? [])],
          background: chrome.footer.background,
        }
      : emptyChromeBand(DEFAULT_MARGINS.bottom),
  };
}

/** Map band-local blocks to absolute page coordinates. */
export function mapChromeBandToPage(
  band: PageChromeBand | undefined,
  slot: PageChromeSlot,
  pageH: number,
): Block[] {
  if (!band?.enabled || !band.blocks.length) return [];
  const originY = slot === "header" ? 0 : Math.max(0, pageH - band.height);
  return band.blocks.map((b) => ({
    ...b,
    x: b.x,
    y: originY + b.y,
    pin: undefined,
  }));
}

export function composeChromeBlocks(
  chrome: ProjectPageChrome | undefined,
  pageH: number,
): Block[] {
  const ensured = ensurePageChrome(chrome);
  return [
    ...mapChromeBandToPage(ensured.header, "header", pageH),
    ...mapChromeBandToPage(ensured.footer, "footer", pageH),
  ];
}

export function findChromeBlock(
  chrome: ProjectPageChrome | undefined,
  blockId: string,
): { slot: PageChromeSlot; block: Block; index: number } | null {
  if (!chrome) return null;
  for (const slot of ["header", "footer"] as const) {
    const band = chrome[slot];
    if (!band) continue;
    const index = band.blocks.findIndex((b) => b.id === blockId);
    if (index >= 0) return { slot, block: band.blocks[index]!, index };
  }
  return null;
}

/** Convert absolute page blocks into band-local geometry for a slot. */
export function toBandLocalBlocks(
  blocks: Block[],
  slot: PageChromeSlot,
  pageH: number,
  bandHeight: number,
): Block[] {
  const originY = slot === "header" ? 0 : Math.max(0, pageH - bandHeight);
  return blocks.map((b) => {
    const { pin: _pin, ...rest } = b;
    void _pin;
    return {
      ...rest,
      id: b.id || createId(),
      y: Math.max(0, b.y - originY),
      pin: undefined as BlockPin | undefined,
    };
  });
}

export function bandNeedsHeight(blocks: Block[], fallback: number): number {
  let max = fallback;
  for (const b of blocks) {
    max = Math.max(max, b.y + b.h);
  }
  return Math.max(24, Math.ceil(max));
}
