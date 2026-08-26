import type { BlockType } from "../../model/document";
import type { InspectorTabId } from "../studio/inspectorTabs";
import type { PlacePresetId } from "../../model/placeTools";
import {
  armPlaceTool,
  armSelectTool,
  copySelected,
  cutSelected,
  deleteSelection,
  duplicateSelected,
  groupSelection,
  inspectorTab,
  nudgeCanvasZoom,
  nudgeSelection,
  nudgeZOrder,
  openSettings,
  pasteClipboard,
  prefs,
  redoEdit,
  select,
  selectAllOnPage,
  selectedBlock,
  selectedIds,
  setGroupIsolation,
  setStudioView,
  studioView,
  activeTool,
  canvasViewScale,
  setCanvasZoomFit,
  toggleLockSelected,
  undoEdit,
  ungroupSelection,
  cycleActiveVisiblePage,
  previewMode,
} from "../../state/store";

export type ShortcutRow = { keys: string; actionKey: string };

export const SHORTCUT_SECTIONS: {
  titleKey: string;
  rows: ShortcutRow[];
}[] = [
  {
    titleKey: "shortcutSectionView",
    rows: [
      { keys: "Ctrl/⌘ + .", actionKey: "shortcutPreview" },
      { keys: "Ctrl/⌘ + ,", actionKey: "shortcutSettings" },
      { keys: "Ctrl/⌘ + Shift + E", actionKey: "shortcutToggleStudio" },
      { keys: "[ ] · Alt+←→", actionKey: "shortcutPreviewRow" },
      { keys: "Shift+[ ] · Alt+Shift+←→", actionKey: "shortcutPreviewOutput" },
      { keys: "PageUp / PageDown", actionKey: "shortcutPreviewPage" },
    ],
  },
  {
    titleKey: "shortcutSectionTools",
    rows: [
      { keys: "V", actionKey: "shortcutToolSelect" },
      { keys: "P · T · D · K", actionKey: "shortcutToolTextGroup" },
      { keys: "I · S · A · G · E", actionKey: "shortcutToolMediaGroup" },
      { keys: "Ctrl/⌘ + A", actionKey: "shortcutSelectAll" },
      { keys: "Shift / Ctrl+click", actionKey: "shortcutMultiSelect" },
      { keys: "Drag on page", actionKey: "shortcutMarqueeSelect" },
      { keys: "Esc", actionKey: "shortcutEsc" },
    ],
  },
  {
    titleKey: "shortcutSectionEdit",
    rows: [
      { keys: "Ctrl/⌘ + Z / Shift+Z", actionKey: "shortcutUndo" },
      { keys: "Ctrl/⌘ + X C V D", actionKey: "shortcutClipboard" },
      { keys: "Ctrl/⌘ + G · Shift+G", actionKey: "shortcutGroup" },
      { keys: "Ctrl/⌘ + L", actionKey: "shortcutLock" },
      { keys: "Delete · Arrows", actionKey: "shortcutDelete" },
    ],
  },
  {
    titleKey: "shortcutSectionArrange",
    rows: [
      { keys: "Ctrl/⌘ + ] · [", actionKey: "shortcutLayerNudge" },
      { keys: "Ctrl/⌘ + Shift + ] · [", actionKey: "shortcutLayerExtreme" },
    ],
  },
  {
    titleKey: "shortcutSectionInspector",
    rows: [
      { keys: "Alt + 1 … 6", actionKey: "shortcutInspectorTabs" },
      { keys: "Ctrl/⌘ + Shift + M", actionKey: "shortcutNotesTab" },
    ],
  },
  {
    titleKey: "shortcutSectionZoom",
    rows: [
      { keys: "Ctrl/⌘ + 0", actionKey: "shortcutZoomFit" },
      { keys: "Ctrl/⌘ + + / −", actionKey: "shortcutZoomStep" },
    ],
  },
  {
    titleKey: "shortcutSectionEmmet",
    rows: [
      { keys: "https://… + Space", actionKey: "shortcutEmmetUrl" },
      { keys: "data-source://field + Space", actionKey: "shortcutEmmetData" },
      { keys: "@field + Space", actionKey: "shortcutEmmetAt" },
      { keys: "mailto:/tel:/sms: + Space", actionKey: "shortcutEmmetHooks" },
    ],
  },
];

const TOOL_KEYS: Record<string, { type: BlockType; preset?: PlacePresetId }> = {
  p: { type: "paragraph" },
  t: { type: "text" },
  d: { type: "data" },
  k: { type: "link" },
  i: { type: "picture" },
  s: { type: "shape" },
  a: { type: "table" },
  g: { type: "group" },
  e: { type: "files" },
  q: { type: "qrcode" },
  n: { type: "signature" },
  y: { type: "date", preset: "date-today" },
};

const INSPECTOR_KEYS: Record<string, InspectorTabId> = {
  "1": "layers",
  "2": "design",
  "3": "data",
  "4": "comments",
  "5": "history",
  "6": "meta",
};

function mod(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey;
}

export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT" ||
    t.isContentEditable
  );
}

