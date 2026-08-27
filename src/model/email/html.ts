import type { Block, BlockStyle } from "../document";
import type { DataRow } from "../bindings";
import { resolveTemplate } from "../bindings";
import type { RuntimeContext } from "../expr";
import { resolveDateBlockText } from "../dateBlock";
import {
  EMAIL_CONTENT_WIDTH,
  layoutEmailBlocks,
  type EmailLayoutItem,
} from "./layout";

export interface EmailHtmlOptions {
  row: DataRow;
  ctx: RuntimeContext;
  /** Map block id → cid for multipart/related */
  cidByBlockId?: Map<string, string>;
  /** Prefer data-URI in img src (iframe preview) */
  inlineDataUri?: boolean;
  contentWidth?: number;
  title?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function styleAttr(style: BlockStyle, extra?: string): string {
  const parts: string[] = [];
  if (style.fontSize) parts.push(`font-size:${style.fontSize}px`);
  if (style.fontWeight) parts.push(`font-weight:${style.fontWeight}`);
  if (style.fontStyle) parts.push(`font-style:${style.fontStyle}`);
  if (style.color) parts.push(`color:${style.color}`);
  if (style.textAlign) parts.push(`text-align:${style.textAlign}`);
  if (style.lineHeight) parts.push(`line-height:${style.lineHeight}`);
  if (style.background) parts.push(`background:${style.background}`);
  if (style.borderRadius != null)
    parts.push(`border-radius:${style.borderRadius}px`);
  if (style.padding != null) parts.push(`padding:${style.padding}px`);
  if (extra) parts.push(extra);
  return parts.join(";");
}

function resolveText(
  raw: string,
  row: DataRow,
  ctx: RuntimeContext,
): string {
  return resolveTemplate(raw, row, { missingAsEmpty: true, ctx });
}

function blockInnerHtml(
  block: Block,
  opts: EmailHtmlOptions,
): string | null {
  const { row, ctx, cidByBlockId, inlineDataUri } = opts;
  switch (block.type) {
    case "text":
    case "paragraph": {
      const raw = String(block.content.text ?? "");
      const text = resolveText(raw, row, ctx);
      const tag = block.type === "paragraph" ? "p" : "div";
      return `<${tag} style="${styleAttr(block.style, "margin:0;white-space:pre-wrap")}">${esc(text).replace(/\n/g, "<br/>")}</${tag}>`;
    }
    case "data": {
      const path = String(block.content.path ?? "");
      const text = path
        ? resolveText(`{{${path}}}`, row, ctx)
        : resolveText(String(block.content.text ?? ""), row, ctx);
      return `<div style="${styleAttr(block.style, "margin:0")}">${esc(text)}</div>`;
    }
    case "date": {
      const text = resolveDateBlockText(block.content, row, ctx) ?? "";
      return `<div style="${styleAttr(block.style, "margin:0")}">${esc(text)}</div>`;
    }
    case "link": {
      const label = resolveText(
        String(block.content.label ?? block.content.target ?? "Link"),
        row,
        ctx,
      );
      const href = resolveText(
        String(block.content.target ?? "#"),
        row,
        ctx,
      );
      return `<a href="${esc(href)}" style="${styleAttr(block.style, "color:#0b57d0")}">${esc(label)}</a>`;
    }
    case "picture": {
      const src = String(block.content.src ?? "");
      const alt = esc(
        resolveText(String(block.content.alt ?? ""), row, ctx) || "image",
      );
      const cid = cidByBlockId?.get(block.id);
      let imgSrc = src;
      if (cid && !inlineDataUri) imgSrc = `cid:${cid}`;
      if (!imgSrc) return null;
      const w = Math.round(block.w);
      return `<img src="${esc(imgSrc)}" alt="${alt}" width="${w}" style="display:block;max-width:100%;height:auto;border:0;${styleAttr(block.style)}" />`;
    }
    case "shape": {
      const bg = block.style.background ?? "#eef2f6";
      const h = Math.max(4, Math.round(block.h));
      return `<div style="height:${h}px;background:${bg};${styleAttr(block.style)}"></div>`;
    }
    case "table": {
      const cells = Array.isArray(block.content.cells)
        ? (block.content.cells as unknown[][])
        : [];
      if (!cells.length) return null;
      const rows = cells
        .map((r) => {
          const tds = (Array.isArray(r) ? r : [])
            .map((c) => {
              const text = resolveText(String(c ?? ""), row, ctx);
              return `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;${styleAttr(block.style)}">${esc(text)}</td>`;
            })
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>`;
    }
    case "list": {
      const items = Array.isArray(block.content.items)
        ? (block.content.items as unknown[])
        : [];
      if (!items.length) return null;
      const lis = items
        .map((it) => {
          const text =
            typeof it === "string"
              ? it
              : String((it as { text?: string })?.text ?? it);
          return `<li>${esc(resolveText(text, row, ctx))}</li>`;
        })
        .join("");
      return `<ul style="${styleAttr(block.style, "margin:0;padding-left:1.2em")}">${lis}</ul>`;
    }
    default:
      return null;
  }
}

function rowHtml(item: EmailLayoutItem, opts: EmailHtmlOptions): string {
  const inner = blockInnerHtml(item.block, opts);
  if (!inner) return "";
  const w = Math.round(item.block.w);
  return `<tr>
  <td style="padding:4px ${Math.max(0, item.padRight)}px 4px ${Math.max(0, item.padLeft)}px;">
    <table role="presentation" width="${w}" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:${w}px;max-width:100%;">
      <tr><td style="padding:0;">${inner}</td></tr>
    </table>
  </td>
</tr>`;
}

/** Build a full HTML email document from presented blocks. */
export function buildEmailHtml(
  blocks: Block[],
  opts: EmailHtmlOptions,
): string {
  const width = opts.contentWidth ?? EMAIL_CONTENT_WIDTH;
  const items = layoutEmailBlocks(blocks, width);
  const body = items.map((it) => rowHtml(it, opts)).filter(Boolean).join("\n");
  const title = esc(opts.title ?? "Message");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" style="width:${width}px;max-width:100%;background:#ffffff;border-collapse:collapse;">
        ${body || `<tr><td style="padding:24px;color:#666;font:14px sans-serif;">No email content for this row.</td></tr>`}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
