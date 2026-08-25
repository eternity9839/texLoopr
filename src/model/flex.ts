import { Block } from "./document";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Flex arrangement for container blocks (groups/repeats).
 *
 * When `group.style.layout === "flex"`, child blocks stop using their own
 * x/y/w/h and are arranged inside the group's content box (frame padding
 * respected) following CSS-like flex rules. Everything defaults to a
 * sensible stack so "not activated" stays the zero-config state.
 */
export function computeFlexRects(group: Block): Map<string, Rect> {
  const map = new Map<string, Rect>();
  if (group.style.layout !== "flex") return map;

  const kids = Array.isArray(group.content.blocks)
    ? (group.content.blocks as Block[])
    : [];
  if (kids.length === 0) return map;

  const pad = Math.max(0, group.style.padding ?? 0);
  const innerW = Math.max(0, group.w - pad * 2);
  const innerH = Math.max(0, group.h - pad * 2);
  const column = (group.style.direction ?? "column") === "column";

  const gap = Math.max(0, group.style.gap ?? 0);
  const justify = group.style.justify ?? "start";
  const align = group.style.alignItems ?? "stretch";

  const mainSize = column ? innerH : innerW;
  const crossSize = column ? innerW : innerH;
  const extent = (b: Block) => (column ? b.h : b.w);
  const crossExtent = (b: Block) => (column ? b.w : b.h);

  const total = kids.reduce((sum, b) => sum + extent(b), 0);
  let free = mainSize - total - gap * (kids.length - 1);
  if (free < 0) free = 0;

  let cursor = pad;
  if (justify === "center") cursor += free / 2;
  else if (justify === "end") cursor += free;
  // space-between folds `free` into the inter-child gaps instead

  const betweenGap =
    justify === "space-between" && kids.length > 1
      ? free / (kids.length - 1)
      : 0;

  for (const b of kids) {
    const mainPos = cursor;
    cursor += extent(b) + gap + betweenGap;

    let crossPos: number;
    let crossLen: number;
    if (align === "stretch") {
      crossPos = pad;
      crossLen = crossSize;
    } else {
      crossLen = crossExtent(b);
      if (align === "center") crossPos = pad + (crossSize - crossLen) / 2;
      else if (align === "end") crossPos = pad + crossSize - crossLen;
      else crossPos = pad;
    }

    map.set(
      b.id,
      column
        ? { x: crossPos, y: mainPos, w: crossLen, h: b.h }
        : { x: mainPos, y: crossPos, w: b.w, h: crossLen },
    );
  }
  return map;
}
