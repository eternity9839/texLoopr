import type { DataRow } from "../bindings";
import type { ExprValue } from "../expr";

/**
 * Parse a simple XML document into rows.
 * - If `rowPath` is set (slash-separated, e.g. "catalog/book"), each matching
 *   element becomes a row (attributes + child text/elements as fields).
 * - Otherwise, pick the first tag name that repeats under the document element.
 */
export function parseXmlRows(raw: string, rowPath?: string): DataRow[] {
  const text = raw.trim();
  if (!text) return [];

  const doc = parseXmlDocument(text);
  if (!doc) throw new Error("Invalid XML");

  const elements = rowPath?.trim()
    ? selectByPath(doc, rowPath.trim())
    : autoRepeatElements(doc);

  return elements.map(elementToRow);
}

type XmlNode = {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
};

function parseXmlDocument(raw: string): XmlNode | null {
  const cleaned = raw.replace(/<\?xml[^?]*\?>/i, "").trim();
  const tokens = tokenize(cleaned);
  if (!tokens.length) return null;
  const { node, next } = parseElement(tokens, 0);
  if (!node || next < tokens.length) {
    // Allow trailing whitespace tokens only
    for (let i = next; i < tokens.length; i++) {
      const tok = tokens[i]!;
      if (tok.kind !== "text" || tok.value.trim()) return node;
    }
  }
  return node;
}

type Token =
  | { kind: "open"; tag: string; attrs: Record<string, string>; selfClosing: boolean }
  | { kind: "close"; tag: string }
  | { kind: "text"; value: string };

function tokenize(xml: string): Token[] {
  const tokens: Token[] = [];
  const re = /<\/?([A-Za-z_][\w:.-]*)([^>]*?)\/?>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[1] != null) {
      const full = m[0];
      const tag = m[1];
      if (full.startsWith("</")) {
        tokens.push({ kind: "close", tag });
      } else {
        const attrs = parseAttrs(m[2] ?? "");
        const selfClosing = /\/\s*>$/.test(full);
        tokens.push({ kind: "open", tag, attrs, selfClosing });
      }
    } else if (m[3] != null) {
      tokens.push({ kind: "text", value: decodeEntities(m[3]) });
    }
  }
  return tokens;
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    out[m[1]!] = decodeEntities(m[3] ?? m[4] ?? "");
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseElement(
  tokens: Token[],
  i: number,
): { node: XmlNode | null; next: number } {
  const t = tokens[i];
  if (!t || t.kind !== "open") return { node: null, next: i };
  if (t.selfClosing) {
    return {
      node: { tag: t.tag, attrs: t.attrs, children: [], text: "" },
      next: i + 1,
    };
  }
  const children: XmlNode[] = [];
  let text = "";
  let j = i + 1;
  while (j < tokens.length) {
    const cur = tokens[j]!;
    if (cur.kind === "close") {
      if (cur.tag !== t.tag) {
        throw new Error(`XML mismatch: expected </${t.tag}>, got </${cur.tag}>`);
      }
      return {
        node: {
          tag: t.tag,
          attrs: t.attrs,
          children,
          text: text.trim(),
        },
        next: j + 1,
      };
    }
    if (cur.kind === "text") {
      text += cur.value;
      j += 1;
      continue;
    }
    const child = parseElement(tokens, j);
    if (!child.node) break;
    children.push(child.node);
    j = child.next;
  }
  throw new Error(`XML unclosed <${t.tag}>`);
}

function selectByPath(root: XmlNode, path: string): XmlNode[] {
  const parts = path.split("/").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return [];
  let nodes: XmlNode[] = [root];
  // If path starts with root tag, skip it
  if (parts[0] === root.tag) parts.shift();
  for (const part of parts) {
    const next: XmlNode[] = [];
    for (const n of nodes) {
      for (const c of n.children) {
        if (c.tag === part) next.push(c);
      }
    }
    nodes = next;
    if (!nodes.length) return [];
  }
  return nodes;
}

function autoRepeatElements(root: XmlNode): XmlNode[] {
  const counts = new Map<string, XmlNode[]>();
  for (const c of root.children) {
    const list = counts.get(c.tag) ?? [];
    list.push(c);
    counts.set(c.tag, list);
  }
  let best: XmlNode[] = [];
  for (const list of counts.values()) {
    if (list.length > best.length) best = list;
  }
  if (best.length >= 2) return best;
  if (root.children.length === 1 && root.children[0]!.children.length) {
    return autoRepeatElements(root.children[0]!);
  }
  if (best.length === 1) return best;
  return root.children.length ? root.children : [root];
}

function elementToRow(el: XmlNode): DataRow {
  const row: DataRow = {};
  for (const [k, v] of Object.entries(el.attrs)) {
    row[k] = v;
  }
  if (el.children.length === 0) {
    if (el.text) row.value = el.text;
    return row;
  }
  const byTag = new Map<string, XmlNode[]>();
  for (const c of el.children) {
    const list = byTag.get(c.tag) ?? [];
    list.push(c);
    byTag.set(c.tag, list);
  }
  for (const [tag, list] of byTag) {
    if (list.length === 1) {
      const c = list[0]!;
      row[tag] = childValue(c);
    } else {
      row[tag] = list.map((c) => childValue(c));
    }
  }
  if (el.text && !Object.keys(row).length) row.value = el.text;
  return row;
}

function childValue(c: XmlNode): ExprValue {
  if (c.children.length === 0 && Object.keys(c.attrs).length === 0) {
    return c.text;
  }
  return elementToRow(c) as ExprValue;
}
