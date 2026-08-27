import type { Block, BlockStyle, BlockType, Page, Project } from "../document";
import { createId } from "../document";
import {
  defaultOutputs,
  defaultScripts,
  defaultWorkflow,
} from "../workflow";
import { spreadDemoBlocks } from "./spread";

export function id(): string {
  return createId();
}

export function b(
  type: BlockType,
  partial: Omit<Partial<Block>, "type" | "content" | "style"> & {
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    content?: Record<string, unknown>;
    style?: BlockStyle;
    condition?: string;
    pin?: Block["pin"];
    variants?: Block["variants"];
  },
): Block {
  return {
    id: id(),
    type,
    name: partial.name,
    x: partial.x,
    y: partial.y,
    w: partial.w,
    h: partial.h,
    content: partial.content ?? {},
    style: partial.style ?? {},
    condition: partial.condition,
    locked: partial.locked,
    zIndex: partial.zIndex,
    pin: partial.pin,
    variants: partial.variants,
  };
}

export function shell(
  meta: {
    name: string;
    author: string;
    subject: string;
    description: string;
  },
  pages: Project["pages"],
  extras?: Partial<
    Pick<
      Project,
      | "comments"
      | "scripts"
      | "workflow"
      | "outputs"
      | "activeOutputId"
      | "artboard"
      | "datasets"
      | "primaryDatasetId"
      | "textStyles"
      | "documentStyles"
      | "language"
      | "conditions"
      | "pageChrome"
      | "customObjects"
    >
  >,
): Project {
  const outputs = extras?.outputs ?? defaultOutputs();
  return {
    name: meta.name,
    author: meta.author,
    subject: meta.subject,
    description: meta.description,
    published: false,
    lastSaved: null,
    activePageId: pages[0]!.id,
    pages,
    outputs,
    activeOutputId: extras?.activeOutputId ?? outputs[0]?.id,
    workflow: extras?.workflow ?? defaultWorkflow(),
    scripts: extras?.scripts ?? defaultScripts(),
    comments: extras?.comments ?? [],
    artboard: extras?.artboard ?? "document",
    datasets: extras?.datasets,
    primaryDatasetId: extras?.primaryDatasetId,
    textStyles: extras?.textStyles,
    documentStyles: extras?.documentStyles,
    language: extras?.language,
    conditions: extras?.conditions,
    pageChrome: extras?.pageChrome,
    customObjects: extras?.customObjects,
  };
}

export function page(
  name: string,
  blocks: Block[],
  extras?: Partial<
    Pick<
      Page,
      | "background"
      | "margins"
      | "watermark"
      | "pageNumber"
      | "rotate"
      | "mirrorX"
      | "mirrorY"
      | "condition"
    >
  > & { spread?: boolean },
) {
  const { spread = true, ...pageExtras } = extras ?? {};
  const nextBlocks = spread ? spreadDemoBlocks(blocks) : blocks;
  return { id: id(), name, blocks: nextBlocks, ...pageExtras };
}
