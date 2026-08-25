/** Emmet-style expansions while typing in text fields (Space / Tab / Enter). */

export type ExpansionTrigger = "space" | "tab" | "enter";

export interface TextExpansionMatch {
  /** Characters at the end of the prefix to replace (excluding trigger). */
  eat: number;
  /** Inserted text (trigger appended by caller when needed). */
  insert: string;
}

function hostFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host || url;
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0] ?? url;
  }
}

/** Map data-source path to merge field path (supports future source/field). */
export function dataSourceToFieldPath(path: string): string {
  const p = path.trim().replace(/^\/+/, "");
  if (!p) return "field";
  if (p.includes("/")) {
    const [source, ...rest] = p.split("/");
    const field = rest.join(".");
    return field ? `${source}.${field}` : source!;
  }
  return p;
}

const RULES: {
  id: string;
  re: RegExp;
  expand: (m: RegExpMatchArray) => string;
}[] = [
  {
    id: "mailto",
    re: /mailto:[^\s<>"']+$/i,
    expand: (m) => {
      const href = m[0]!;
      const addr = href.replace(/^mailto:/i, "");
      return `[${addr}](${href})`;
    },
  },
  {
    id: "tel",
    re: /tel:[^\s<>"']+$/i,
    expand: (m) => {
      const href = m[0]!;
      const num = href.replace(/^tel:/i, "");
      return `[${num}](${href})`;
    },
  },
  {
    id: "sms",
    re: /sms:[^\s<>"']+$/i,
    expand: (m) => {
      const href = m[0]!;
      const num = href.replace(/^sms:/i, "");
      return `[${num}](${href})`;
    },
  },
  {
    id: "url",
    re: /https?:\/\/[^\s<>"']+$/i,
    expand: (m) => {
      const url = m[0]!;
      return `[${hostFromUrl(url)}](${url})`;
    },
  },
  {
    id: "data-source",
    re: /data-source:\/\/([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*)$/,
    expand: (m) => `{{${dataSourceToFieldPath(m[1]!)}}}`,
  },
  {
    id: "data",
    re: /data:\/\/([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*)$/,
    expand: (m) => `{{${dataSourceToFieldPath(m[1]!)}}}`,
  },
  {
    id: "field-shorthand",
    re: /(?:^|[\s([{])@([a-zA-Z_][a-zA-Z0-9_.-]*)$/,
    expand: (m) => {
      const lead = m[0]!.slice(0, m[0]!.length - m[1]!.length - 1);
      return `${lead}{{${m[1]!}}}`;
    },
  },
];

/** Match an expansion at the end of `prefix` (text before cursor). */
export function matchTextExpansion(prefix: string): TextExpansionMatch | null {
  for (const rule of RULES) {
    const m = prefix.match(rule.re);
    if (!m) continue;
    return { eat: m[0]!.length, insert: rule.expand(m) };
  }
  return null;
}

export function applyTextExpansion(
  fullText: string,
  cursor: number,
  trigger: ExpansionTrigger,
): { text: string; cursor: number } | null {
  if (cursor < 0 || cursor > fullText.length) return null;
  const prefix = fullText.slice(0, cursor);
  const match = matchTextExpansion(prefix);
  if (!match) return null;

  const nextPrefix =
    prefix.slice(0, prefix.length - match.eat) + match.insert;
  const suffix = fullText.slice(cursor);
  const spacer = trigger === "space" ? " " : trigger === "enter" ? "\n" : "";
  const text = nextPrefix + spacer + suffix;
  const cursorPos = nextPrefix.length + spacer.length;
  return { text, cursor: cursorPos };
}

export const TEXT_EXPANSION_HINTS = [
  { pattern: "https://… + Space", result: "[host](url) link" },
  { pattern: "data-source://email + Space", result: "{{email}}" },
  { pattern: "data://field + Space", result: "{{field}}" },
  { pattern: "@name + Space", result: "{{name}}" },
  { pattern: "mailto:… · tel:… · sms:… + Space", result: "[label](href)" },
] as const;
