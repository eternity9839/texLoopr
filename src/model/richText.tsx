import type { ComponentChildren, JSX } from "preact";

export type InlineNode =
  | { kind: "text"; value: string }
  | { kind: "strong"; children: InlineNode[] }
  | { kind: "em"; children: InlineNode[] }
  | { kind: "u"; children: InlineNode[] }
  | { kind: "del"; children: InlineNode[] }
  | { kind: "link"; label: string; href: string };

/** @deprecated use InlineNode */
export type RichSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; label: string; href: string };

const LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)/;

type MarkerSpec = {
  open: string;
  close: string;
  kind: InlineNode["kind"];
};

const MARKERS: MarkerSpec[] = [
  { open: "***", close: "***", kind: "strong" },
  { open: "**", close: "**", kind: "strong" },
  { open: "++", close: "++", kind: "u" },
  { open: "~~", close: "~~", kind: "del" },
  { open: "*", close: "*", kind: "em" },
  { open: "_", close: "_", kind: "em" },
];

function tryLink(text: string, i: number): { node: InlineNode; next: number } | null {
  const slice = text.slice(i);
  const m = slice.match(LINK_RE);
  if (!m) return null;
  return {
    node: { kind: "link", label: m[1]!, href: m[2]! },
    next: i + m[0]!.length,
  };
}

function tryMarker(text: string, i: number): { node: InlineNode; next: number } | null {
  for (const spec of MARKERS) {
    if (!text.startsWith(spec.open, i)) continue;
    const innerStart = i + spec.open.length;
    const closeAt = text.indexOf(spec.close, innerStart);
    if (closeAt < 0) continue;
    const inner = text.slice(innerStart, closeAt);
    if (spec.kind === "em" && spec.open === "*" && text.startsWith("**", i)) {
      continue;
    }
    if (spec.kind === "strong" && spec.open === "**" && text.startsWith("***", i)) {
      continue;
    }
    const children = parseInlineRichText(inner);
    let node: InlineNode;
    if (spec.open === "***") {
      node = {
        kind: "strong",
        children: [{ kind: "em", children }],
      };
    } else {
      node = { kind: spec.kind, children } as InlineNode;
    }
    return { node, next: closeAt + spec.close.length };
  }
  return null;
}

function nextSpecialIndex(text: string, from: number): number {
  const chars = ["[", "*", "_", "+", "~"];
  let next = -1;
  for (const ch of chars) {
    const idx = text.indexOf(ch, from);
    if (idx >= 0 && (next < 0 || idx < next)) next = idx;
  }
  return next;
}

/** Parse inline rich text: **bold**, *italic*, ++underline++, ~~strike~~, [label](url). */
export function parseInlineRichText(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;
  while (i < text.length) {
    const special = nextSpecialIndex(text, i);
    if (special < 0) {
      if (i < text.length) nodes.push({ kind: "text", value: text.slice(i) });
      break;
    }
    if (special > i) {
      nodes.push({ kind: "text", value: text.slice(i, special) });
      i = special;
    }
    const link = tryLink(text, i);
    if (link) {
      nodes.push(link.node);
      i = link.next;
      continue;
    }
    const marked = tryMarker(text, i);
    if (marked) {
      nodes.push(marked.node);
      i = marked.next;
      continue;
    }
    nodes.push({ kind: "text", value: text[i]! });
    i += 1;
  }
  return nodes.length ? nodes : [{ kind: "text", value: text }];
}

/** Legacy helper — links only. */
export function parseRichText(text: string): RichSegment[] {
  return parseInlineRichText(text).flatMap((node) => flattenLegacy(node));
}

function flattenLegacy(node: InlineNode): RichSegment[] {
  if (node.kind === "link") return [node];
  if (node.kind === "text") return [node];
  return node.children.flatMap(flattenLegacy);
}

/** Strip markup for plain-text export / search. */
export function richTextToPlain(text: string): string {
  return renderPlain(parseInlineRichText(text));
}

function renderPlain(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.kind === "text") return node.value;
      if (node.kind === "link") return node.label;
      return renderPlain(node.children);
    })
    .join("");
}

function renderNodes(nodes: InlineNode[], keyPrefix: string): ComponentChildren[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (node.kind === "text") return node.value;
    if (node.kind === "link") {
      const external = !node.href.startsWith("#");
      return (
        <a
          key={key}
          class="rich-text__link"
          href={node.href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {node.label}
        </a>
      );
    }
    const inner = renderNodes(node.children, key);
    const tag: Record<InlineNode["kind"], keyof JSX.IntrinsicElements | null> = {
      text: null,
      link: null,
      strong: "strong",
      em: "em",
      u: "span",
      del: "del",
    };
    if (node.kind === "u") {
      return (
        <span key={key} class="rich-text__u">
          {inner}
        </span>
      );
    }
    const Tag = tag[node.kind];
    if (!Tag) return inner;
    return <Tag key={key}>{inner}</Tag>;
  });
}

export function RichText({
  text,
  class: className,
}: {
  text: string;
  class?: string;
}) {
  const parts = renderNodes(parseInlineRichText(text), "rt");
  return (
    <span class={className ? `rich-text ${className}` : "rich-text"}>{parts}</span>
  );
}
