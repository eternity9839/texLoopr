import type { Block, BlockStyle } from "../document";
import type { DataRow } from "../bindings";
import type { RuntimeContext } from "../expr";
import { resolveDateBlockText } from "../dateBlock";
import { parseLinkHook, resolveLinkTarget } from "../linkHook";
import { resolveSignatureMode } from "../signatureMode";
import { resolveSignatureInk } from "../signatureInk";
import {
  EMAIL_CONTENT_WIDTH,
  layoutEmailBlocks,
  type EmailLayoutItem,
} from "./layout";
import { resolveChannelText } from "./channelPreview";

export interface EmailHtmlOptions {
  row: DataRow;
  ctx: RuntimeContext;
  /** Map block id → cid for multipart/related */
  cidByBlockId?: Map<string, string>;
  /** Prefer data-URI in img src (iframe preview) */
  inlineDataUri?: boolean;
  contentWidth?: number;
  title?: string;
  preheader?: string;
  /**
   * preview — keep unresolved {{fields}} and mark them in HTML.
   * emit — blank missing fields for deliverable .eml HTML.
   */
  mode?: "preview" | "emit";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape text but highlight leftover {{merge}} tokens for preview fidelity. */
function formatHtmlText(text: string, mode: "preview" | "emit"): string {
  if (mode !== "preview") {
    return esc(text).replace(/\n/g, "<br/>");
  }
  const parts: string[] = [];
  const re = /\{\{\s*[^}]+\s*\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) {
      parts.push(esc(text.slice(last, m.index)).replace(/\n/g, "<br/>"));
    }
    parts.push(
      `<span style="background:#fff4ce;border:1px dashed #b08900;border-radius:3px;padding:0 3px;font-family:ui-monospace,monospace;font-size:0.92em;color:#6b4f00;">${esc(m[0])}</span>`,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(esc(text.slice(last)).replace(/\n/g, "<br/>"));
  }
  return parts.join("") || "&nbsp;";
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
  mode: "preview" | "emit",
): string {
  return resolveChannelText(raw, row, ctx, mode);
}

function blockInnerHtml(
  block: Block,
  opts: EmailHtmlOptions,
): string | null {
  const { row, ctx, cidByBlockId, inlineDataUri } = opts;
  const mode = opts.mode ?? "emit";
  switch (block.type) {
    case "text":
    case "paragraph": {
      const raw = String(block.content.text ?? "");
      const text = resolveText(raw, row, ctx, mode);
      const tag = block.type === "paragraph" ? "p" : "div";
      return `<${tag} style="${styleAttr(block.style, "margin:0;white-space:pre-wrap")}">${formatHtmlText(text, mode)}</${tag}>`;
    }
    case "data": {
      const path = String(block.content.path ?? "");
      const text = path
        ? resolveText(`{{${path}}}`, row, ctx, mode)
        : resolveText(String(block.content.text ?? ""), row, ctx, mode);
      return `<div style="${styleAttr(block.style, "margin:0")}">${formatHtmlText(text, mode)}</div>`;
    }
    case "date": {
      const text = resolveDateBlockText(block.content, row, ctx) ?? "";
      return `<div style="${styleAttr(block.style, "margin:0")}">${formatHtmlText(text, mode)}</div>`;
    }
    case "link": {
      const label = resolveText(
        String(block.content.label ?? block.content.target ?? "Link"),
        row,
        ctx,
        mode,
      );
      const hook = parseLinkHook(block.content.hook);
      const href = resolveLinkTarget(
        hook,
        String(block.content.target ?? ""),
        row,
        ctx,
      );
      return `<a href="${esc(href)}" style="${styleAttr(block.style, "display:inline-block;padding:10px 18px;border-radius:4px;background:#0b57d0;color:#ffffff;text-decoration:none;font-weight:600")}">${formatHtmlText(label, mode)}</a>`;
    }
    case "picture": {
      const src = String(block.content.src ?? "");
      const alt = esc(
        resolveText(String(block.content.alt ?? ""), row, ctx, mode) || "image",
      );
      const cid = cidByBlockId?.get(block.id);
      let imgSrc = src;
      if (cid && !inlineDataUri) imgSrc = `cid:${cid}`;
      if (!imgSrc) return null;
      const w = Math.min(Math.round(block.w), EMAIL_CONTENT_WIDTH - 48);
      return `<img src="${esc(imgSrc)}" alt="${alt}" width="${w}" style="display:block;max-width:100%;height:auto;border:0;${styleAttr(block.style)}" />`;
    }
    case "signature": {
      const caption = resolveText(
        String(block.content.caption ?? ""),
        row,
        ctx,
        mode,
      );
      const name = resolveText(String(block.content.name ?? ""), row, ctx, mode);
      const src = resolveSignatureInk({
        mode: resolveSignatureMode(block.content),
        src: resolveText(String(block.content.src ?? ""), row, ctx, mode),
        caption,
        name,
      });
      if (!src && !caption) return null;
      const image = src
        ? `<img src="${esc(src)}" alt="${esc(caption.split(/\r?\n/, 1)[0] || "Signature")}" style="display:block;max-width:240px;max-height:72px;height:auto;border:0;" />`
        : "";
      const captionHtml = caption
        ? `<div style="${styleAttr(block.style, "margin-top:6px")}">${formatHtmlText(caption, mode)}</div>`
        : "";
      return `${image}${captionHtml}`;
    }
    case "shape": {
      const bg = block.style.background ?? "#eef2f6";
      // Canvas spacers/hero bars must not create tall empty email regions.
      const h = Math.min(Math.max(3, Math.round(block.h)), 36);
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
              const text = resolveText(String(c ?? ""), row, ctx, mode);
              return `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;${styleAttr(block.style)}">${formatHtmlText(text, mode)}</td>`;
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
          return `<li>${formatHtmlText(resolveText(text, row, ctx, mode), mode)}</li>`;
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
  const w = item.contentWidth;
  const padTop = item.gapTop;
  return `<tr>
  <td style="padding:${padTop}px ${Math.max(0, item.padRight)}px 0 ${Math.max(0, item.padLeft)}px;">
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
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(opts.preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#e8eaed;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8eaed;">
  <tr>
    <td align="center" style="padding:16px 8px;">
      <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" style="width:${width}px;max-width:100%;background:#ffffff;border-collapse:collapse;border-radius:4px;">
        ${body || `<tr><td style="padding:28px 24px;color:#666;font:14px sans-serif;">No email content for this row.</td></tr>`}
        <tr><td style="padding:16px 24px 24px;"></td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
