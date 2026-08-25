import type { ComponentChildren } from "preact";

export type RichSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; label: string; href: string };

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Split resolved text into plain segments and markdown-style links. */
export function parseRichText(text: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) {
      segments.push({ kind: "text", value: text.slice(last, idx) });
    }
    segments.push({ kind: "link", label: m[1]!, href: m[2]! });
    last = idx + m[0]!.length;
  }
  if (last < text.length) {
    segments.push({ kind: "text", value: text.slice(last) });
  }
  return segments.length ? segments : [{ kind: "text", value: text }];
}

export function RichText({
  text,
  class: className,
}: {
  text: string;
  class?: string;
}) {
  const parts: ComponentChildren[] = [];
  for (const seg of parseRichText(text)) {
    if (seg.kind === "text") {
      parts.push(seg.value);
    } else {
      parts.push(
        <a
          key={`${seg.href}-${parts.length}`}
          class="rich-text__link"
          href={seg.href}
          target={seg.href.startsWith("#") ? undefined : "_blank"}
          rel={seg.href.startsWith("#") ? undefined : "noopener noreferrer"}
          onClick={(e) => e.stopPropagation()}
        >
          {seg.label}
        </a>,
      );
    }
  }
  return <span class={className ? `rich-text ${className}` : "rich-text"}>{parts}</span>;
}
