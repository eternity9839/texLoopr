/** Inline rich-text markers stored in block `content.text`. */

export type InlineFormat = "bold" | "italic" | "underline" | "strike";

export const INLINE_MARKERS: Record<InlineFormat, readonly [string, string]> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  underline: ["++", "++"],
  strike: ["~~", "~~"],
};

export interface FormatEditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Wrap, unwrap, or toggle inline markers around the textarea selection. */
export function toggleInlineFormat(
  value: string,
  start: number,
  end: number,
  format: InlineFormat,
): FormatEditResult {
  const [open, close] = INLINE_MARKERS[format];
  const openLen = open.length;
  const closeLen = close.length;

  const wrapped =
    start >= openLen &&
    end + closeLen <= value.length &&
    value.slice(start - openLen, start) === open &&
    value.slice(end, end + closeLen) === close;

  if (wrapped) {
    const text =
      value.slice(0, start - openLen) +
      value.slice(start, end) +
      value.slice(end + closeLen);
    return {
      text,
      selectionStart: start - openLen,
      selectionEnd: end - openLen,
    };
  }

  if (start === end) {
    const text = value.slice(0, start) + open + close + value.slice(end);
    const cursor = start + openLen;
    return { text, selectionStart: cursor, selectionEnd: cursor };
  }

  const text =
    value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end);
  return {
    text,
    selectionStart: start + openLen,
    selectionEnd: end + openLen,
  };
}

export function selectionHasFormat(
  value: string,
  start: number,
  end: number,
  format: InlineFormat,
): boolean {
  const [open, close] = INLINE_MARKERS[format];
  return (
    start >= open.length &&
    end + close.length <= value.length &&
    value.slice(start - open.length, start) === open &&
    value.slice(end, end + close.length) === close
  );
}
