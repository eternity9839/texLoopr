export type TourStepId =
  | "welcome"
  | "toolbox"
  | "place"
  | "ribbon"
  | "inspector"
  | "comments"
  | "data"
  | "preview"
  | "automation"
  | "done";

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  /** CSS selector for spotlight; null = centered card */
  target: string | null;
  /** Studio view to open before showing */
  view?: "edit" | "data";
  preview?: boolean;
  overlay?: "automation" | null;
}

export const TOUR_STORAGE_KEY = "texloopr.tour.done.v1";

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to the edition studio",
    body: "This short tour walks through placing blocks, the edit ribbon, comments, data binding, preview, and automation. You can skip anytime.",
    target: null,
    view: "edit",
    preview: false,
  },
  {
    id: "toolbox",
    title: "Toolbox — pick a block type",
    body: "Choose Paragraph, Text, List, Table, and more. The selected tool stays active until you place it or click it again.",
    target: '[data-tour="toolbox"]',
    view: "edit",
  },
  {
    id: "place",
    title: "Canvas — place, move, resize",
    body: "Click the page to drop the active tool. Drag a block to move; use corner handles to resize. Arrow keys nudge; Shift + arrows move by 10px.",
    target: '[data-tour="canvas"]',
    view: "edit",
  },
  {
    id: "ribbon",
    title: "Edit ribbon — arrange & review",
    body: "Align to the page, change stacking order, duplicate, undo, lock, and add comments. Labels mirror Word / Designer habits.",
    target: '[data-tour="ribbon"]',
    view: "edit",
  },
  {
    id: "inspector",
    title: "Inspector — content & conditions",
    body: "Edit text, geometry, style, and conditions like data.role or output.kind == 'print'. Use {{field|upper}} filters in text.",
    target: '[data-tour="inspector"]',
    view: "edit",
  },
  {
    id: "comments",
    title: "Comments — review like Word",
    body: "Select a block, click Comment on the ribbon, and leave a note. Markers appear on the page; resolve them when done.",
    target: '[data-tour="comments"]',
    view: "edit",
  },
  {
    id: "data",
    title: "Data — rows for bulk fill",
    body: "Paste CSV or JSON here. Each row can drive a rendered document. Preview picks which row to resolve.",
    target: '[data-tour="data-studio"]',
    view: "data",
  },
  {
    id: "preview",
    title: "Preview — resolve against output",
    body: "Toggle Preview on Edit. Pick a data row and an output profile (screen, PDF, label printer, API) to see conditions fire.",
    target: '[data-tour="preview-toggle"]',
    view: "edit",
    preview: true,
  },
  {
    id: "automation",
    title: "Automation — workflow & scripts",
    body: "Open ··· → Automation for outputs, workflow steps, and sandboxed scripts. Dry-run builds an emit payload without sending it.",
    target: null,
    view: "edit",
    preview: false,
    overlay: "automation",
  },
  {
    id: "done",
    title: "You’re set",
    body: "Restart this tour anytime from ··· → Edition tour. Happy templating.",
    target: null,
    view: "edit",
    preview: false,
    overlay: null,
  },
];

export function isTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourCompleted(): void {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
