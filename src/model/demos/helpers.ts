import type { Block, BlockStyle, BlockType, Project } from "../document";
import { createId } from "../document";
import {
  defaultOutputs,
  defaultScripts,
  defaultWorkflow,
} from "../workflow";

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
  extras?: Partial<Pick<Project, "comments" | "scripts" | "workflow" | "outputs">>,
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
    activeOutputId: outputs[0]?.id,
    workflow: extras?.workflow ?? defaultWorkflow(),
    scripts: extras?.scripts ?? defaultScripts(),
    comments: extras?.comments ?? [],
  };
}

export function page(name: string, blocks: Block[]) {
  return { id: id(), name, blocks };
}
