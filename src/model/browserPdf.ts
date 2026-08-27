import type { Project, Page, Block } from "./document";
import { CANVAS_PRESETS, PAGE_WIDTH, PAGE_HEIGHT } from "./document";
import type { DataRow } from "./bindings";
import {
  blockMeetsCondition,
  pageMeetsCondition,
} from "./bindings";
import type { OutputProfile } from "./workflow";
import { enrichPreviewContext } from "./runtime";
import { resolveDocumentLanguage } from "./documentLanguage";
import { resolveBlockPresentation } from "./blockVariants";
import { flattenBlocksForPreview } from "./groups";
import type { ConditionOverrides } from "./documentConditions";
import type { RuntimeContext } from "./expr";
import { effectiveZ } from "./layerStack";

export type BrowserPdfPage = {
  page: Page;
  blocks: Block[];
  itemContexts: Map<string, RuntimeContext>;
  width: number;
  height: number;
};

export type BrowserPdfDocumentModel = {
  pages: BrowserPdfPage[];
  row: DataRow;
  runtime: RuntimeContext;
};

function artboardSize(project: Project): { w: number; h: number } {
  const id = project.artboard ?? "document";
  const preset = CANVAS_PRESETS[id] ?? CANVAS_PRESETS.document;
  return { w: preset?.w ?? PAGE_WIDTH, h: preset?.h ?? PAGE_HEIGHT };
}

/** Build flattened page models matching canvas preview for print export. */
export function buildBrowserPdfDocument(opts: {
  project: Project;
  row: DataRow;
  output: OutputProfile;
  languageOverride?: string | null;
  conditionOverrides?: ConditionOverrides | null;
}): BrowserPdfDocumentModel {
  const { project, row, output } = opts;
  const language = resolveDocumentLanguage(
    project,
    row,
    opts.languageOverride,
  );
  const runtime = enrichPreviewContext(
    project,
    row,
    output,
    {},
    opts.languageOverride,
    opts.conditionOverrides,
  );
  const { w, h } = artboardSize(project);
  const pages: BrowserPdfPage[] = [];

  for (const page of project.pages ?? []) {
    if (!pageMeetsCondition(page, row, runtime, { preview: true })) continue;
    const visible = page.blocks.filter((b) =>
      blockMeetsCondition(b, row, runtime, { preview: true }),
    );
    const presented = visible.map((b) =>
      resolveBlockPresentation(b, language, output.kind),
    );
    const flat = flattenBlocksForPreview(presented, row, runtime);
    const blocks = [...flat.blocks].sort(
      (a, b) => effectiveZ(a) - effectiveZ(b) || a.id.localeCompare(b.id),
    );
    pages.push({
      page,
      blocks,
      itemContexts: flat.itemContexts,
      width: w,
      height: h,
    });
  }

  return { pages, row, runtime };
}
