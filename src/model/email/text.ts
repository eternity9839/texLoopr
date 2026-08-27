import type { Block } from "../document";
import type { DataRow } from "../bindings";
import { resolveTemplate } from "../bindings";
import type { RuntimeContext } from "../expr";
import { resolveDateBlockText } from "../dateBlock";
import { layoutEmailBlocks } from "./layout";

function resolveText(
  raw: string,
  row: DataRow,
  ctx: RuntimeContext,
): string {
  return resolveTemplate(raw, row, { missingAsEmpty: true, ctx });
}

function blockPlain(
  block: Block,
  row: DataRow,
  ctx: RuntimeContext,
): string | null {
  switch (block.type) {
    case "text":
    case "paragraph":
      return resolveText(String(block.content.text ?? ""), row, ctx);
    case "data": {
      const path = String(block.content.path ?? "");
      return path
        ? resolveText(`{{${path}}}`, row, ctx)
        : resolveText(String(block.content.text ?? ""), row, ctx);
    }
    case "date":
      return resolveDateBlockText(block.content, row, ctx);
    case "link": {
      const label = resolveText(
        String(block.content.label ?? block.content.target ?? ""),
        row,
        ctx,
      );
      const href = resolveText(String(block.content.target ?? ""), row, ctx);
      return href ? `${label} <${href}>` : label;
    }
    case "list": {
      const items = Array.isArray(block.content.items)
        ? (block.content.items as unknown[])
        : [];
      return items
        .map((it) => {
          const text =
            typeof it === "string"
              ? it
              : String((it as { text?: string })?.text ?? it);
          return `• ${resolveText(text, row, ctx)}`;
        })
        .join("\n");
    }
    case "table": {
      const cells = Array.isArray(block.content.cells)
        ? (block.content.cells as unknown[][])
        : [];
      return cells
        .map((r) =>
          (Array.isArray(r) ? r : [])
            .map((c) => resolveText(String(c ?? ""), row, ctx))
            .join("\t"),
        )
        .join("\n");
    }
    case "picture": {
      const alt = resolveText(String(block.content.alt ?? "image"), row, ctx);
      return `[${alt}]`;
    }
    default:
      return null;
  }
}

/** Plain-text alternative for multipart email. */
export function buildEmailText(
  blocks: Block[],
  row: DataRow,
  ctx: RuntimeContext,
): string {
  const items = layoutEmailBlocks(blocks);
  const lines: string[] = [];
  for (const item of items) {
    const line = blockPlain(item.block, row, ctx);
    if (line != null && line.trim()) lines.push(line.trimEnd());
  }
  return lines.join("\n\n") || "(empty message)";
}