/** Returns true when the event was handled. */
export function handleEditorShortcut(
  e: KeyboardEvent,
  opts: { preview: boolean; overlayOpen: boolean; studioView?: "edit" | "data" },
): boolean {
  if (opts.overlayOpen) return false;
  if (isTypingTarget(e.target)) return false;

  const m = mod(e);
  const key = e.key.toLowerCase();

  if (m && e.key === ",") {
    e.preventDefault();
    openSettings("general");
    return true;
  }

  if (opts.studioView === "data") {
    if (m && e.shiftKey && key === "e") {
      e.preventDefault();
      setStudioView("edit");
      return true;
    }
    return false;
  }

  if (m && e.shiftKey && key === "e") {
    e.preventDefault();
    setStudioView(studioView.value === "edit" ? "data" : "edit");
    return true;
  }

  if (m && e.shiftKey && key === "m") {
    e.preventDefault();
    inspectorTab.value = "comments";
    return true;
  }

  if (e.altKey && !m && INSPECTOR_KEYS[e.key]) {
    e.preventDefault();
    inspectorTab.value = INSPECTOR_KEYS[e.key]!;
    return true;
  }

  if (opts.preview) {
    if (e.key === "PageDown" || e.key === "PageUp") {
      e.preventDefault();
      cycleActiveVisiblePage(e.key === "PageDown" ? 1 : -1, { preview: true });
      return true;
    }
    return false;
  }

  if (e.key === "PageDown" || e.key === "PageUp") {
    const mode = prefs.value.pageViewMode ?? "continuous";
    if (mode === "single" || mode === "continuous" || mode === "spread") {
      e.preventDefault();
      cycleActiveVisiblePage(e.key === "PageDown" ? 1 : -1, {
        preview: previewMode.value,
      });
      return true;
    }
  }

  if (m && key === "l" && !e.shiftKey) {
    e.preventDefault();
    toggleLockSelected();
    return true;
  }

  if (m && e.key === "]") {
    e.preventDefault();
    nudgeZOrder(e.shiftKey ? "front" : "forward");
    return true;
  }
  if (m && e.key === "[") {
    e.preventDefault();
    nudgeZOrder(e.shiftKey ? "back" : "backward");
    return true;
  }

  if (!m && !e.altKey && !e.shiftKey && key === "v") {
    e.preventDefault();
    armSelectTool();
    return true;
  }

  const tool = TOOL_KEYS[key];
  if (!m && !e.altKey && !e.shiftKey && tool) {
    e.preventDefault();
    armPlaceTool(tool.type, tool.preset ?? null);
    return true;
  }

  return false;
}

/** Canvas-level shortcuts (undo, clipboard, zoom, nudge). Returns true if handled. */
export function handleCanvasShortcut(e: KeyboardEvent, preview: boolean): boolean {
  if (preview || isTypingTarget(e.target)) return false;

  const m = mod(e);
  const key = e.key.toLowerCase();

  if (m && key === "z" && !e.shiftKey) {
    e.preventDefault();
    undoEdit();
    return true;
  }
  if (m && (key === "y" || (key === "z" && e.shiftKey))) {
    e.preventDefault();
    redoEdit();
    return true;
  }
  if (m && (e.key === "=" || e.key === "+")) {
    e.preventDefault();
    nudgeCanvasZoom(1, canvasViewScale.value);
    return true;
  }
  if (m && e.key === "-") {
    e.preventDefault();
    nudgeCanvasZoom(-1, canvasViewScale.value);
    return true;
  }
  if (m && e.key === "0") {
    e.preventDefault();
    setCanvasZoomFit();
    return true;
  }
  if (m && key === "a") {
    e.preventDefault();
    selectAllOnPage();
    return true;
  }
  if (m && key === "c") {
    e.preventDefault();
    copySelected();
    return true;
  }
  if (m && key === "x") {
    e.preventDefault();
    cutSelected();
    return true;
  }
  if (m && key === "v") {
    e.preventDefault();
    pasteClipboard();
    return true;
  }
  if (m && key === "d") {
    e.preventDefault();
    duplicateSelected();
    return true;
  }
  if (m && key === "g") {
    e.preventDefault();
    if (e.shiftKey) ungroupSelection();
    else groupSelection();
    return true;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    if (selectedBlock.value == null && selectedIds.value.length === 0) {
      return false;
    }
    e.preventDefault();
    deleteSelection();
    return true;
  }
  const step = e.shiftKey ? 10 : 1;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    nudgeSelection(-step, 0);
    return true;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    nudgeSelection(step, 0);
    return true;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    nudgeSelection(0, -step);
    return true;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    nudgeSelection(0, step);
    return true;
  }
  return false;
}

/** Edit-studio key handler — clipboard, tools, escape. Used at workspace level. */
export function handleEditStudioKeydown(
  e: KeyboardEvent,
  opts: {
    preview: boolean;
    overlayOpen: boolean;
    studioView: "edit" | "data";
  },
): boolean {
  if (opts.overlayOpen) return false;
  if (opts.studioView !== "edit") {
    return handleEditorShortcut(e, opts);
  }
  if (handleCanvasShortcut(e, opts.preview)) return true;
  if (handleEditorShortcut(e, opts)) return true;
  if (isTypingTarget(e.target)) return false;

  if (e.key === "Escape") {
    if (prefs.value.groupIsolationId) {
      e.preventDefault();
      setGroupIsolation(null);
      return true;
    }
    if (activeTool.value) {
      e.preventDefault();
      armSelectTool();
      return true;
    }
    if (selectedBlock.value || selectedIds.value.length) {
      e.preventDefault();
      select(null);
      return true;
    }
  }
  return false;
}
