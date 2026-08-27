/** Stroke icons (Lucide-like), currentColor — consistent across chrome. */

export type IconName =
  | "paragraph"
  | "text"
  | "list"
  | "picture"
  | "shape"
  | "table"
  | "files"
  | "prebuild"
  | "group"
  | "repeat"
  | "italic"
  | "underline"
  | "ungroup"
  | "object"
  | "cut"
  | "copy"
  | "paste"
  | "duplicate"
  | "undo"
  | "redo"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "alignTop"
  | "alignMiddle"
  | "alignBottom"
  | "bringToFront"
  | "bringForward"
  | "sendBackward"
  | "sendToBack"
  | "lock"
  | "unlock"
  | "bold"
  | "alignTextLeft"
  | "alignTextCenter"
  | "alignTextRight"
  | "comment"
  | "messages"
  | "grid"
  | "crosshair"
  | "magnet"
  | "ruler"
  | "users"
  | "edit"
  | "database"
  | "eye"
  | "eyeOff"
  | "save"
  | "moreHorizontal"
  | "settings"
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "chevronUp"
  | "panelLeft"
  | "panelRight"
  | "file"
  | "sliders"
  | "tags"
  | "layout"
  | "rows"
  | "columns"
  | "plus"
  | "search"
  | "workflow"
  | "book"
  | "info"
  | "alert"
  | "sparkles"
  | "folder"
  | "home"
  | "check"
  | "close"
  | "play"
  | "code"
  | "expand"
  | "focus"
  | "link"
  | "history"
  | "pointer"
  | "calendar"
  | "signature"
  | "qrcode";

