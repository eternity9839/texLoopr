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
import type { BlockVariant } from "./blockVariants";

export type { OutputProfile, ProjectScript, WorkflowStep, BlockVariant };

export type StudioView = "edit" | "data";

export type UiOverlay =
  | null
  | "settings"
  | "about"
  | "catalog"
  | "automation"
  | "samples"
  | "render";

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
  | "data"
  | "link"
  | "list"
  | "picture"
  | "shape"
  | "table"
  | "files"
  | "date"
  | "signature"
  | "qrcode"
  | "prebuild"
  | "group"
  /** @deprecated Prefer group + itemsPath; kept for demo documents */
  | "repeat";

/** How a date block picks its value. */
export type DateBlockSource = "today" | "fixed" | "field";

/** Display format for date blocks (maps to |date:* filters). */
export type DateBlockFormat = "short" | "long" | "iso";

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
export type ShapeVariant =
  | "rect"
  | "rounded"
  | "ellipse"
  | "circle"
  | "triangle"
  | "diamond"
  | "line";

export const SHAPE_VARIANTS: { value: ShapeVariant; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "rounded", label: "Rounded" },
  { value: "ellipse", label: "Ellipse" },
  { value: "circle", label: "Circle" },
  { value: "triangle", label: "Triangle" },
  { value: "diamond", label: "Diamond" },
  { value: "line", label: "Line / rule" },
];

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
  /** Outer margin in px on all sides (offsets an absolutely placed block) */
  margin?: number;
  /**
   * CSS white-space for text/paragraph (and similar).
   * Default when unset: pre-wrap (keep returns + soft wrap).
   */
  whiteSpace?: "pre-wrap" | "normal" | "nowrap" | "pre";
  /** Flex arrangement for a container's child blocks; unset = absolute */
  layout?: "flex";
  /** Flex main axis direction */
  direction?: "row" | "column";
  /** Distribution of children along the main axis */
  justify?: "start" | "center" | "end" | "space-between";
  /** Cross-axis alignment of children */
  alignItems?: "start" | "center" | "end" | "stretch";
  /** Gap between children along the main axis, px */
  gap?: number;
  /** Rotation in degrees (CSS transform on the frame) */
  rotate?: number;
  /** Mirror horizontally (scaleX -1) */
  mirrorX?: boolean;
  /** Mirror vertically (scaleY -1) */
  mirrorY?: boolean;
}

