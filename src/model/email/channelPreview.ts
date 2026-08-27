import type { Block, Project } from "../document";
import type { DataRow } from "../bindings";
import {
  blockMeetsCondition,
  pageMeetsCondition,
  resolveTemplate,
} from "../bindings";
import type { OutputProfile } from "../workflow";
import { enrichPreviewContext } from "../runtime";
import { resolveDocumentLanguage } from "../documentLanguage";
import { resolveBlockPresentation } from "../blockVariants";
import { flattenBlocksForPreview } from "../groups";
import type { ConditionOverrides } from "../documentConditions";
import type { RuntimeContext } from "../expr";
import { layoutEmailBlocks } from "./layout";
import { resolveDateBlockText } from "../dateBlock";

export interface PresentedChannelContent {
  language: string;
  blocks: Block[];
  ctx: RuntimeContext;
  row: DataRow;
}

/** Visible blocks for the active output (conditions + language×output variants). */
export function collectPresentedBlocks(opts: {
  project: Project;
  row: DataRow;
  output: OutputProfile;
  languageOverride?: string | null;
  conditionOverrides?: ConditionOverrides | null;
}): PresentedChannelContent {
  const { project, row, output } = opts;
  const language = resolveDocumentLanguage(
    project,
    row,
    opts.languageOverride,
  );
  const ctx = enrichPreviewContext(
    project,
    row,
    output,
    {},
    opts.languageOverride,
    opts.conditionOverrides,
  );

  const pages = (project.pages ?? []).filter((p) =>
    pageMeetsCondition(p, row, ctx, { preview: true }),
  );

  const blocks = pages.flatMap((page) => {
    const visible = page.blocks.filter((b) =>
      blockMeetsCondition(b, row, ctx, { preview: true }),
    );
    const withVariants = visible.map((b) =>
      resolveBlockPresentation(b, language, output.kind),
    );
    return flattenBlocksForPreview(withVariants, row, ctx).blocks;
  });

  return { language, blocks, ctx, row };
}

/**
 * Resolve merge templates for channel previews.
 * Preview keeps unresolved `{{fields}}` visible; emit can blank them.
 */
export function resolveChannelText(
  raw: string,
  row: DataRow,
  ctx: RuntimeContext,
  mode: "preview" | "emit" = "preview",
): string {
  return resolveTemplate(raw, row, {
    missingAsEmpty: mode === "emit",
    diagnose: mode === "preview",
    ctx,
  });
}

function blockPlain(
  block: Block,
  row: DataRow,
  ctx: RuntimeContext,
  mode: "preview" | "emit",
): string | null {
  const resolve = (raw: string) => resolveChannelText(raw, row, ctx, mode);
  switch (block.type) {
    case "text":
    case "paragraph":
      return resolve(String(block.content.text ?? ""));
    case "data": {
      const path = String(block.content.path ?? "");
      return path
        ? resolve(`{{${path}}}`)
        : resolve(String(block.content.text ?? ""));
    }
    case "date":
      return resolveDateBlockText(block.content, row, ctx);
    case "link": {
      const label = resolve(
        String(block.content.label ?? block.content.target ?? ""),
      );
      const href = resolve(String(block.content.target ?? ""));
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
          return `• ${resolve(text)}`;
        })
        .filter((t) => t.trim().length > 1)
        .join("\n");
    }
    case "table": {
      const cells = Array.isArray(block.content.cells)
        ? (block.content.cells as unknown[][])
        : [];
      return cells
        .map((r) =>
          (Array.isArray(r) ? r : [])
            .map((c) => resolve(String(c ?? "")))
            .join("\t"),
        )
        .join("\n");
    }
    case "picture": {
      const alt = resolve(String(block.content.alt ?? "image"));
      return `[${alt}]`;
    }
    default:
      return null;
  }
}

/** Plain SMS / notification body from presented blocks (flow order). */
export function buildSmsText(
  blocks: Block[],
  row: DataRow,
  ctx: RuntimeContext,
  mode: "preview" | "emit" = "preview",
): string {
  const items = layoutEmailBlocks(blocks);
  const lines: string[] = [];
  for (const item of items) {
    const line = blockPlain(item.block, row, ctx, mode);
    if (line != null && line.trim()) lines.push(line.trimEnd());
  }
  return lines.join("\n\n") || (mode === "preview" ? "{{message}}" : "");
}

export interface SmsArtifacts {
  text: string;
  language: string;
  to: string;
  charCount: number;
  segmentHint: string;
}

export function buildSmsArtifacts(opts: {
  project: Project;
  row: DataRow;
  output: OutputProfile;
  languageOverride?: string | null;
  conditionOverrides?: ConditionOverrides | null;
}): SmsArtifacts {
  const presented = collectPresentedBlocks(opts);
  const text = buildSmsText(
    presented.blocks,
    presented.row,
    presented.ctx,
    "preview",
  );
  const to = String(
    opts.row.phone ?? opts.row.mobile ?? opts.row.to ?? "+00 000 000 000",
  );
  const charCount = [...text].length;
  const segments = charCount === 0 ? 0 : Math.ceil(charCount / 160);
  return {
    text,
    language: presented.language,
    to,
    charCount,
    segmentHint:
      segments <= 1
        ? `${charCount} / 160`
        : `${charCount} chars · ${segments} segments`,
  };
}
