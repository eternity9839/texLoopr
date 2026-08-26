import { resolveTemplate, type DataRow } from "./bindings";
import type { RuntimeContext } from "./expr";
import { resolveBindingPreview } from "./bindingPreview";
import { mergeChipLabel, parseFilterPipe } from "./templateFilters";

export type MergeSegment =
  | { kind: "text"; text: string }
  | {
      kind: "merge";
      raw: string;
      path: string;
      filters: string[];
      label: string;
    };

const MERGE_RE = /\{\{(?!#|\/)([^{}]+)\}\}/g;

/** Split plain text and {{path}} / {{path|filter}} tokens (not #if blocks). */
export function parseMergeSegments(text: string): MergeSegment[] {
  const out: MergeSegment[] = [];
  let last = 0;
  const re = new RegExp(MERGE_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", text: text.slice(last, m.index) });
    }
    const inner = m[1]!.trim();
    const { path, filters } = parseFilterPipe(inner);
    out.push({
      kind: "merge",
      raw: m[0]!,
      path,
      filters,
      label: mergeChipLabel(path, filters),
    });
    last = m.index + m[0]!.length;
  }
  if (last < text.length) {
    out.push({ kind: "text", text: text.slice(last) });
  }
  if (!out.length) out.push({ kind: "text", text });
  return out;
}

export function segmentPreviewValue(
  seg: Extract<MergeSegment, { kind: "merge" }>,
  row: DataRow | undefined,
  ctx?: RuntimeContext,
): string | null {
  return resolveBindingPreview(seg.raw, row, ctx);
}

export function resolveFullText(
  text: string,
  row: DataRow | undefined,
  ctx?: RuntimeContext,
): string {
  return resolveTemplate(text, row, { missingAsEmpty: true, ctx });
}