/** Edge pinning — resolves against page size / margins at render time */
export interface BlockPin {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
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
  /** Keep width/height ratio when resizing (Shift also locks temporarily) */
  lockAspectRatio?: boolean;
  /** Stacking order within the page (higher = front) */
  zIndex?: number;
  /** Parent group id when nested (optional; children also live in content.blocks) */
  parentId?: string;
  /** Lock edges to the surface (header/footer/sidebars) */
  pin?: BlockPin;
  /**
   * Presentation overrides for language and/or output kind.
   * Base fields remain the shared identity; the best-matching variant
   * merges on top at preview/render time.
   */
  variants?: BlockVariant[];
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

/** How the watermark is laid out on the surface */
export type WatermarkLayout = "centered" | "repeated" | "diffuse";

/** Paint order relative to blocks */
export type WatermarkLayer = "behind" | "front";

export interface Watermark {
  /** Preset wording; plain custom text when omitted */
  kind?: WatermarkKind;
  text?: string;
  /** Image URL or data URL (takes precedence over text when set) */
  src?: string;
  /** Watermark font size in px (text mode) */
  fontSize?: number;
  /** Image scale relative to page (1 = 100% of min side) */
  scale?: number;
  /** Rotation in degrees */
  angle?: number;
  opacity?: number;
  color?: string;
  layout?: WatermarkLayout;
  /** behind = under blocks (default); front = above everything */
  layer?: WatermarkLayer;
}

export type CanvasPresetId =
  | "document"
  | "letter"
  | "a4"
  | "a5"
  | "mobile"
  | "notification"
  | "square"
  | "landscape"
  | "fbCover"
  | "fbPost"
  | "igPost"
  | "igStory"
  | "igLandscape"
  | "ytThumb"
  | "ytCover"
  | "linkedinCover"
  | "xHeader"
  | "xPost";

export type PageViewMode = "single" | "continuous" | "spread";

export const CANVAS_PRESETS: Record<
  CanvasPresetId,
  { w: number; h: number; label: string; group?: string }
> = {
  document: { w: 720, h: 960, label: "Document", group: "Print" },
  letter: { w: 720, h: 960, label: "US Letter", group: "Print" },
  a4: { w: 714, h: 1010, label: "A4", group: "Print" },
  a5: { w: 505, h: 714, label: "A5", group: "Print" },
  mobile: { w: 390, h: 844, label: "Mobile phone", group: "Devices" },
  notification: { w: 360, h: 180, label: "Notification", group: "Devices" },
  square: { w: 720, h: 720, label: "Square", group: "Devices" },
  landscape: { w: 960, h: 540, label: "Landscape", group: "Devices" },
  fbCover: { w: 820, h: 312, label: "Facebook cover", group: "Social" },
  fbPost: { w: 1200, h: 630, label: "Facebook post", group: "Social" },
  igPost: { w: 1080, h: 1080, label: "Instagram post", group: "Social" },
  igStory: { w: 1080, h: 1920, label: "Instagram story / Reel", group: "Social" },
  igLandscape: { w: 1080, h: 566, label: "Instagram landscape", group: "Social" },
  ytThumb: { w: 1280, h: 720, label: "YouTube thumbnail", group: "Social" },
  ytCover: { w: 2560, h: 1440, label: "YouTube channel cover", group: "Social" },
  linkedinCover: { w: 1584, h: 396, label: "LinkedIn cover", group: "Social" },
  xHeader: { w: 1500, h: 500, label: "X / Twitter header", group: "Social" },
  xPost: { w: 1200, h: 675, label: "X / Twitter post", group: "Social" },
};

/** Ordered ids for selects (grouped by print → devices → social). */
export const CANVAS_PRESET_ORDER: CanvasPresetId[] = [
  "document",
  "letter",
  "a4",
  "a5",
  "mobile",
  "notification",
  "square",
  "landscape",
  "fbCover",
  "fbPost",
  "igPost",
  "igStory",
  "igLandscape",
  "ytThumb",
  "ytCover",
  "linkedinCover",
  "xHeader",
  "xPost",
];

export interface Page {
  id: string;
  name: string;
  blocks: Block[];
  /** Optional surface size in CSS px (PDF import / custom pages) */
  width?: number;
  height?: number;
  /** Print margins shown as guides; used by margin-aligned inserts */
  margins?: PageMargins;
  /** When true, edge-pinned blocks inset by margins; default false (full bleed). */
  pinRespectsMargins?: boolean;
  /** Page backdrop behind all blocks (subtle tint or brand paper) */
  background?: string;
  /** Draft/confidential watermark rendered under blocks */
  watermark?: Watermark;
  /** Page numbering display rule */
  pageNumber?: PageNumber;
  /** Rotate the whole surface (degrees) */
  rotate?: number;
  /** Mirror the surface horizontally */
  mirrorX?: boolean;
  /** Mirror the surface vertically */
  mirrorY?: boolean;
  /** Expr — hide page in preview/render when false (same dialect as Block.condition) */
  condition?: string;
}

/** Configures automatic page numbering in preview / print */
export interface PageNumber {
  /** "all" – every page, "odd" – O pages only, "even" – E pages only */
  mode?: "all" | "odd" | "even";
  /** Skip page number on the very first physical page */
  skipFirst?: boolean;
  /** Physical pages (1-based) that must never show a number */
  skipPages?: number[];
  /**
   * Template for the printed number.
   * Tokens: {n} current number, {total} total eligible pages.
   * Example: "Page {n} of {total}"
   */
  format?: string;
}

/** Repeating header or footer band shared across pages (project chrome). */
export interface PageChromeBand {
  enabled: boolean;
  /** Reserved band height in px */
  height: number;
  /** Blocks with coordinates relative to the band (y=0 = top of band) */
  blocks: Block[];
  background?: string;
}

/** Project-level page chrome — headers/footers that repeat on every page. */
export interface ProjectPageChrome {
  header?: PageChromeBand;
  footer?: PageChromeBand;
}

export type PageChromeSlot = "header" | "footer";

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
  /** Declared data axes for Preview chips + vars.* injection (ADR 0018) */
  conditions?: import("./documentConditions").ProjectCondition[];
  version?: string;
  category?: string;
  tags?: string;
  createdAt?: string;
  company?: string;
  contactEmail?: string;
  /** Document-level email envelope defaults (overridden per email output) */
  email?: import("./email/envelope").EmailEnvelope;
  /** Free-form key=value lines (one per line) */
  customMeta?: string;
  /** Logical artboard size for this project (drives canvas prefs on load) */
  artboard?: CanvasPresetId;
  /** Named tabular datasets (CSV/JSON rows) for merge + lookup */
  datasets?: ProjectDataset[];
  /** Which dataset drives the preview row picker */
  primaryDatasetId?: string;
  /** User-saved reusable text styles (typography presets) */
  textStyles?: import("./styleLibrary").TextStylePreset[];
  /** User-saved document / surface presets */
  documentStyles?: import("./styleLibrary").DocumentStylePreset[];
  /** Repeating header/footer bands for every page */
  pageChrome?: ProjectPageChrome;
}