/** One or more path `d` values in a 24×24 viewBox. */
const PATHS: Record<IconName, string[]> = {
  paragraph: ["M13 4v16", "M17 4v16", "M9 4H5.5A3.5 3.5 0 0 0 5.5 11H9", "M9 4v16"],
  text: ["M4 7V5h16v2", "M12 5v14", "M9 19h6"],
  list: [
    "M8 6h13",
    "M8 12h13",
    "M8 18h13",
    "M3 6h.01",
    "M3 12h.01",
    "M3 18h.01",
  ],
  picture: [
    "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
    "M9 10a1.5 1.5 0 1 0 0.01 0",
    "M3.5 17l5-5 3 3 4-4 5 5",
  ],
  shape: ["M5 5h14v14H5z"],
  table: ["M4 5h16v14H4z", "M4 10h16", "M4 15h16", "M10 5v14", "M15 5v14"],
  files: [
    "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z",
    "M14 3v5h5",
    "M9 13h6",
    "M9 17h4",
  ],
  prebuild: [
    "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z",
    "M12 12l8-4.5",
    "M12 12v9",
    "M12 12L4 7.5",
  ],
  group: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  repeat: [
    "M17 2l4 4-4 4",
    "M3 11V9a4 4 0 0 1 4-4h14",
    "M7 22l-4-4 4-4",
    "M21 13v2a4 4 0 0 1-4 4H3",
  ],
  italic: ["M10 4h8", "M6 20h8", "M14 4l-4 16"],
  underline: ["M6 4v6a6 6 0 0 0 12 0V4", "M4 20h16"],
  ungroup: ["M4 4h7v7H4z", "M13 13h7v7h-7z", "M9 15l6-6"],
  object: [
    "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z",
    "M12 12l8-4.5",
    "M12 12v9",
    "M12 12L4 7.5",
  ],
  cut: [
    "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M20 4L8.12 15.88",
    "M14.47 14.48L20 20",
    "M8.12 8.12L12 12",
  ],
  copy: ["M9 9h11v12H9z", "M5 15V4h10"],
  paste: ["M9 4h6v3H9z", "M7 7h10v13H7z"],
  duplicate: ["M9 9h10v11H9z", "M5 15V4h10"],
  undo: ["M9 14L4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H13"],
  redo: ["M15 14l5-5-5-5", "M20 9H9.5a5.5 5.5 0 0 0 0 11H11"],
  history: ["M3 12a9 9 0 1 0 9-9", "M3 12V7", "M8 7H3", "M12 7v5l3 2"],
  pointer: ["M4 4l7 16 2-7 7-2"],
  alignLeft: ["M4 4v16", "M8 6h12", "M8 12h8", "M8 18h10"],
  alignCenter: ["M12 4v16", "M6 6h12", "M8 12h8", "M5 18h14"],
  alignRight: ["M20 4v16", "M4 6h12", "M8 12h8", "M6 18h10"],
  alignTop: ["M4 4h16", "M6 8v12", "M12 8v8", "M18 8v10"],
  alignMiddle: ["M4 12h16", "M6 5v14", "M12 8v8", "M18 6v12"],
  alignBottom: ["M4 20h16", "M6 4v12", "M12 8v8", "M18 6v10"],
  bringToFront: ["M9 9h11v11H9z", "M4 4h11v4", "M4 8v7h4"],
  bringForward: ["M5 12h11", "M13 8l4 4-4 4", "M5 6h6"],
  sendBackward: ["M19 12H8", "M11 8l-4 4 4 4", "M19 6h-6"],
  sendToBack: ["M4 4h11v11H4z", "M9 12h11v8H9v-4"],
  lock: ["M7 11h10v9H7z", "M8 11V8a4 4 0 0 1 8 0v3"],
  unlock: ["M7 11h10v9H7z", "M8 11V8a4 4 0 0 1 7-2.5"],
  bold: ["M7 5h6.5a3.5 3.5 0 0 1 0 7H7z", "M7 12h7.5a3.5 3.5 0 0 1 0 7H7z"],
  alignTextLeft: ["M4 6h16", "M4 12h10", "M4 18h14"],
  alignTextCenter: ["M4 6h16", "M7 12h10", "M5 18h14"],
  alignTextRight: ["M4 6h16", "M10 12h10", "M6 18h14"],
  comment: ["M5 5h14v10H9l-4 4z"],
  messages: ["M4 4h11v8H9l-3 3z", "M10 10h10v8h-5l-3 3v-3"],
  grid: ["M4 4h16v16H4z", "M4 12h16", "M12 4v16"],
  crosshair: [
    "M12 2v5",
    "M12 17v5",
    "M2 12h5",
    "M17 12h5",
    "M12 12h.01",
  ],
  magnet: [
    "M5 3h5v8a2 2 0 0 0 4 0V3h5v8a7 7 0 0 1-14 0V3z",
    "M5 8h5",
    "M14 8h5",
  ],
  ruler: [
    "M4 6h16v5H4z",
    "M7 6v5",
    "M10 6v3",
    "M13 6v5",
    "M16 6v3",
    "M19 6v5",
    "M6 14h4v6H6z",
    "M6 17h4",
  ],
  users: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M22 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
  edit: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"],
  database: [
    "M4 6c0 1.66 3.58 3 8 3s8-1.34 8-3-3.58-3-8-3-8 1.34-8 3z",
    "M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6",
    "M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6",
  ],
  eye: [
    "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z",
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  ],
  eyeOff: [
    "M3 3l18 18",
    "M10.6 10.6a3 3 0 0 0 4.2 4.2",
    "M9.9 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.2 3.1",
    "M6.1 6.1A17.5 17.5 0 0 0 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1",
  ],
  save: ["M5 5h11l3 3v11H5z", "M8 5v5h7V5", "M8 19v-5h8v5"],
  moreHorizontal: ["M6 12h.01", "M12 12h.01", "M18 12h.01"],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.88 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  ],
  chevronLeft: ["M15 18l-6-6 6-6"],
  chevronRight: ["M9 18l6-6-6-6"],
  chevronDown: ["M6 9l6 6 6-6"],
  chevronUp: ["M18 15l-6-6-6 6"],
  panelLeft: ["M4 5h16v14H4z", "M9 5v14"],
  panelRight: ["M4 5h16v14H4z", "M15 5v14"],
  file: [
    "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z",
    "M14 3v5h5",
  ],
  sliders: [
    "M4 21v-7",
    "M4 10V3",
    "M12 21v-9",
    "M12 8V3",
    "M20 21v-5",
    "M20 12V3",
    "M1 14h6",
    "M9 8h6",
    "M17 16h6",
  ],
  tags: [
    "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z",
    "M7 7h.01",
  ],
  layout: ["M4 4h16v16H4z", "M4 10h16", "M10 10v10"],
  rows: ["M4 6h16", "M4 12h16", "M4 18h16"],
  columns: ["M6 4v16", "M12 4v16", "M18 4v16"],
  plus: ["M12 5v14", "M5 12h14"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.35-4.35"],
  workflow: [
    "M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M6 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M6 8v8",
    "M18 8c0 5-12 3-12 8",
  ],
  book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  info: ["M12 12v5", "M12 8h.01", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"],
  alert: [
    "M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L12.7 3.9a2 2 0 0 0-2.4 0z",
    "M12 9v4",
    "M12 17h.01",
  ],
  sparkles: [
    "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z",
    "M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z",
  ],
  folder: ["M4 6h5l2 2h9v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"],
  home: [
    "M3 10.5 12 3l9 7.5",
    "M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5",
  ],
  check: ["M5 13l4 4L19 7"],
  close: ["M18 6L6 18", "M6 6l12 12"],
  play: ["M8 5v14l11-7z"],
  code: ["M16 18l6-6-6-6", "M8 6l-6 6 6 6"],
  expand: [
    "M15 3h6v6",
    "M9 21H3v-6",
    "M21 3l-7 7",
    "M3 21l7-7",
  ],
  focus: [
    "M4 8V5a1 1 0 0 1 1-1h3",
    "M16 4h3a1 1 0 0 1 1 1v3",
    "M20 16v3a1 1 0 0 1-1 1h-3",
    "M8 20H5a1 1 0 0 1-1-1v-3",
    "M12 12h.01",
  ],
  link: [
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  ],
  calendar: [
    "M8 2v4",
    "M16 2v4",
    "M3 10h18",
    "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  ],
  signature: [
    "M3 17c3-4 5-6 8-6s4 3 7 1",
    "M14 20h7",
    "M17 3l4 4",
    "M14 6l4-4 4 4-4 4z",
  ],
  qrcode: [
    "M3 3h7v7H3z",
    "M14 3h7v7h-7z",
    "M3 14h7v7H3z",
    "M14 14h3v3h-3z",
    "M18 14h3v3h-3z",
    "M14 18h3v3h-3z",
    "M18 18h3v3h-3z",
  ],
};

import type { BlockType } from "../model/document";

export const BLOCK_TYPE_ICON: Record<BlockType, IconName> = {
  paragraph: "paragraph",
  text: "text",
  data: "database",
  link: "link",
  list: "list",
  picture: "picture",
  shape: "shape",
  table: "table",
  files: "files",
  date: "calendar",
  signature: "signature",
  qrcode: "qrcode",
  prebuild: "prebuild",
  group: "group",
  repeat: "repeat",
};

interface IconProps {
  name: IconName;
  size?: number;
  class?: string;
  title?: string;
  /** Heavier stroke for tiny sizes */
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 16,
  class: className,
  title,
  strokeWidth,
}: IconProps) {
  const paths = PATHS[name] ?? PATHS.file;
  const sw = strokeWidth ?? (size <= 14 ? 2 : 1.75);
  return (
    <svg
      class={className ? `icon icon--${name} ${className}` : `icon icon--${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={sw}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
