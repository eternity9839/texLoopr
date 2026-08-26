import type { BlockStyle, BlockType } from "./document";
import { BLOCK_DEFAULTS } from "./document";
import { DATA_FIELD_COLOR } from "./dataField";
import {
  LINK_HOOK_DEFAULTS,
  LINK_HOOK_LABEL,
  type LinkHook,
} from "./linkHook";

/** Max embedded attachment / picture upload size. */
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export type PlacePresetId =
  | "heading1"
  | "heading2"
  | "caption"
  | "hrule"
  | "textbox"
  | "bullets"
  | "numbers"
  | "date-today"
  | "date-fixed"
  | "date-field"
  | LinkHook;

export type PlaceToolDef = {
  type: BlockType;
  label: string;
  hint: string;
  preset?: PlacePresetId;
};

export type PlaceDraft = {
  type: BlockType;
  preset: PlacePresetId | null;
  at: { x: number; y: number };
  name: string;
  w: number;
  h: number;
  content: Record<string, unknown>;
  style: BlockStyle;
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function assertAttachmentSize(bytes: number): string | null {
  if (bytes > MAX_ATTACHMENT_BYTES) {
    return `File is too large (${formatBytes(bytes)}). Limit is ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
  }
  return null;
}

/** Resize a cells matrix to rows × cols, preserving existing values. */
export function resizeTableCells(
  cells: string[][],
  rows: number,
  cols: number,
): string[][] {
  const r = Math.max(1, Math.min(32, Math.round(rows)));
  const c = Math.max(1, Math.min(16, Math.round(cols)));
  const out: string[][] = [];
  for (let i = 0; i < r; i++) {
    const row: string[] = [];
    for (let j = 0; j < c; j++) {
      row.push(cells[i]?.[j] ?? (i === 0 ? `Col ${j + 1}` : ""));
    }
    out.push(row);
  }
  return out;
}

function baseStyle(type: BlockType): BlockStyle {
  if (type === "shape") {
    return {
      background: "transparent",
      borderWidth: 1.5,
      borderColor: "#2a2622",
      opacity: 1,
      color: "#2a2622",
    };
  }
  return { fontSize: 14, color: "#2a2622", textAlign: "left" };
}

/** Build the editable draft shown before a block is committed to the page. */
export function buildPlaceDraft(
  type: BlockType,
  preset: PlacePresetId | null | undefined,
  at: { x: number; y: number },
): PlaceDraft {
  const defaults = BLOCK_DEFAULTS[type];
  const content = { ...defaults.content };
  let style = baseStyle(type);
  let name = defaults.name;
  let w = defaults.w;
  let h = defaults.h;

  switch (preset) {
    case "heading1":
      name = "Heading 1";
      content.text = "Heading";
      style = {
        ...style,
        fontSize: 28,
        fontWeight: 700,
        fontFamily: "display",
      };
      w = 320;
      h = 40;
      break;
    case "heading2":
      name = "Heading 2";
      content.text = "Subheading";
      style = {
        ...style,
        fontSize: 20,
        fontWeight: 650,
        fontFamily: "ui",
      };
      w = 280;
      h = 36;
      break;
    case "caption":
      name = "Caption";
      content.text = "Caption";
      style = {
        ...style,
        fontSize: 11,
        fontStyle: "italic",
        color: "#6b6560",
      };
      w = 220;
      h = 28;
      break;
    case "hrule":
      name = "Horizontal line";
      content.variant = "line";
      content.shape = "line";
      style = {
        background: "transparent",
        borderWidth: 2,
        borderColor: "#2a2622",
        opacity: 1,
      };
      w = 400;
      h = 16;
      break;
    case "textbox":
      name = "Text box";
      content.text = "Text box";
      style = {
        ...style,
        background: "transparent",
        borderWidth: 1,
        borderColor: "#2a2622",
        padding: 10,
      };
      w = 240;
      h = 96;
      break;
    case "bullets":
      name = "Bulleted list";
      style = { ...style, listStyle: "disc" };
      break;
    case "numbers":
      name = "Numbered list";
      style = { ...style, listStyle: "decimal" };
      content.start = 1;
      break;
    case "date-today":
      name = "Today's date";
      content.source = "today";
      content.format = "short";
      content.fixed = "";
      content.path = "date";
      style = { ...style, fontSize: 13, fontFamily: "ui", color: "#1c2430" };
      w = 140;
      h = 28;
      break;
    case "date-fixed":
      name = "Fixed date";
      content.source = "fixed";
      content.format = "short";
      content.fixed = new Date().toISOString().slice(0, 10);
      content.path = "date";
      style = { ...style, fontSize: 13, fontFamily: "ui", color: "#1c2430" };
      w = 140;
      h = 28;
      break;
    case "date-field":
      name = "Date field";
      content.source = "field";
      content.format = "short";
      content.path = "date";
      content.fixed = "";
      style = {
        ...style,
        fontSize: 13,
        fontFamily: "ui",
        color: DATA_FIELD_COLOR,
      };
      w = 140;
      h = 28;
      break;
    default:
      break;
  }

  if (type === "table") {
    const rows = Number(content.rows ?? 3);
    const cols = Number(content.cols ?? 3);
    content.cells = resizeTableCells(
      (content.cells as string[][]) ?? [],
      rows,
      cols,
    );
    content.borderColor = content.borderColor ?? "#cfc8bc";
    content.showBorders = content.showBorders ?? true;
  }

  if (type === "files") {
    content.label = content.label ?? "Attachment";
    content.count = 0;
    content.fileName = "";
    content.fileSize = 0;
    content.mimeType = "";
    content.dataUrl = "";
  }

  if (type === "picture") {
    content.fit = content.fit ?? "contain";
  }

  if (type === "data") {
    content.path = String(content.path ?? "field");
    style = {
      ...style,
      fontSize: 14,
      color: DATA_FIELD_COLOR,
      fontFamily: "ui",
    };
    w = 120;
    h = 28;
  }

  if (type === "date" && !preset) {
    content.source = content.source ?? "today";
    content.format = content.format ?? "short";
    style = { ...style, fontSize: 13, fontFamily: "ui", color: "#1c2430" };
  }

  if (type === "signature") {
    style = {
      ...style,
      fontSize: 11,
      color: "#5c6570",
      fontFamily: "ui",
    };
  }

  if (type === "qrcode") {
    content.value = String(content.value ?? "{{tracking}}");
    content.ecc = content.ecc ?? "M";
  }

  if (type === "link") {
    const hook = (preset as LinkHook) ?? "url";
    const defs = LINK_HOOK_DEFAULTS[hook];
    content.hook = hook;
    content.target = defs.target;
    content.label = defs.label;
    name = LINK_HOOK_LABEL[hook];
    style = {
      ...style,
      fontSize: 14,
      color: "#2563eb",
      textDecoration: "underline",
      fontFamily: "ui",
    };
    w = 168;
    h = 28;
  }

  if (type === "shape" && !preset) {
    content.variant = "rect";
    content.filled = false;
  }

  return {
    type,
    preset: preset ?? null,
    at: {
      x: Math.max(0, at.x - w / 2),
      y: Math.max(0, at.y - h / 2),
    },
    name,
    w,
    h,
    content,
    style,
  };
}

export const TEXT_TOOLS: PlaceToolDef[] = [
  {
    type: "paragraph",
    label: "Paragraph",
    hint: "Multi-line text with {{fields}}",
  },
  { type: "text", label: "Text", hint: "Single-line label or heading" },
  {
    type: "data",
    label: "Data field",
    hint: "Merge field chip — hover chip to preview row 1",
  },
  { type: "list", label: "List", hint: "Bulleted or numbered list" },
];

export const MEDIA_TOOLS: PlaceToolDef[] = [
  { type: "picture", label: "Picture", hint: "Image or logo — click to place" },
  {
    type: "shape",
    label: "Shape",
    hint: "Empty frame — fill and opacity in params",
  },
  {
    type: "files",
    label: "Attachment",
    hint: "Attach a file (max 2 MB)",
  },
];

export const STRUCTURE_TOOLS: PlaceToolDef[] = [
  { type: "table", label: "Table", hint: "Rows and columns" },
  { type: "group", label: "Group", hint: "Empty group frame for nesting" },
];

/** Foldable toolbox sheet — link + date variants. */
export const LINK_DATE_TOOLS: PlaceToolDef[] = [
  {
    type: "link",
    label: "Link",
    hint: "URL, email, phone, SMS, or anchor",
  },
  {
    type: "date",
    label: "Date",
    hint: "Today, fixed, or bound date column",
  },
  {
    type: "date",
    preset: "date-today",
    label: "Today's date",
    hint: "Always renders the current calendar day",
  },
  {
    type: "date",
    preset: "date-fixed",
    label: "Fixed date",
    hint: "Pick a specific date in the options strip",
  },
  {
    type: "date",
    preset: "date-field",
    label: "Date field",
    hint: "Merge a date column with |date formatting",
  },
];

/** Foldable toolbox sheet — signature + QR. */
export const SIGNATURE_QR_TOOLS: PlaceToolDef[] = [
  {
    type: "signature",
    label: "Signature",
    hint: "Sign-here field — upload ink or bind {{signature_url}}",
  },
  {
    type: "qrcode",
    label: "QR code",
    hint: "Encode a URL or {{field}} as a scannable QR",
  },
];

/** Word-style insert helpers (arm → options strip → click to place). */
export const WORD_HELPER_TOOLS: PlaceToolDef[] = [
  {
    type: "text",
    preset: "heading1",
    label: "Heading 1",
    hint: "Large title",
  },
  {
    type: "text",
    preset: "heading2",
    label: "Heading 2",
    hint: "Section title",
  },
  {
    type: "text",
    preset: "caption",
    label: "Caption",
    hint: "Small italic caption",
  },
  {
    type: "shape",
    preset: "hrule",
    label: "Horizontal line",
    hint: "Rule across the surface",
  },
  {
    type: "paragraph",
    preset: "textbox",
    label: "Text box",
    hint: "Bordered text frame",
  },
  {
    type: "list",
    preset: "bullets",
    label: "Bullets",
    hint: "Disc list",
  },
  {
    type: "list",
    preset: "numbers",
    label: "Numbered list",
    hint: "1. 2. 3.",
  },
];

export const TOOL_GROUPS: { id: string; tools: PlaceToolDef[] }[] = [
  { id: "text", tools: TEXT_TOOLS },
  { id: "media", tools: MEDIA_TOOLS },
  { id: "structure", tools: STRUCTURE_TOOLS },
];

/** All placeable types for context menus / hierarchy add. */
export const ALL_PLACE_TOOLS: PlaceToolDef[] = [
  ...TEXT_TOOLS,
  ...LINK_DATE_TOOLS.filter((t) => !t.preset),
  ...MEDIA_TOOLS,
  ...SIGNATURE_QR_TOOLS,
  ...STRUCTURE_TOOLS,
];