export type {
  DataSourceConfig,
  DataSourceKind,
  DataSourceRefresh,
} from "./dataSources/types";

import type {
  DataSourceConfig,
  DataSourceRefresh,
} from "./dataSources/types";

export interface ProjectDataset {
  id: string;
  name: string;
  /** Field used to join from the primary row into this dataset */
  keyField?: string;
  rows: Record<string, unknown>[];
  /** How rows are loaded/refreshed; omit or kind none = paste/grid only */
  source?: DataSourceConfig;
  refresh?: DataSourceRefresh;
  /** ISO timestamp of last successful load */
  lastLoadedAt?: string;
  /** Last load error message (cleared on success) */
  lastError?: string;
}

export type Selection =
  | { kind: "page"; id: string }
  | { kind: "block"; id: string }
  | null;

export type UiTheme = "stone" | "mist" | "dusk" | "nova";

/** How bound fields show row-1 hints in edit mode (data, links, bound images…). */
export type BindingPreviewMode = "inline" | "popup";

export interface EditorPrefs {
  showGrid: boolean;
  snap: boolean;
  density: "comfortable" | "compact";
  /** Chrome appearance; paper stays light for WYSIWYG */
  theme?: UiTheme;
  showRulers?: boolean;
  showComments?: boolean;
  /** Show left insert palette (Edit) */
  showToolsRail?: boolean;
  /** Show right inspector (Edit) */
  showInspectorRail?: boolean;
  /** Show bottom status strip */
  showStatusBar?: boolean;
  /** Pane widths (px) when expanded */
  navWidth?: number;
  toolsWidth?: number;
  inspectorWidth?: number;
  /** Icon-only rails */
  navCollapsed?: boolean;
  toolsCollapsed?: boolean;
  inspectorCollapsed?: boolean;
  /** @deprecated Floating toolbox removed */
  toolsOrientation?: "vertical" | "horizontal";
  /** @deprecated Bottom property dock removed */
  propsHeight?: number;
  /** @deprecated Bottom dock collapsed */
  propsCollapsed?: boolean;
  /** Canvas grid cell size (px) — legacy single size; prefer gridSizeX/Y */
  gridSize?: number;
  /** Horizontal grid spacing (px) */
  gridSizeX?: number;
  /** Vertical grid spacing (px) */
  gridSizeY?: number;
  /** Grid line/dot color */
  gridColor?: string;
  /** Snap moves/resizes to the grid */
  gridLock?: boolean;
  /** Grid rendering style */
  gridStyle?: "lines" | "dots";
  /** Show dashed margin guides from surface margins */
  showMarginGuides?: boolean;
  /** Block frame borders in edit mode (off = selected/hovered only) */
  showBlockOutlines?: boolean;
  /** Pin badges and dashed pin outlines on blocks */
  showPinIndicators?: boolean;
  /** Header/footer chrome band overlays in edit mode */
  showPageChrome?: boolean;
  /** Dashed bounds on inactive pages in multi-page view */
  showPageBounds?: boolean;
  /** Ruler hover / margin flags display unit (geometry stays CSS px) */
  rulerUnit?: "px" | "mm" | "cm" | "in";
  /** UI language */
  locale?: "en" | "fr";
  /** Logical canvas size preset (not responsive — target artboard) */
  canvasPreset?: CanvasPresetId;
  /** How pages are arranged on the board */
  pageViewMode?: PageViewMode;
  /** Board rotation for checking alternate orientations (degrees) */
  canvasRotate?: 0 | 90 | 180 | 270;
  /** Fit fills the stage; manual uses canvasZoom */
  canvasZoomMode?: "fit" | "manual";
  /** Manual zoom factor (1 = 100%). Ignored while mode is fit. */
  canvasZoom?: number;
  /** Show output format branches under each surface in Layers */
  showFormatsInTree?: boolean;
  /** Group isolation — edit children of this group on canvas */
  groupIsolationId?: string | null;
  /** Edit-mode preview for merge-bound blocks: inline swap vs popup */
  bindingPreviewMode?: BindingPreviewMode;
  /**
   * Edit only: rewrite weak ink and lighten merge chips against dark backdrops.
   * Preview / export stay authored. Default on.
   */
  editContrastAssist?: boolean;
  /**
   * Edit only: show blocks that fail their condition as low-opacity ghosts
   * instead of hiding them (helps edit language/output alternates).
   */
  showInactiveBranches?: boolean;
  /** Emmet-style text expansions in paragraph / text fields */
  textExpansionsEnabled?: boolean;
  /**
   * PDF export engine. `browser` matches the canvas preview (print → Save as PDF).
   * `rust` uses the native printpdf backend (batch / CLI / API).
   */
  pdfEngine?: "browser" | "rust";
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
  data: {
    name: "Data field",
    w: 120,
    h: 28,
    content: { path: "field" },
  },
  link: {
    name: "Link",
    w: 160,
    h: 28,
    content: { hook: "url", target: "https://example.com", label: "Visit site" },
  },
  list: {
    name: "List",
    w: 200,
    h: 88,
    content: {
      items: ["First item", "Second item", "Third item"],
      start: 1,
      markerColor: "",
      listIndent: 19,
      nestGap: 4,
      datasetName: "",
      sourcePath: "",
      itemText: "{{label}}",
      childrenPath: "children",
    },
  },
  picture: {
    name: "Picture",
    w: 160,
    h: 110,
    content: {
      src: "",
      alt: "Picture",
      fit: "contain",
      objectPosition: "center",
    },
  },
  shape: {
    name: "Shape",
    w: 96,
    h: 64,
    /** Empty stroke frame by default — fill via Design / place params. */
    content: { shape: "rect", variant: "rect", filled: false },
  },
  table: {
    name: "Table",
    w: 280,
    h: 120,
    content: {
      header: true,
      sourcePath: "",
      rows: 3,
      cols: 3,
      zebra: false,
      cellPadding: 6,
      rowGap: 0,
      colGap: 0,
      headerBackground: "#f0ebe3",
      headerColor: "",
      headerFontWeight: 600,
      headerFontSize: 0,
      headerTextAlign: "left",
      headerStyle: "default",
      headerRule: false,
      borderColor: "#cfc8bc",
      borderHorizontal: true,
      borderVertical: true,
      showBorders: true,
      heightMode: "fixed",
      rowMinHeight: 28,
      rowMaxHeight: 0,
      cells: [
        ["A1", "B1", "C1"],
        ["A2", "B2", "C2"],
        ["A3", "B3", "C3"],
      ],
    },
  },
  files: {
    name: "Attachment",
    w: 180,
    h: 52,
    content: {
      label: "Attachment",
      count: 0,
      fileName: "",
      fileSize: 0,
      mimeType: "",
      dataUrl: "",
    },
  },
  date: {
    name: "Date",
    w: 140,
    h: 28,
    content: {
      source: "today",
      fixed: "",
      path: "date",
      format: "short",
    },
  },
  signature: {
    name: "Signature",
    w: 200,
    h: 96,
    content: {
      mode: "open",
      src: "",
      label: "Signature",
      caption: "{{name}}\n{{role}}",
      signedAt: "",
      showLine: true,
    },
  },
  qrcode: {
    name: "QR code",
    w: 96,
    h: 96,
    content: {
      value: "{{tracking}}",
      ecc: "M",
      dark: "#1c2430",
      light: "#ffffff",
    },
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
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  // Insecure contexts (plain HTTP) omit randomUUID; derive a v4 UUID
  // from getRandomValues, which is available everywhere.
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
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
  const primaryId = createId();
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
    artboard: "document",
    datasets: [{ id: primaryId, name: "primary", rows: [] }],
    primaryDatasetId: primaryId,
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

/** CSS transform fragment for rotate + mirror (empty string when identity). */
export function cssTransformFromStyle(style: {
  rotate?: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
}): string {
  const parts: string[] = [];
  const rot = style.rotate ?? 0;
  if (rot !== 0) parts.push(`rotate(${rot}deg)`);
  if (style.mirrorX) parts.push("scaleX(-1)");
  if (style.mirrorY) parts.push("scaleY(-1)");
  return parts.join(" ");
}
