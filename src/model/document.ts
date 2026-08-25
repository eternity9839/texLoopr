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

/** Marker/numbering outlook for list blocks */
export type ListStyle =
  | "disc"
  | "circle"
  | "square"
  | "decimal"
  | "upper-roman"
  | "lower-alpha"
  | "none";

export const LIST_STYLES: { value: ListStyle; label: string }[] = [
  { value: "disc", label: "Bullet •" },
  { value: "circle", label: "Circle ◦" },
  { value: "square", label: "Square ▪" },
  { value: "decimal", label: "Numbered 1." },
  { value: "upper-roman", label: "Roman I." },
  { value: "lower-alpha", label: "Letters a." },
  { value: "none", label: "Plain (no marker)" },
];

/** Font presets available to block typography (see FONT_STACKS) */
export type FontPreset = "doc" | "ui" | "mono" | "inter" | "display";

export const FONT_STACKS: Record<FontPreset, string> = {
  doc: '"Source Serif 4", Georgia, serif',
  ui: '"Sora", "Segoe UI", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  inter: '"Inter", "Segoe UI", sans-serif',
  display: '"Playfair Display", "Source Serif 4", serif',
};

export const FONT_OPTIONS: { value: FontPreset; label: string }[] = [
  { value: "doc", label: "Document — Source Serif" },
  { value: "ui", label: "Studio — Sora" },
  { value: "inter", label: "Inter" },
  { value: "display", label: "Display — Playfair" },
  { value: "mono", label: "Monospace" },
];

export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type VerticalAlign = "top" | "middle" | "bottom";
export type PictureFit = "cover" | "contain" | "fill";
export type ShapeVariant = "rect" | "ellipse" | "line";

export interface BlockStyle {
  fontSize?: number;
  fontWeight?: number | string;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  color?: string;
  textAlign?: "left" | "center" | "right";
  /** First-line indent in px */
  textIndent?: number;
  lineHeight?: number;
  letterSpacing?: number;
  background?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  padding?: number;
  /** Outlook of list blocks */
  listStyle?: ListStyle;
  /** Font family preset */
  fontFamily?: FontPreset;
  textTransform?: TextTransform;
  verticalAlign?: VerticalAlign;
  /** Soft drop shadow under the block surface */
  shadow?: boolean;
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

/** Page margins in px (logical units, same as block geometry) */
export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_MARGINS: PageMargins = {
  top: 64,
  right: 56,
  bottom: 72,
  left: 56,
};

export type WatermarkKind = "text" | "draft" | "confidential";

export interface Watermark {
  /** Preset wording; plain custom text when omitted */
  kind?: WatermarkKind;
  text?: string;
  /** Watermark font size in px */
  fontSize?: number;
  /** Rotation in degrees */
  angle?: number;
  opacity?: number;
  color?: string;
}

export interface Page {
  id: string;
  name: string;
  blocks: Block[];
  /** Print margins shown as guides; used by margin-aligned inserts */
  margins?: PageMargins;
  /** Page backdrop behind all blocks (subtle tint or brand paper) */
  background?: string;
  /** Draft/confidential watermark rendered under blocks */
  watermark?: Watermark;
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
  /** Height of the bottom properties dock (px) */
  propsHeight?: number;
  /** Bottom dock collapsed to a slim bar */
  propsCollapsed?: boolean;
  /** Canvas grid cell size (px) */
  gridSize?: number;
  /** Snap moves/resizes to the grid */
  gridLock?: boolean;
  /** Grid rendering style */
  gridStyle?: "lines" | "dots";
  /** Show dashed margin guides from page margins */
  showMarginGuides?: boolean;
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
    content: {
      items: ["First item", "Second item", "Third item"],
      start: 1,
      markerColor: "",
    },
  },
  picture: {
    name: "Picture",
    w: 160,
    h: 110,
    content: { src: "", alt: "Picture", fit: "cover" },
  },
  shape: {
    name: "Shape",
    w: 96,
    h: 64,
    content: { shape: "rect", variant: "rect" },
  },
  table: {
    name: "Table",
    w: 240,
    h: 96,
    content: {
      header: true,
      sourcePath: "",
      rows: 3,
      cols: 3,
      zebra: false,
      cellPadding: 6,
      headerBackground: "#f0ebe3",
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

/** Fill any missing margin side with the default */
export function normalizeMargins(m?: Partial<PageMargins>): PageMargins {
  return {
    top: m?.top ?? DEFAULT_MARGINS.top,
    right: m?.right ?? DEFAULT_MARGINS.right,
    bottom: m?.bottom ?? DEFAULT_MARGINS.bottom,
    left: m?.left ?? DEFAULT_MARGINS.left,
  };
}
