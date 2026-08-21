import type {
  OutputProfile,
  ProjectScript,
  WorkflowStep,
} from "./workflow";
import {
  defaultOutputs,
  defaultScripts,
  defaultWorkflow,
} from "./workflow";

export type { OutputProfile, ProjectScript, WorkflowStep };

export type StudioView = "edit" | "data";

export type UiOverlay =
  | null
  | "settings"
  | "about"
  | "catalog"
  | "automation"
  | "samples";

/** @deprecated Legacy mode strings; migrated on load to StudioView / UiOverlay */
export type LegacyAppMode =
  | "project"
  | "edition"
  | "page"
  | "data"
  | "preview"
  | "settings"
  | "about";

export type AppMode = StudioView;

export type BlockType =
  | "paragraph"
  | "text"
  | "list"
  | "picture"
  | "shape"
  | "table"
  | "files"
  | "prebuild"
  | "group"
  /** @deprecated Prefer group + itemsPath; kept for demo documents */
  | "repeat";

export interface BlockStyle {
  fontSize?: number;
  fontWeight?: number | string;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  color?: string;
  textAlign?: "left" | "center" | "right";
  background?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  padding?: number;
}

export interface Block {
  id: string;
  type: BlockType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: Record<string, unknown>;
  style: BlockStyle;
  condition?: string;
  bindings?: Record<string, string>;
  /** Prevent move/resize when true */
  locked?: boolean;
  /** Stacking order within the page (higher = front) */
  zIndex?: number;
  /** Parent group id when nested (optional; children also live in content.blocks) */
  parentId?: string;
}

/** Saved reusable group (letterhead, address block, …) */
export interface CustomObject {
  id: string;
  name: string;
  createdAt: string;
  w: number;
  h: number;
  blocks: Block[];
  itemsPath?: string;
  itemVar?: string;
}

export interface Page {
  id: string;
  name: string;
  blocks: Block[];
}

/** Word-style review note anchored to a block (ADR 0006) */
export interface Comment {
  id: string;
  blockId: string;
  body: string;
  author: string;
  createdAt: string;
  resolved?: boolean;
}

export interface Project {
  name: string;
  author: string;
  subject: string;
  description: string;
  published: boolean;
  lastSaved: string | null;
  pages: Page[];
  activePageId: string;
  /** Named render/emit targets (ADR 0005) */
  outputs?: OutputProfile[];
  activeOutputId?: string;
  /** Ordered generation pipeline */
  workflow?: WorkflowStep[];
  /** Named expr/template scripts */
  scripts?: ProjectScript[];
  /** Review comments */
  comments?: Comment[];
  /** User-saved group recipes (letterhead, etc.) */
  customObjects?: CustomObject[];
  /** Extended document metadata */
  keywords?: string;
  language?: string;
  version?: string;
  category?: string;
  tags?: string;
  createdAt?: string;
  company?: string;
  contactEmail?: string;
  /** Free-form key=value lines (one per line) */
  customMeta?: string;
}

export type Selection =
  | { kind: "page"; id: string }
  | { kind: "block"; id: string }
  | null;

export type UiTheme = "stone" | "mist" | "dusk" | "nova";

export interface EditorPrefs {
  showGrid: boolean;
  snap: boolean;
  density: "comfortable" | "compact";
  /** Chrome appearance; paper stays light for WYSIWYG */
  theme?: UiTheme;
  showRulers?: boolean;
  showComments?: boolean;
  /** Pane widths (px) when expanded */
  navWidth?: number;
  toolsWidth?: number;
  inspectorWidth?: number;
  /** Icon-only rails */
  navCollapsed?: boolean;
  toolsCollapsed?: boolean;
  inspectorCollapsed?: boolean;
  /** Floating toolbox orientation over the canvas */
  toolsOrientation?: "vertical" | "horizontal";
}

/** Logical page size used by align tools (matches CSS tokens) */
export const PAGE_WIDTH = 720;
export const PAGE_HEIGHT = 960;

export const BLOCK_DEFAULTS: Record<
  BlockType,
  { name: string; w: number; h: number; content: Record<string, unknown> }
> = {
  paragraph: {
    name: "Paragraph",
    w: 280,
    h: 64,
    content: { text: "New paragraph. Bind data with {{field}}." },
  },
  text: {
    name: "Text",
    w: 180,
    h: 32,
    content: { text: "Short text" },
  },
  list: {
    name: "List",
    w: 200,
    h: 88,
    content: { items: ["First item", "Second item", "Third item"] },
  },
  picture: {
    name: "Picture",
    w: 160,
    h: 110,
    content: { src: "", alt: "Picture" },
  },
  shape: {
    name: "Shape",
    w: 96,
    h: 64,
    content: { shape: "rect" },
  },
  table: {
    name: "Table",
    w: 240,
    h: 96,
    content: {
      rows: 3,
      cols: 3,
      cells: [
        ["A1", "B1", "C1"],
        ["A2", "B2", "C2"],
        ["A3", "B3", "C3"],
      ],
    },
  },
  files: {
    name: "Files",
    w: 160,
    h: 48,
    content: { label: "Attached files", count: 0 },
  },
  prebuild: {
    name: "Prebuild",
    w: 200,
    h: 56,
    content: { template: "header", text: "Prebuilt section" },
  },
  group: {
    name: "Group",
    w: 240,
    h: 120,
    content: { blocks: [] },
  },
  repeat: {
    name: "Repeat",
    w: 340,
    h: 56,
    content: {
      itemsPath: "line_items",
      itemVar: "item",
      blocks: [],
    },
  },
};

export function createId(): string {
  return crypto.randomUUID();
}

/** Ensure older documents get default automation fields (ADR 0005). */
export function ensureProjectAutomation(project: Project): Project {
  const next = { ...project };
  if (!next.outputs?.length) {
    next.outputs = defaultOutputs();
  }
  if (
    !next.activeOutputId ||
    !next.outputs.some((o) => o.id === next.activeOutputId)
  ) {
    next.activeOutputId = next.outputs[0]?.id;
  }
  if (!next.workflow?.length) {
    next.workflow = defaultWorkflow();
  }
  if (!next.scripts?.length) {
    next.scripts = defaultScripts();
  }
  if (!next.comments) {
    next.comments = [];
  }
  return next;
}

export function createEmptyProject(): Project {
  const pageId = createId();
  const outputs = defaultOutputs();
  return {
    name: "Untitled project",
    author: "",
    subject: "",
    description: "",
    published: false,
    lastSaved: null,
    activePageId: pageId,
    pages: [{ id: pageId, name: "Page 1", blocks: [] }],
    outputs,
    activeOutputId: outputs[0]?.id,
    workflow: defaultWorkflow(),
    scripts: defaultScripts(),
    comments: [],
  };
}
