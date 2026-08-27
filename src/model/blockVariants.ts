import type { Block, BlockStyle } from "./document";
import { createId } from "./document";

/** Presentation override keyed by free-form language and/or output kind strings. */
export interface BlockVariant {
  id: string;
  /** Omit = any language; free-form (e.g. en, fr, de-AT) */
  language?: string;
  /** Omit = any output; free-form (matches output.kind string) */
  output?: string;
  content?: Record<string, unknown>;
  style?: Partial<BlockStyle>;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

function normLang(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim().toLowerCase();
  return s || undefined;
}

/**
 * Specificity score for a variant against the active language/output.
 * - both axes match: 3
 * - language only: 2
 * - output only: 1
 * - no match / empty axes that conflict: -1
 * Base (no variant) is treated as 0 by the resolver.
 */
export function scoreVariant(
  v: Pick<BlockVariant, "language" | "output">,
  language: string,
  outputKind: string,
): number {
  const lang = normLang(v.language);
  const out = v.output ? String(v.output) : undefined;
  const langMatch = lang == null || lang === normLang(language);
  const outMatch = out == null || out === outputKind;
  if (!langMatch || !outMatch) return -1;
  if (lang != null && out != null) return 3;
  if (lang != null) return 2;
  if (out != null) return 1;
  return 0;
}

export function pickVariant(
  variants: BlockVariant[] | undefined,
  language: string,
  outputKind: string,
): BlockVariant | null {
  if (!variants?.length) return null;
  let best: BlockVariant | null = null;
  let bestScore = 0;
  for (const v of variants) {
    const score = scoreVariant(v, language, outputKind);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

/** Apply the winning language×output variant onto a copy of the block. */
export function resolveBlockPresentation(
  block: Block,
  language: string,
  outputKind: string,
): Block {
  const hit = pickVariant(block.variants, language, outputKind);
  if (!hit) return block;
  return {
    ...block,
    x: hit.x ?? block.x,
    y: hit.y ?? block.y,
    w: hit.w ?? block.w,
    h: hit.h ?? block.h,
    content: hit.content
      ? { ...block.content, ...hit.content }
      : block.content,
    style: hit.style ? { ...block.style, ...hit.style } : block.style,
  };
}

export function resolveBlocksPresentation(
  blocks: Block[],
  language: string,
  outputKind: string,
): Block[] {
  return blocks.map((b) => resolveBlockPresentation(b, language, outputKind));
}

export function createEmptyVariant(
  partial?: Partial<BlockVariant>,
): BlockVariant {
  return {
    id: createId(),
    ...partial,
  };
}
