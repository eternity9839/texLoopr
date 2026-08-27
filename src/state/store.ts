import { signal, computed, effect } from "@preact/signals";
import { canvasSizeForSession } from "../model/canvasView";
import {
  Block,
  BlockStyle,
  BlockType,
  BLOCK_DEFAULTS,
  Comment,
  createEmptyProject,
  createId,
  EditorPrefs,
  ensureProjectAutomation,
  LegacyAppMode,
  normalizeMargins,
  Page,
  PageMargins,
  Project,
  Selection,
  StudioView,
  UiOverlay,
  Watermark,
  type CanvasPresetId,
  type PageChromeSlot,
} from "../model/document";
import { CANVAS_PRESETS } from "../model/document";
import { createDemoProject, getDemo } from "../model/demos/library";
import { DataRow, parseDataInput, SAMPLE_CSV, pageMeetsCondition } from "../model/bindings";
import { enrichPreviewContext } from "../model/runtime";
import { bindingPathToDataFocus } from "../model/dataField";
import {
  applyDocumentStylePreset,
  documentStyleFromProject,
  findDocumentStyle,
  findTextStyle,
  textStyleFromBlock,
  type DocumentStylePreset,
  type TextStylePreset,
} from "../model/styleLibrary";
import { normalizeRect, px } from "../model/geometry";
import {
  buildPlaceDraft,
  type PlaceDraft,
  type PlacePresetId,
} from "../model/placeTools";
import { expandPrebuild, getPrebuildRecipe } from "../model/prebuild/library";
import { defaultRepeatChildren } from "../model/repeat";
import {
  customObjectFromGroup,
  expandCustomObject,
  findBlockDeep,
  makeGroupFromBlocks,
  removeBlockDeep,
  ungroupBlock,
  updateBlockDeep,
} from "../model/groups";
import {
  bandNeedsHeight,
  ensurePageChrome,
  findChromeBlock,
  toBandLocalBlocks,
} from "../model/pageChrome";
import {
  nudgeBlockZOrder,
  type ZOrderDirection,
} from "../model/layerStack";
import type {
  OutputProfile,
  ProjectScript,
  WorkflowStep,
} from "../model/workflow";
import { EditHistory, isEditHistorySnapshot, type EditHistorySnapshot } from "../model/history";
import type { InspectorTabId } from "../features/studio/inspectorTabs";
import { clearAllIssues, noteIssue } from "./issueLog";
import {
  clampZoom,
  stepZoom,
} from "../features/editor/canvasScale";
import {
  isTourCompleted,
  markTourCompleted,
  getTourSteps,
  type TourStepId,
} from "../model/tour";
import { isEphemeral } from "../runtimeConfig";
import {
  canContinueFrom,
  continueLabelTitle,
  hasLocalDraftSnapshot,
  pickContinueProjectId,
} from "../model/startHub";

const TEMP_KEY = "texlooper.temp.active.v1";

export type AppPhase = "start" | "studio" | "docs";

export interface AppStateSnapshot {
  catalogProjectId: string | null;
  project: Project;
  studioView: StudioView;
  overlay: UiOverlay;
  previewMode: boolean;
  selection: Selection;
  dataRows: DataRow[];
  previewRowIndex: number;
  prefs: EditorPrefs;
  activeTool: BlockType | null;
  placeCascade: number;
  editHistory?: EditHistorySnapshot | null;
  /** Legacy field migrated on load */
  mode?: LegacyAppMode | StudioView | "preview";
}

function migrateStudioView(
  saved: Partial<AppStateSnapshot> | null,
): StudioView {
  const view = saved?.studioView as string | undefined;
  if (view === "data") return "data";
  if (view === "edit" || view === "preview") return "edit";
  const legacy = saved?.mode;
  if (legacy === "data") return "data";
  return "edit";
}

function migratePreviewMode(saved: Partial<AppStateSnapshot> | null): boolean {
  if (typeof saved?.previewMode === "boolean") return saved.previewMode;
  const view = saved?.studioView as string | undefined;
  if (view === "preview" || saved?.mode === "preview") return true;
  return false;
}

function migrateOverlay(saved: Partial<AppStateSnapshot> | null): UiOverlay {
  if (
    saved?.overlay === "settings" ||
    saved?.overlay === "about" ||
    saved?.overlay === "catalog" ||
    saved?.overlay === "automation" ||
    saved?.overlay === "samples" ||
    saved?.overlay === "render"
  ) {
    return saved.overlay;
  }
  if (saved?.mode === "settings") return "settings";
  if (saved?.mode === "about") return "about";
  return null;
}

function migratePrefs(saved: Partial<AppStateSnapshot> | null): EditorPrefs {
  const base: EditorPrefs = saved?.prefs ?? {
    showGrid: false,
    snap: true,
    density: "compact",
    theme: "nova",
    showRulers: true,
    showComments: true,
    showToolsRail: true,
    showInspectorRail: true,
    showStatusBar: true,
    navWidth: 220,
    toolsWidth: 44,
    inspectorWidth: 280,
    navCollapsed: false,
    toolsCollapsed: false,
    inspectorCollapsed: false,
    toolsOrientation: "vertical",
    propsHeight: 240,
    propsCollapsed: true,
    gridSize: 16,
    gridLock: false,
    gridStyle: "lines",
    showMarginGuides: false,
    showBlockOutlines: false,
    showPinIndicators: false,
    showPageChrome: false,
    showPageBounds: false,
    rulerUnit: "px",
    locale: "en",
    canvasZoomMode: "fit",
    canvasZoom: 1,
    editContrastAssist: true,
    showInactiveBranches: false,
    pageViewMode: "continuous",
    bindingPreviewMode: "popup",
  };
  let next = base;
  if (saved?.prefs && saved.prefs.locale == null) {
    next = { ...next, locale: "en" };
  }
  if (saved?.prefs && saved.prefs.editContrastAssist == null) {
    next = { ...next, editContrastAssist: true };
  }
  if (saved?.prefs && saved.prefs.showInactiveBranches == null) {
    next = { ...next, showInactiveBranches: false };
  }
  if (saved?.prefs && saved.prefs.pageViewMode == null) {
    next = { ...next, pageViewMode: "continuous" };
  }
  if (saved?.prefs && saved.prefs.bindingPreviewMode == null) {
    next = { ...next, bindingPreviewMode: "popup" };
  }
  if (saved?.prefs && saved.prefs.showBlockOutlines == null) {
    next = { ...next, showBlockOutlines: false };
  }
  if (saved?.prefs && saved.prefs.showPinIndicators == null) {
    next = { ...next, showPinIndicators: false };
  }
  if (saved?.prefs && saved.prefs.showPageChrome == null) {
    next = { ...next, showPageChrome: false };
  }
  if (saved?.prefs && saved.prefs.showPageBounds == null) {
    next = { ...next, showPageBounds: false };
  }
  const artboard = saved?.project?.artboard;
  if (artboard && next.canvasPreset !== artboard) {
    next = { ...next, canvasPreset: artboard };
  }
  return next;
}

function loadSnapshot(): Partial<AppStateSnapshot> | null {
  if (isEphemeral()) return null;
  try {
    const raw =
      localStorage.getItem(TEMP_KEY) ??
      localStorage.getItem("texloopr.temp.active.v1") ??
      localStorage.getItem("texlooper.draft.v1") ??
      localStorage.getItem("texloopr.draft.v1");
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AppStateSnapshot>;
  } catch {
    return null;
  }
}

const saved =
  typeof localStorage !== "undefined" && !isEphemeral()
    ? loadSnapshot()
    : null;

export const catalogProjectId = signal<string | null>(
  saved?.catalogProjectId ?? null,
);
export const project = signal<Project>(
  ensureProjectAutomation(saved?.project ?? createDemoProject()),
);
export const studioView = signal<StudioView>(migrateStudioView(saved));
export const overlay = signal<UiOverlay>(migrateOverlay(saved));
export const previewMode = signal<boolean>(migratePreviewMode(saved));
export const selection = signal<Selection>(saved?.selection ?? null);
export const dataRows = signal<DataRow[]>(
  saved?.dataRows ?? parseDataInput(SAMPLE_CSV),
);
export const previewRowIndex = signal<number>(saved?.previewRowIndex ?? 0);
/**
 * Session override for document language in Edit/Preview.
 * `null` = resolve from row / project (default).
 * Prefer project.conditions axes + previewConditionOverrides for new templates.
 */
export const previewLanguageOverride = signal<string | null>(null);

export function setPreviewLanguageOverride(next: string | null): void {
  previewLanguageOverride.value = next;
}

/**
 * Preview overrides for Project.conditions axes (keyed by condition id or var).
 * Missing / null entry = follow row (or project default).
 */
export const previewConditionOverrides = signal<Record<string, string | null>>(
  {},
);

export function setPreviewConditionOverride(
  axisKey: string,
  next: string | null,
): void {
  const cur = { ...previewConditionOverrides.value };
  if (next == null) delete cur[axisKey];
  else cur[axisKey] = next;
  previewConditionOverrides.value = cur;
}

export function clearPreviewConditionOverrides(): void {
  previewConditionOverrides.value = {};
}

export const prefs = signal<EditorPrefs>(migratePrefs(saved));

function localizedTourSteps() {
  return getTourSteps(prefs.value.locale === "en" ? "en" : "fr");
}

export const activeTool = signal<BlockType | null>(null);
/** Word-helper / insert preset while a place tool is armed. */
export const activeToolPreset = signal<PlacePresetId | null>(null);
/** Pre-commit params dialog after clicking the surface with a tool armed. */
export const placeDraft = signal<PlaceDraft | null>(null);
/** Live canvas render scale (fit or manual) — for zoom chrome. */
export const canvasViewScale = signal(1);
export const activePrebuildId = signal<string>("header");
export const placeCascade = signal(saved?.placeCascade ?? 0);

/** Where a freshly inserted block lands (shared by ribbon, toolbox, pickers) */
export type InsertPlacement = "cascade" | "center" | "margins";
export const insertPlacement = signal<InsertPlacement>("cascade");

export function setInsertPlacement(next: InsertPlacement): void {
  insertPlacement.value = next;
}

/** Prebuild recipe chooser visibility */
export const prebuildPickerOpen = signal(false);

export function openPrebuildPicker(): void {
  prebuildPickerOpen.value = true;
  clearPlaceTool();
}

export function closePrebuildPicker(): void {
  prebuildPickerOpen.value = false;
}
export const catalogReady = signal(false);
export const catalogBackend = signal<"tauri" | "web" | "http" | null>(null);

/** Non-ephemeral cold starts on the hub; ephemeral goes straight to the studio. */
export const appPhase = signal<AppPhase>(isEphemeral() ? "studio" : "start");
/** Continue button: null when disabled. */
export const continueOffer = signal<{ title: string } | null>(null);

const editHistory = new EditHistory();
if (saved?.editHistory && isEditHistorySnapshot(saved.editHistory)) {
  editHistory.loadSnapshot(saved.editHistory);
}
export const historyEpoch = signal(0);
export const clipboardBlocks = signal<Block[]>([]);
export const inspectorTab = signal<InspectorTabId>("design");
export const tourActive = signal(false);
export const tourStepIndex = signal(0);
export const tourStepId = computed(
  () =>
    localizedTourSteps()[tourStepIndex.value]?.id ??
    ("welcome" as TourStepId),
);

export const activePage = computed(() => {
  const p = project.value;
  return p.pages.find((page) => page.id === p.activePageId) ?? p.pages[0];
});

export const selectedBlock = computed(() => {
  const sel = selection.value;
  if (!sel || sel.kind !== "block") return null;
  for (const page of project.value.pages) {
    const block = findBlockDeep(page.blocks, sel.id);
    if (block) return block;
  }
  const chromeHit = findChromeBlock(project.value.pageChrome, sel.id);
  return chromeHit?.block ?? null;
});

/** Multi-select for grouping (Shift+click). Primary focus stays in `selection`. */
export const selectedIds = signal<string[]>([]);

export const selectedBlocks = computed(() => {
  const p = project.value;
  const page = activePage.value;
  if (!page) return [];
  const ids = selectedIds.value.length
    ? selectedIds.value
    : selection.value?.kind === "block"
      ? [selection.value.id]
      : [];
  return ids
    .map((id) => {
      const onPage = findBlockDeep(page.blocks, id);
      if (onPage) return onPage;
      return findChromeBlock(p.pageChrome, id)?.block ?? null;
    })
    .filter((b): b is Block => Boolean(b));
});

function projectPageSize(p: Project): { w: number; h: number } {
  const page = p.pages.find((x) => x.id === p.activePageId) ?? p.pages[0];
  if (page?.width && page?.height) {
    return { w: page.width, h: page.height };
  }
  const preset = (p.artboard ?? "document") as CanvasPresetId;
  const size = CANVAS_PRESETS[preset] ?? CANVAS_PRESETS.document;
  return { w: size.w, h: size.h };
}

export const previewRow = computed(() => {
  const rows = dataRows.value;
  if (!rows.length) return undefined;
  const idx = Math.min(previewRowIndex.value, rows.length - 1);
  return rows[idx];
});

if (typeof localStorage !== "undefined" && !isEphemeral()) {
  effect(() => {
    // Temp working copy of the *active* project + UI session only.
    const snapshot: AppStateSnapshot = {
      catalogProjectId: catalogProjectId.value,
      project: project.value,
      studioView: studioView.value,
      overlay: overlay.value,
      previewMode: previewMode.value,
      selection: selection.value,
      dataRows: dataRows.value,
      previewRowIndex: previewRowIndex.value,
      prefs: prefs.value,
      activeTool: activeTool.value,
      placeCascade: placeCascade.value,
      editHistory: editHistory.toSnapshot(),
    };
    void historyEpoch.value;
    try {
      localStorage.setItem(TEMP_KEY, JSON.stringify(snapshot));
    } catch {
      // Quota exceeded — drop history from autosave and retry once.
      try {
        localStorage.setItem(
          TEMP_KEY,
          JSON.stringify({ ...snapshot, editHistory: null }),
        );
      } catch {
        /* ignore */
      }
    }
  });
}

export function updateProject(
  mutator: (draft: Project) => Project,
  options: { history?: boolean; label?: string } = {},
): void {
  if (options.history) {
    editHistory.push(project.value, options.label ?? "Edit document");
    historyEpoch.value += 1;
  }
  project.value = mutator(structuredClone(project.value));
}

export function pushHistoryCheckpoint(label = "Move or resize"): void {
  editHistory.push(project.value, label);
  historyEpoch.value += 1;
}

export function undoEdit(): void {
  const prev = editHistory.undo(project.value);
  if (prev) {
    project.value = prev;
    historyEpoch.value += 1;
  }
}

export function redoEdit(): void {
  const next = editHistory.redo(project.value);
  if (next) {
    project.value = next;
    historyEpoch.value += 1;
  }
}

export function canUndo(): boolean {
  void historyEpoch.value;
  return editHistory.canUndo();
}

export function canRedo(): boolean {
  void historyEpoch.value;
  return editHistory.canRedo();
}

export function historyActionLog() {
  void historyEpoch.value;
  return editHistory.actionLog();
}

function restoreEditHistoryFromMeta(meta: Record<string, unknown> | undefined): void {
  const raw = meta?.editHistory;
  if (isEditHistorySnapshot(raw)) {
    editHistory.loadSnapshot(raw);
  } else {
    editHistory.clear();
  }
  historyEpoch.value += 1;
}

export function setStudioView(next: StudioView): void {
  studioView.value = next;
  overlay.value = null;
  if (next === "data") {
    previewMode.value = false;
  }
}

export type DataStudioFocus = {
  column: string;
  nestedTab?: string;
};

export const dataStudioFocus = signal<DataStudioFocus | null>(null);

export function focusDataField(focus: DataStudioFocus): void {
  if (!focus.column.trim()) return;
  dataStudioFocus.value = focus;
  setStudioView("data");
}

export function focusDataFieldFromBindingPath(rawPath: string): void {
  const { column, nestedTab } = bindingPathToDataFocus(rawPath);
  if (!column) return;
  focusDataField({ column, nestedTab });
}

export function setPreviewMode(on: boolean): void {
  previewMode.value = on;
  if (on) {
    studioView.value = "edit";
    clearPlaceTool();
  }
}

export function togglePreviewMode(): void {
  setPreviewMode(!previewMode.value);
}

export function setOverlay(next: UiOverlay): void {
  overlay.value = next;
}

export type SettingsSection = "general" | "appearance" | "page" | "editor";
export const settingsSection = signal<SettingsSection>("general");

export function openSettings(section: SettingsSection = "general"): void {
  settingsSection.value = section;
  overlay.value = "settings";
}

export function select(next: Selection): void {
  selection.value = next;
  if (next?.kind === "block") {
    selectedIds.value = [next.id];
  } else {
    selectedIds.value = [];
  }
}

/** Replace the current multi-selection (primary = last id). */
export function selectBlocks(ids: string[]): void {
  const unique = [...new Set(ids)];
  if (!unique.length) {
    select(null);
    return;
  }
  selectedIds.value = unique;
  selection.value = { kind: "block", id: unique[unique.length - 1]! };
}

/** Shift+click: add id to multi-selection (does not remove). */
export function selectBlockAdd(id: string): void {
  const set = new Set(selectedIds.value);
  set.add(id);
  selectedIds.value = [...set];
  selection.value = { kind: "block", id };
}

/** Ctrl/⌘+click: toggle id in multi-selection. */
export function selectBlockToggle(id: string): void {
  const set = new Set(selectedIds.value);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  selectedIds.value = [...set];
  selection.value = set.size
    ? { kind: "block", id: [...set][set.size - 1]! }
    : null;
}

/** Ask BlockFrame to enter text edit (Enter / F2). */
export const editRequestId = signal<string | null>(null);

export function requestEditSelectedBlock(): boolean {
  const block = selectedBlock.value;
  if (!block) return false;
  const textLike = [
    "paragraph",
    "text",
    "list",
    "data",
    "link",
    "date",
  ].includes(block.type);
  if (!textLike || block.locked) return false;
  editRequestId.value = block.id;
  return true;
}

/**
 * Create a reusable custom component from the current selection.
 * Groups multiple blocks first when needed, then saves as a custom object.
 */
export function createComponentFromSelection(name?: string): string | null {
  const blocks = selectedBlocks.value;
  if (blocks.length < 1) return null;

  const sole = blocks.length === 1 ? blocks[0]! : null;
  if (!(sole && (sole.type === "group" || sole.type === "repeat"))) {
    groupSelection();
  }
  const block = selectedBlock.value;
  if (!block || (block.type !== "group" && block.type !== "repeat")) return null;
  const label =
    name?.trim() ||
    (blocks.length > 1
      ? `Component (${blocks.length})`
      : `${block.name || "Component"}`);
  saveSelectionAsCustomObject(label);
  return block.id;
}

/** Select every unlocked top-level block on the active page. */
export function selectAllOnPage(): void {
  const page = activePage.value;
  if (!page) return;
  selectBlocks(page.blocks.filter((b) => !b.locked).map((b) => b.id));
}

function clearPlaceTool(): void {
  activeTool.value = null;
  activeToolPreset.value = null;
  placeDraft.value = null;
}

/** Pointer/select mode — cancel place tools and return to selection. */
export function armSelectTool(): void {
  clearPlaceTool();
}

export function setActiveTool(tool: BlockType | null): void {
  if (!tool) {
    clearPlaceTool();
    return;
  }
  armPlaceTool(tool, null);
}

/** Arm a place tool: crosshair + options strip. Does not insert until canvas click. */
export function armPlaceTool(
  type: BlockType | null,
  preset: PlacePresetId | null = null,
): void {
  if (!type) {
    clearPlaceTool();
    return;
  }
  activeTool.value = type;
  activeToolPreset.value = preset;
  // Options live while armed; click position is applied at commit time.
  placeDraft.value = buildPlaceDraft(type, preset, { x: 0, y: 0 });
}

export function updatePlaceDraft(
  patch: Partial<Omit<PlaceDraft, "type">> & {
    content?: Record<string, unknown>;
    style?: BlockStyle;
  },
): void {
  const cur = placeDraft.value;
  if (!cur) return;
  placeDraft.value = {
    ...cur,
    ...patch,
    content: patch.content ? { ...cur.content, ...patch.content } : cur.content,
    style: patch.style ? { ...cur.style, ...patch.style } : cur.style,
    at: patch.at ?? cur.at,
  };
}

/** Place the armed tool at a page point using current options. Tool stays armed. */
export function commitPlaceAt(at: { x: number; y: number }): string {
  const type = activeTool.value;
  const opts = placeDraft.value;
  if (!type || !opts) return "";
  const placedAt = {
    x: Math.max(0, at.x - opts.w / 2),
    y: Math.max(0, at.y - opts.h / 2),
  };
  return insertBlock(type, placedAt, {
    content: opts.content,
    style: opts.style,
    name: opts.name,
    w: opts.w,
    h: opts.h,
    lockAspectRatio: opts.lockAspectRatio,
  });
}

export function cancelPlaceDraft(): void {
  clearPlaceTool();
}

export function createProject(): void {
  editHistory.clear();
  historyEpoch.value += 1;
  clearAllIssues();
  project.value = createEmptyProject();
  catalogProjectId.value = null;
  selection.value = { kind: "page", id: project.value.activePageId };
  placeCascade.value = 0;
  studioView.value = "edit";
  previewMode.value = false;
  dataRows.value = [];
  previewRowIndex.value = 0;
  updatePrefs({ canvasPreset: project.value.artboard ?? "document" });
}

export function loadDemoProject(): void {
  loadDemoSample("welcome");
}

export function loadDemoSample(id: string): void {
  const entry = getDemo(id) ?? getDemo("welcome");
  if (!entry) return;
  editHistory.clear();
  historyEpoch.value += 1;
  clearAllIssues();
  const built = ensureProjectAutomation(entry.build());
  const artboard = (entry.artboard ?? built.artboard ?? "document") as CanvasPresetId;
  built.artboard = artboard;
  project.value = built;
  catalogProjectId.value = null;
  selection.value = null;
  placeCascade.value = 0;
  studioView.value = "edit";
  previewMode.value = false;
  setOverlay(null);
  updatePrefs({ canvasPreset: artboard });
  let parsed: DataRow[] = [];
  try {
    parsed = parseDataInput(entry.sampleCsv);
  } catch {
    parsed = parseDataInput(SAMPLE_CSV);
  }
  previewRowIndex.value = 0;

  if (!built.datasets?.length) {
    const dsId = createId();
    updateProject((draft) => ({
      ...draft,
      datasets: [
        {
          id: dsId,
          name: "primary",
          rows: [...parsed] as Record<string, unknown>[],
        },
      ],
      primaryDatasetId: dsId,
    }));
    dataRows.value = parsed;
  } else {
    updateProject((draft) => {
      const list = [...(draft.datasets ?? [])];
      let primary =
        list.find((d) => d.id === draft.primaryDatasetId) ??
        list.find((d) => d.name === "primary");
      if (!primary) {
        const dsId = createId();
        primary = {
          id: dsId,
          name: "primary",
          rows: [...parsed] as Record<string, unknown>[],
        };
        list.unshift(primary);
        draft.primaryDatasetId = dsId;
      } else if (!primary.rows?.length && parsed.length) {
        primary.rows = [...parsed] as Record<string, unknown>[];
      }
      draft.datasets = list;
      return draft;
    });
    dataRows.value = parsed;
  }
}

/** Replace the draft with a Project from PDF structure import (ADR 0012). */
export function loadImportedProject(doc: Project, warnings: string[] = []): void {
  editHistory.clear();
  historyEpoch.value += 1;
  clearAllIssues();
  const built = ensureProjectAutomation(doc);
  const artboard = (built.artboard ?? "document") as CanvasPresetId;
  built.artboard = artboard;
  project.value = built;
  catalogProjectId.value = null;
  selection.value = {
    kind: "page",
    id: built.activePageId,
  };
  placeCascade.value = 0;
  studioView.value = "edit";
  previewMode.value = false;
  setOverlay(null);
  updatePrefs({ canvasPreset: artboard });
  dataRows.value = [];
  previewRowIndex.value = 0;
  for (const w of warnings) {
    noteIssue({
      category: "runtime",
      severity: "warning",
      message: w,
      source: "manual",
    });
  }
}

export function updateProjectMeta(
  patch: Partial<
    Pick<
      Project,
      | "name"
      | "author"
      | "subject"
      | "description"
      | "published"
      | "keywords"
      | "language"
      | "conditions"
      | "version"
      | "category"
      | "tags"
      | "createdAt"
      | "company"
      | "contactEmail"
      | "email"
      | "customMeta"
      | "artboard"
    >
  >,
): void {
  updateProject((draft) => ({ ...draft, ...patch }));
}

export function updateProjectAutomation(
  patch: Partial<{
    outputs: OutputProfile[];
    activeOutputId: string;
    workflow: WorkflowStep[];
    scripts: ProjectScript[];
  }>,
): void {
  updateProject((draft) =>
    ensureProjectAutomation({
      ...draft,
      ...patch,
    }),
  );
}

export function setActiveOutputId(id: string): void {
  updateProject((draft) =>
    ensureProjectAutomation({ ...draft, activeOutputId: id }),
  );
}

export function setGroupIsolation(id: string | null): void {
  updatePrefs({ groupIsolationId: id ?? undefined });
}

export function activeOutputProfile(): OutputProfile | undefined {
  const p = ensureProjectAutomation(project.value);
  return p.outputs?.find((o) => o.id === p.activeOutputId) ?? p.outputs?.[0];
}

export function stampSaved(): void {
  if (isEphemeral()) return;
  updateProject((draft) => ({
    ...draft,
    lastSaved: new Date().toISOString(),
  }));
  void persistActiveToCatalog();
}

export async function persistActiveToCatalog(): Promise<void> {
  if (isEphemeral()) return;
  const { persistActiveProject } = await import("../storage/catalog");
  const p = project.value;
  const record = await persistActiveProject({
    id: catalogProjectId.value,
    name: p.name,
    document: p,
    meta: {
      author: p.author,
      subject: p.subject,
      description: p.description,
      published: p.published,
      editHistory: editHistory.toSnapshot(),
    },
  });
  catalogProjectId.value = record.summary.id;
}

export async function hydrateFromCatalog(): Promise<void> {
  const { getCatalog } = await import("../storage/catalog");
  const catalog = await getCatalog();
  catalogBackend.value = catalog.backend;
  if (!isEphemeral()) {
    const active = await catalog.getActiveProject();
    if (active && active.document && typeof active.document === "object") {
      catalogProjectId.value = active.summary.id;
      project.value = ensureProjectAutomation(active.document as Project);
      restoreEditHistoryFromMeta(active.summary.meta);
      if (project.value.artboard) {
        updatePrefs({ canvasPreset: project.value.artboard });
      }
    }
  }
  catalogReady.value = true;
  await refreshContinueOffer();
}

export async function openCatalogProject(id: string): Promise<void> {
  if (isEphemeral()) return;
  const { getCatalog } = await import("../storage/catalog");
  const catalog = await getCatalog();
  const record = await catalog.setActiveProject(id);
  catalogProjectId.value = record.summary.id;
  if (record.document && typeof record.document === "object") {
    project.value = ensureProjectAutomation(record.document as Project);
    restoreEditHistoryFromMeta(record.summary.meta);
    if (project.value.artboard) {
      updatePrefs({ canvasPreset: project.value.artboard });
    }
  }
  selection.value = null;
  previewMode.value = false;
  studioView.value = "edit";
}

export function setActivePage(pageId: string): void {
  updateProject((draft) => ({ ...draft, activePageId: pageId }));
  selection.value = { kind: "page", id: pageId };
}

export function addPage(name?: string): void {
  const id = createId();
  updateProject((draft) => {
    const page: Page = {
      id,
      name: name ?? `Surface ${draft.pages.length + 1}`,
      blocks: [],
    };
    draft.pages.push(page);
    draft.activePageId = id;
    return draft;
  }, { history: true, label: "Add page" });
  selection.value = { kind: "page", id };
}

export function updatePage(
  pageId: string,
  patch: Partial<
    Pick<
      Page,
      "name" | "background" | "rotate" | "mirrorX" | "mirrorY" | "condition" | "pinRespectsMargins"
    >
  > & {
    margins?: Partial<PageMargins>;
    watermark?: Watermark | null;
    pageNumber?: Page["pageNumber"] | null;
  },
): void {
  updateProject((draft) => {
    const page = draft.pages.find((p) => p.id === pageId);
    if (!page) return draft;
    const { margins, watermark, pageNumber, ...rest } = patch;
    Object.assign(page, rest);
    if (margins) page.margins = normalizeMargins({ ...normalizeMargins(page.margins), ...margins });
    if (watermark !== undefined) page.watermark = watermark ?? undefined;
    if (pageNumber !== undefined) page.pageNumber = pageNumber ?? undefined;
    return draft;
  }, { history: true, label: "Update page" });
}

export function insertBlock(
  type: BlockType,
  at?: { x: number; y: number },
  opts?: {
    content?: Record<string, unknown>;
    style?: BlockStyle;
    name?: string;
    w?: number;
    h?: number;
    lockAspectRatio?: boolean;
  },
): string {
  const cascade = placeCascade.value;
  const x = px(at?.x ?? 48 + (cascade % 5) * 24);
  const y = px(at?.y ?? 48 + (cascade % 5) * 24);

  if (type === "prebuild") {
    clearPlaceTool();
    return "";
  }

  const defaults = BLOCK_DEFAULTS[type];
  const id = createId();
  const content =
    type === "repeat"
      ? {
          itemsPath: "line_items",
          itemVar: "item",
          blocks: defaultRepeatChildren(),
          ...(opts?.content ?? {}),
        }
      : type === "group"
        ? { blocks: [], ...(opts?.content ?? {}) }
        : { ...defaults.content, ...(opts?.content ?? {}) };

  const defaultStyle: BlockStyle =
    type === "shape"
      ? {
          background: "transparent",
          borderWidth: 1.5,
          borderColor: "#2a2622",
          opacity: 1,
          color: "#2a2622",
        }
      : { fontSize: 14, color: "#2a2622", textAlign: "left" };

  const block: Block = {
    id,
    type,
    name: opts?.name ?? defaults.name,
    x,
    y,
    w: px(opts?.w ?? defaults.w),
    h: px(opts?.h ?? defaults.h),
    content,
    style: { ...defaultStyle, ...(opts?.style ?? {}) },
    zIndex: cascade + 1,
    ...(opts?.lockAspectRatio ? { lockAspectRatio: true } : {}),
  };
  updateProject((draft) => {
    const page = draft.pages.find((p) => p.id === draft.activePageId);
    if (page) page.blocks.push(block);
    return draft;
  }, { history: true, label: `Insert ${type}` });
  placeCascade.value = cascade + 1;
  selection.value = { kind: "block", id };
  clearPlaceTool();
  return id;
}

/** Compute the origin for a placed insert according to the chosen placement */
function originForPlacement(
  placement: InsertPlacement,
  wPx: number,
  hPx: number,
): { x: number; y: number } {
  if (placement === "center") {
    const { w: pageW, h: pageH } = canvasSizeForSession(
      project.value,
      prefs.value,
    );
    return {
      x: Math.round((pageW - wPx) / 2),
      y: Math.round((pageH - hPx) / 2),
    };
  }
  if (placement === "margins") {
    const m = normalizeMargins(activePage.value?.margins);
    return { x: m.left, y: m.top };
  }
  const cascade = placeCascade.value;
  return { x: 48 + (cascade % 5) * 24, y: 48 + (cascade % 5) * 24 };
}

export function insertBlockPlaced(
  type: BlockType,
  placement: InsertPlacement = insertPlacement.value,
): void {
  if (type === "prebuild") {
    // Prebuild UI removed — no blind insert and no picker.
    return;
  }
  const defaults = BLOCK_DEFAULTS[type];
  const origin = originForPlacement(placement, px(defaults.w), px(defaults.h));
  insertBlock(type, origin);
}

/** Insert a specific prebuild recipe at the chosen placement */
export function insertPrebuildRecipe(recipeId: string): void {
  const recipe = getPrebuildRecipe(recipeId);
  if (!recipe) return;
  const origin = originForPlacement(
    insertPlacement.value,
    px(recipe.w),
    px(recipe.h),
  );
  const cascade = placeCascade.value;
  const pieces = expandPrebuild(recipeId, {
    x: px(origin.x),
    y: px(origin.y),
  });
  let lastId = "";
  updateProject((draft) => {
    const page = draft.pages.find((p) => p.id === draft.activePageId);
    if (!page) return draft;
    for (const piece of pieces) {
      piece.zIndex = (piece.zIndex ?? 1) + cascade;
      page.blocks.push(piece);
      lastId = piece.id;
    }
    return draft;
  }, { history: true, label: "Insert prebuild" });
  placeCascade.value = cascade + pieces.length;
  activePrebuildId.value = recipeId;
  if (lastId) selection.value = { kind: "block", id: lastId };
  closePrebuildPicker();
}

/** Create a named dataset and optionally bind a table block to it. */
export function addNamedDataset(
  opts: { name?: string; keyField?: string; bindTableId?: string } = {},
): string {
  const id = createId();
  const name =
    opts.name?.trim() ||
    `dataset_${(project.value.datasets?.length ?? 0) + 1}`;
  updateProject((draft) => {
    const list = [...(draft.datasets ?? [])];
    list.push({
      id,
      name,
      keyField: opts.keyField ?? "",
      rows: [],
    });
    draft.datasets = list;
    if (!draft.primaryDatasetId) draft.primaryDatasetId = id;
    return draft;
  });
  if (opts.bindTableId) {
    updateBlock(opts.bindTableId, {
      content: { datasetName: name, sourcePath: "" },
    });
  }
  return id;
}

export function updateBlock(
  blockId: string,
  patch: Omit<
    Partial<
      Pick<
        Block,
        | "name"
        | "x"
        | "y"
        | "w"
        | "h"
        | "content"
        | "style"
        | "condition"
        | "bindings"
        | "locked"
        | "zIndex"
        | "lockAspectRatio"
        | "variants"
      >
    >,
    never
  > & { pin?: Block["pin"] | null },
  options: { history?: boolean; label?: string } = {},
): void {
  updateProject((draft) => {
    for (const page of draft.pages) {
      if (!findBlockDeep(page.blocks, blockId)) continue;
      page.blocks = updateBlockDeep(page.blocks, blockId, (block) =>
        applyBlockPatch(block, patch),
      );
      return draft;
    }

    const chromeHit = findChromeBlock(draft.pageChrome, blockId);
    if (!chromeHit) return draft;
    const size = projectPageSize(draft);
    draft.pageChrome = ensurePageChrome(draft.pageChrome);
    const band = draft.pageChrome[chromeHit.slot]!;
    const originY =
      chromeHit.slot === "header" ? 0 : Math.max(0, size.h - band.height);
    const absPatch = { ...patch };
    if (absPatch.y != null) absPatch.y = absPatch.y - originY;
    band.blocks = band.blocks.map((b) =>
      b.id === blockId ? applyBlockPatch(b, absPatch) : b,
    );
    return draft;
  }, options);
}

function applyBlockPatch(
  block: Block,
  patch: Parameters<typeof updateBlock>[1],
): Block {
  const next = { ...block };
  const moving =
    patch.x != null || patch.y != null || patch.w != null || patch.h != null;
  if (patch.content) next.content = { ...next.content, ...patch.content };
  if (patch.style) next.style = { ...next.style, ...patch.style };
  if (patch.bindings) next.bindings = { ...next.bindings, ...patch.bindings };
  if (patch.pin === null) {
    delete next.pin;
  } else if (patch.pin !== undefined) {
    next.pin = patch.pin;
  }
  if ("lockAspectRatio" in patch) {
    if (patch.lockAspectRatio) next.lockAspectRatio = true;
    else delete next.lockAspectRatio;
  }
  const {
    content: _c,
    style: _s,
    bindings: _b,
    pin: _p,
    lockAspectRatio: _l,
    ...rest
  } = patch;
  if (!(next.locked && moving && patch.locked !== false)) {
    Object.assign(next, rest);
  } else {
    const { x: _x, y: _y, w: _w, h: _h, ...safe } = rest;
    Object.assign(next, safe);
  }
  if (
    !(next.locked && patch.locked !== false) &&
    (patch.x != null ||
      patch.y != null ||
      patch.w != null ||
      patch.h != null)
  ) {
    const norm = normalizeRect(
      { x: next.x, y: next.y, w: next.w, h: next.h },
      { x: next.x, y: next.y, w: next.w, h: next.h },
    );
    next.x = norm.x;
    next.y = norm.y;
    next.w = norm.w;
    next.h = norm.h;
  }
  return next;
}

export function deleteSelection(): void {
  const sel = selection.value;
  if (!sel) return;
  if (sel.kind === "block") {
    const ids = new Set(
      selectedIds.value.length ? selectedIds.value : [sel.id],
    );
    updateProject(
      (draft) => {
        for (const page of draft.pages) {
          for (const id of ids) {
            page.blocks = removeBlockDeep(page.blocks, id);
          }
        }
        if (draft.pageChrome) {
          draft.pageChrome = ensurePageChrome(draft.pageChrome);
          for (const slot of ["header", "footer"] as const) {
            const band = draft.pageChrome[slot]!;
            band.blocks = band.blocks.filter((b) => !ids.has(b.id));
          }
        }
        draft.comments = (draft.comments ?? []).filter(
          (c) => !ids.has(c.blockId),
        );
        return draft;
      },
      { history: true, label: "Delete selection" },
    );
    selection.value = null;
    selectedIds.value = [];
    return;
  }
  updateProject((draft) => {
    if (draft.pages.length <= 1) return draft;
    draft.pages = draft.pages.filter((p) => p.id !== sel.id);
    if (draft.activePageId === sel.id) {
      draft.activePageId = draft.pages[0]!.id;
    }
    return draft;
  }, { history: true, label: "Delete page" });
  selection.value = { kind: "page", id: project.value.activePageId };
}

export function nudgeSelection(dx: number, dy: number): void {
  const sel = selection.value;
  if (!sel || sel.kind !== "block") return;
  const ids = selectedIds.value.length ? selectedIds.value : [sel.id];
  updateProject((draft) => {
    const draftPage = draft.pages.find((p) => p.id === draft.activePageId);
    if (!draftPage) return draft;
    for (const id of ids) {
      draftPage.blocks = updateBlockDeep(draftPage.blocks, id, (b) => {
        if (b.locked) return b;
        return { ...b, x: b.x + dx, y: b.y + dy };
      });
    }
    return draft;
  }, { history: true, label: "Nudge selection" });
}

export type AlignMode =
  | "left"
  | "center-x"
  | "right"
  | "top"
  | "middle"
  | "bottom";

/** Bounding box of the current selection (page when single block) */
function alignBounds(): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const targets = selectedBlocks.value.filter((b) => !b.locked);
  if (!targets.length) return null;
  if (targets.length === 1 || selectedIds.value.length <= 1) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const b of targets) {
    minX = Math.min(minX, b.x);
    maxX = Math.max(maxX, b.x + b.w);
    minY = Math.min(minY, b.y);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { minX, maxX, minY, maxY };
}

export function alignSelected(mode: AlignMode): void {
  const bounds = alignBounds();
  if (bounds) {
    const ids = selectedIds.value;
    updateProject((draft) => {
      const page = draft.pages.find((p) => p.id === draft.activePageId);
      if (!page) return draft;
      for (const b of page.blocks) {
        if (!ids.includes(b.id) || b.locked) continue;
        switch (mode) {
          case "left": b.x = bounds.minX; break;
          case "center-x": b.x = Math.round((bounds.minX + bounds.maxX - b.w) / 2); break;
          case "right": b.x = bounds.maxX - b.w; break;
          case "top": b.y = bounds.minY; break;
          case "middle": b.y = Math.round((bounds.minY + bounds.maxY - b.h) / 2); break;
          case "bottom": b.y = bounds.maxY - b.h; break;
        }
      }
      return draft;
    }, { history: true, label: "Align selection" });
    return;
  }

  // Single selection: align to the page
  const block = selectedBlock.value;
  if (!block || block.locked) return;
  const { w: pageW, h: pageH } = canvasSizeForSession(
    project.value,
    prefs.value,
  );
  let patch: Partial<Pick<Block, "x" | "y">> = {};
  switch (mode) {
    case "left":
      patch = { x: 0 };
      break;
    case "center-x":
      patch = { x: Math.round((pageW - block.w) / 2) };
      break;
    case "right":
      patch = { x: Math.max(0, pageW - block.w) };
      break;
    case "top":
      patch = { y: 0 };
      break;
    case "middle":
      patch = { y: Math.round((pageH - block.h) / 2) };
      break;
    case "bottom":
      patch = { y: Math.max(0, pageH - block.h) };
      break;
  }
  updateBlock(block.id, patch, { history: true, label: "Align selection" });
}

export function nudgeZOrder(direction: ZOrderDirection): void {
  const block = selectedBlock.value;
  const page = activePage.value;
  if (!block || !page) return;
  updateProject((draft) => {
    const draftPage = draft.pages.find((p) => p.id === page.id);
    if (!draftPage) return draft;
    const next = nudgeBlockZOrder(draftPage.blocks, block.id, direction);
    if (next) draftPage.blocks = next;
    return draft;
  }, { history: true, label: "Change layer order" });
}

export function duplicateSelected(): void {
  const block = selectedBlock.value;
  if (!block) return;
  const id = createId();
  const copy: Block = {
    ...structuredClone(block),
    id,
    name: `${block.name} copy`,
    x: block.x + 16,
    y: block.y + 16,
    zIndex: (block.zIndex ?? 0) + 1,
    locked: false,
  };
  updateProject((draft) => {
    const page = draft.pages.find((p) => p.id === draft.activePageId);
    if (page) page.blocks.push(copy);
    return draft;
  }, { history: true, label: "Duplicate" });
  selection.value = { kind: "block", id };
}

export function copySelected(): void {
  const blocks = selectedBlocks.value;
  if (!blocks.length) return;
  clipboardBlocks.value = blocks.map((b) => structuredClone(b));
}

export function cutSelected(): void {
  copySelected();
  deleteSelection();
}

export function pasteClipboard(): void {
  const src = clipboardBlocks.value;
  if (!src.length) return;
  const newIds: string[] = [];
  updateProject((draft) => {
    const page = draft.pages.find((p) => p.id === draft.activePageId);
    if (!page) return draft;
    for (const block of src) {
      const id = createId();
      newIds.push(id);
      page.blocks.push({
        ...structuredClone(block),
        id,
        x: block.x + 24,
        y: block.y + 24,
        zIndex: (block.zIndex ?? 0) + 1,
        locked: false,
      });
    }
    return draft;
  }, {
    history: true,
    label: src.length > 1 ? `Paste ${src.length} blocks` : "Paste",
  });
  if (newIds.length) selectBlocks(newIds);
}

export function toggleLockSelected(): void {
  const block = selectedBlock.value;
  if (!block) return;
  updateBlock(block.id, { locked: !block.locked }, { history: true, label: "Toggle lock" });
}

export function addComment(body: string, blockId?: string): void {
  const targetId = blockId ?? selectedBlock.value?.id;
  if (!targetId || !body.trim()) return;
  const comment: Comment = {
    id: createId(),
    blockId: targetId,
    body: body.trim(),
    author: project.value.author || "You",
    createdAt: new Date().toISOString(),
  };
  updateProject((draft) => {
    draft.comments = [...(draft.comments ?? []), comment];
    return draft;
  }, { history: true, label: "Add comment" });
  inspectorTab.value = "comments";
}

export function resolveComment(id: string, resolved = true): void {
  updateProject((draft) => {
    const c = (draft.comments ?? []).find((x) => x.id === id);
    if (c) c.resolved = resolved;
    return draft;
  }, { history: true, label: resolved ? "Resolve comment" : "Reopen comment" });
}

export function deleteComment(id: string): void {
  updateProject((draft) => {
    draft.comments = (draft.comments ?? []).filter((c) => c.id !== id);
    return draft;
  }, { history: true, label: "Delete comment" });
}

export function commentsForBlock(blockId: string): Comment[] {
  return (project.value.comments ?? []).filter((c) => c.blockId === blockId);
}

export function startTour(): void {
  tourStepIndex.value = 0;
  tourActive.value = true;
  setStudioView("edit");
  setPreviewMode(false);
  setOverlay(null);
}

export function skipTour(): void {
  tourActive.value = false;
  markTourCompleted();
  setOverlay(null);
  setPreviewMode(false);
}

export function nextTourStep(): void {
  const next = tourStepIndex.value + 1;
  if (next >= localizedTourSteps().length) {
    skipTour();
    return;
  }
  applyTourStep(next);
}

export function prevTourStep(): void {
  const prev = Math.max(0, tourStepIndex.value - 1);
  applyTourStep(prev);
}

function applyTourStep(index: number): void {
  tourStepIndex.value = index;
  const step = localizedTourSteps()[index];
  if (!step) return;
  if (step.view) setStudioView(step.view);
  if (typeof step.preview === "boolean") setPreviewMode(step.preview);
  if (step.overlay === null) setOverlay(null);
  if (step.id === "inspector") inspectorTab.value = "design";
}

export function enterStudio(): void {
  appPhase.value = "studio";
}

export function showStartHub(): void {
  if (isEphemeral()) return;
  tourActive.value = false;
  setOverlay(null);
  setPreviewMode(false);
  appPhase.value = "start";
  void refreshContinueOffer();
}

export function showDocs(): void {
  if (isEphemeral()) return;
  tourActive.value = false;
  setOverlay(null);
  appPhase.value = "docs";
}

export function startBlankFromHub(): void {
  createProject();
  enterStudio();
}

export function startTourFromHub(): void {
  enterStudio();
  startTour();
}

export async function refreshContinueOffer(): Promise<void> {
  if (isEphemeral()) {
    continueOffer.value = null;
    return;
  }
  const hasDraft = hasLocalDraftSnapshot();
  try {
    const { getCatalog } = await import("../storage/catalog");
    const catalog = await getCatalog();
    const projects = await catalog.listProjects();
    if (!canContinueFrom(projects, hasDraft)) {
      continueOffer.value = null;
      return;
    }
    const title = continueLabelTitle(
      projects,
      catalogProjectId.value,
      project.value.name,
      hasDraft,
    );
    continueOffer.value = { title: title ?? project.value.name };
  } catch {
    continueOffer.value = hasDraft
      ? { title: project.value.name }
      : null;
  }
}

export async function continueProject(): Promise<void> {
  if (isEphemeral()) return;
  const hasDraft = hasLocalDraftSnapshot();
  try {
    const { getCatalog } = await import("../storage/catalog");
    const catalog = await getCatalog();
    const projects = await catalog.listProjects();
    const id = pickContinueProjectId(projects, catalogProjectId.value);
    if (id) {
      if (id !== catalogProjectId.value) {
        await openCatalogProject(id);
      }
      enterStudio();
      return;
    }
  } catch {
    /* fall through to draft */
  }
  if (hasDraft || catalogProjectId.value) {
    enterStudio();
  }
}

/** Ephemeral (hosted demo) only — non-demo users start the tour from the hub. */
export function maybeAutoStartTour(): void {
  if (!isEphemeral()) return;
  if (!isTourCompleted()) startTour();
}

export async function setDataFromText(raw: string): Promise<void> {
  const { parseDataInputBackend } = await import("../model/backend");
  dataRows.value = await parseDataInputBackend(raw);
  previewRowIndex.value = 0;
  updateProject((draft) => {
    if (!draft.datasets?.length) {
      const id = createId();
      draft.datasets = [{ id, name: "primary", rows: [], source: { kind: "none" } }];
      draft.primaryDatasetId = id;
    }
    const primary =
      draft.datasets.find((d) => d.id === draft.primaryDatasetId) ??
      draft.datasets[0]!;
    primary.rows = [...dataRows.value] as Record<string, unknown>[];
    primary.lastLoadedAt = new Date().toISOString();
    primary.lastError = undefined;
    return draft;
  });
}

/** Update dataset source / refresh config (does not load rows). */
export function updateDatasetSource(
  datasetId: string,
  patch: {
    source?: import("../model/dataSources").DataSourceConfig;
    refresh?: import("../model/dataSources").DataSourceRefresh;
  },
): void {
  updateProject((draft) => {
    const ds = draft.datasets?.find((d) => d.id === datasetId);
    if (!ds) return draft;
    if (patch.source !== undefined) ds.source = patch.source;
    if (patch.refresh !== undefined) ds.refresh = patch.refresh;
    return draft;
  });
}

/**
 * Load rows from the dataset's configured source into the materialized cache.
 * Syncs session `dataRows` when refreshing the primary dataset.
 */
export async function refreshDataset(datasetId: string): Promise<void> {
  const ds = project.value.datasets?.find((d) => d.id === datasetId);
  if (!ds) throw new Error("Dataset not found");

  const { loadDataSource } = await import("../model/dataSources");
  const { runSqlQueryBackend, readDataFileBackend } = await import(
    "../model/backend"
  );

  try {
    const rows = await loadDataSource(ds.source ?? { kind: "none" }, {
      existingRows: ds.rows as DataRow[],
      readFile: (path) => readDataFileBackend(path),
      runSql: (opts) => runSqlQueryBackend(opts),
    });
    const loadedAt = new Date().toISOString();
    updateProject((draft) => {
      const target = draft.datasets?.find((d) => d.id === datasetId);
      if (!target) return draft;
      target.rows = rows as Record<string, unknown>[];
      target.lastLoadedAt = loadedAt;
      target.lastError = undefined;
      return draft;
    });
    if (
      datasetId === project.value.primaryDatasetId ||
      (!project.value.primaryDatasetId &&
        project.value.datasets?.[0]?.id === datasetId)
    ) {
      dataRows.value = rows;
      previewRowIndex.value = 0;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateProject((draft) => {
      const target = draft.datasets?.find((d) => d.id === datasetId);
      if (!target) return draft;
      target.lastError = message;
      return draft;
    });
    throw err;
  }
}

/**
 * Replace dataset rows from an inbound ingest payload (parsed rows).
 */
export function ingestDatasetRows(
  datasetId: string,
  rows: DataRow[],
): void {
  const loadedAt = new Date().toISOString();
  updateProject((draft) => {
    const target = draft.datasets?.find((d) => d.id === datasetId);
    if (!target) return draft;
    target.rows = rows as Record<string, unknown>[];
    target.lastLoadedAt = loadedAt;
    target.lastError = undefined;
    return draft;
  });
  if (
    datasetId === project.value.primaryDatasetId ||
    (!project.value.primaryDatasetId &&
      project.value.datasets?.[0]?.id === datasetId)
  ) {
    dataRows.value = rows;
    previewRowIndex.value = 0;
  }
}

export function setPreviewRowIndex(index: number): void {
  previewRowIndex.value = Math.max(0, index);
}

/** Step the preview data row (wraps). No-op when there are no rows. */
export function cyclePreviewRow(delta: 1 | -1): void {
  const n = dataRows.value.length;
  if (n === 0) return;
  const cur = Math.min(previewRowIndex.value, n - 1);
  previewRowIndex.value = (cur + delta + n) % n;
}

/** Step the active output profile (wraps through project.outputs). */
export function cycleActiveOutput(delta: 1 | -1): void {
  const outputs = project.value.outputs ?? [];
  if (outputs.length === 0) return;
  const ids = outputs.map((o) => o.id);
  const curId = project.value.activeOutputId ?? ids[0]!;
  let i = ids.indexOf(curId);
  if (i < 0) i = 0;
  const next = ids[(i + delta + ids.length) % ids.length]!;
  setActiveOutputId(next);
}

/**
 * Step the active page among condition-visible pages (wraps).
 * Used by continuous scroll-spy, single-page wheel, and PageUp/PageDown.
 */
export function cycleActiveVisiblePage(
  delta: 1 | -1,
  opts?: { preview?: boolean },
): void {
  const p = project.value;
  if (p.pages.length === 0) return;
  const row = previewRow.value;
  const output = activeOutputProfile();
  const preview = opts?.preview ?? previewMode.value;
  let list = p.pages;
  if (output) {
    const runtime = enrichPreviewContext(p, row, output);
    const visible = p.pages.filter((pg) =>
      pageMeetsCondition(pg, row, runtime, { preview }),
    );
    if (visible.length > 0) list = visible;
  }
  const curId = p.activePageId;
  let i = list.findIndex((pg) => pg.id === curId);
  if (i < 0) i = 0;
  const next = list[(i + delta + list.length) % list.length]!;
  if (next.id !== curId) setActivePage(next.id);
}

export function updatePrefs(patch: Partial<EditorPrefs>): void {
  prefs.value = { ...prefs.value, ...patch };
  if (patch.locale != null && typeof document !== "undefined") {
    document.documentElement.lang = patch.locale === "fr" ? "fr" : "en";
  }
}

export function setCanvasZoomFit(): void {
  updatePrefs({ canvasZoomMode: "fit" });
}

export function setCanvasZoomManual(zoom: number): void {
  updatePrefs({ canvasZoomMode: "manual", canvasZoom: clampZoom(zoom) });
}

export function nudgeCanvasZoom(direction: 1 | -1, fromScale?: number): void {
  const current = clampZoom(fromScale ?? prefs.value.canvasZoom ?? 1);
  updatePrefs({
    canvasZoomMode: "manual",
    canvasZoom: stepZoom(current, direction),
  });
}

/** Group currently multi-selected (or single) top-level page blocks. */
export function groupSelection(): void {
  const page = activePage.value;
  if (!page) return;
  const ids = selectedIds.value.length
    ? selectedIds.value
    : selection.value?.kind === "block"
      ? [selection.value.id]
      : [];
  if (ids.length < 1) return;
  const topLevel = page.blocks.filter((b) => ids.includes(b.id));
  if (topLevel.length < 1) return;
  const group = makeGroupFromBlocks(
    topLevel,
    topLevel.length === 1 ? `${topLevel[0].name} group` : "Group",
  );
  const remove = new Set(topLevel.map((b) => b.id));
  updateProject((draft) => {
    const pg = draft.pages.find((p) => p.id === draft.activePageId);
    if (!pg) return draft;
    pg.blocks = [...pg.blocks.filter((b) => !remove.has(b.id)), group];
    return draft;
  }, { history: true, label: "Group selection" });
  select({ kind: "block", id: group.id });
}

export function ungroupSelection(): void {
  const block = selectedBlock.value;
  if (!block || (block.type !== "group" && block.type !== "repeat")) return;
  const pieces = ungroupBlock(block);
  updateProject((draft) => {
    const pg = draft.pages.find((p) => p.id === draft.activePageId);
    if (!pg) return draft;
    pg.blocks = [
      ...pg.blocks.filter((b) => b.id !== block.id),
      ...pieces,
    ];
    return draft;
  }, { history: true, label: "Ungroup selection" });
  if (pieces[0]) select({ kind: "block", id: pieces[0].id });
  else select(null);
}

/** Persist selected group as a named custom object on the project. */
export function saveSelectionAsCustomObject(name: string): void {
  const block = selectedBlock.value;
  if (!block || (block.type !== "group" && block.type !== "repeat")) return;
  const obj = customObjectFromGroup(block, name);
  updateProject((draft) => ({
    ...draft,
    customObjects: [...(draft.customObjects ?? []), obj],
  }));
}

export function placeCustomObject(objectId: string): void {
  const obj = (project.value.customObjects ?? []).find((o) => o.id === objectId);
  if (!obj) return;
  const cascade = placeCascade.value;
  const group = expandCustomObject(obj, {
    x: 48 + (cascade % 5) * 24,
    y: 48 + (cascade % 5) * 24,
  });
  updateProject((draft) => {
    const page = draft.pages.find((p) => p.id === draft.activePageId);
    if (page) page.blocks.push(group);
    return draft;
  }, { history: true, label: "Place custom object" });
  placeCascade.value = cascade + 1;
  select({ kind: "block", id: group.id });
}

export function deleteCustomObject(objectId: string): void {
  updateProject((draft) => ({
    ...draft,
    customObjects: (draft.customObjects ?? []).filter((o) => o.id !== objectId),
  }));
}

export function saveTextStyleFromSelection(name: string): TextStylePreset | null {
  const block = selectedBlock.value;
  if (!block) return null;
  const preset = textStyleFromBlock(block, name);
  updateProject((draft) => ({
    ...draft,
    textStyles: [...(draft.textStyles ?? []), preset],
  }));
  return preset;
}

export function applyTextStyleToSelection(styleId: string): void {
  const preset = findTextStyle(project.value, styleId);
  if (!preset) return;
  const ids = selectedBlocks.value.map((b) => b.id);
  if (!ids.length) return;
  for (const id of ids) {
    updateBlock(id, { style: preset.style });
  }
}

export function deleteTextStyle(styleId: string): void {
  updateProject((draft) => ({
    ...draft,
    textStyles: (draft.textStyles ?? []).filter((s) => s.id !== styleId),
  }));
}

export function saveDocumentStyleFromCurrent(name: string): DocumentStylePreset | null {
  const page = activePage.value;
  if (!page) return null;
  const group = selectedBlock.value;
  const groupStyle =
    group && (group.type === "group" || group.type === "repeat")
      ? {
          layout: group.style.layout,
          direction: group.style.direction,
          justify: group.style.justify,
          alignItems: group.style.alignItems,
          gap: group.style.gap,
          padding: group.style.padding,
          borderRadius: group.style.borderRadius,
        }
      : undefined;
  const preset = documentStyleFromProject(
    project.value,
    page,
    name,
    groupStyle,
  );
  updateProject((draft) => ({
    ...draft,
    documentStyles: [...(draft.documentStyles ?? []), preset],
  }));
  return preset;
}

export function applyDocumentStyle(styleId: string): void {
  const page = activePage.value;
  if (!page) return;
  const preset = findDocumentStyle(project.value, styleId);
  if (!preset) return;
  const { projectPatch, pagePatch } = applyDocumentStylePreset(
    { project: project.value, page },
    preset,
  );
  if (Object.keys(projectPatch).length) {
    updateProjectMeta(projectPatch);
  }
  if (Object.keys(pagePatch).length) {
    updatePage(page.id, pagePatch);
  }
  if (preset.artboard) {
    updatePrefs({ canvasPreset: preset.artboard });
  }
}

export function deleteDocumentStyle(styleId: string): void {
  updateProject((draft) => ({
    ...draft,
    documentStyles: (draft.documentStyles ?? []).filter((s) => s.id !== styleId),
  }));
}

export function updatePageChromeBand(
  slot: PageChromeSlot,
  patch: Partial<{
    enabled: boolean;
    height: number;
    background: string | null;
  }>,
): void {
  updateProject(
    (draft) => {
      draft.pageChrome = ensurePageChrome(draft.pageChrome);
      const band = draft.pageChrome[slot]!;
      if (patch.enabled != null) band.enabled = patch.enabled;
      if (patch.height != null) band.height = Math.max(24, Math.round(patch.height));
      if (patch.background === null) delete band.background;
      else if (patch.background != null) band.background = patch.background;
      return draft;
    },
    { history: true, label: "Update page chrome" },
  );
}

export function clearPageChromeBand(slot: PageChromeSlot): void {
  updateProject(
    (draft) => {
      draft.pageChrome = ensurePageChrome(draft.pageChrome);
      draft.pageChrome[slot] = {
        enabled: false,
        height: draft.pageChrome[slot]!.height,
        blocks: [],
      };
      return draft;
    },
    { history: true, label: "Clear page chrome" },
  );
}

/** Move current selection into project header/footer chrome. */
export function promoteSelectionToChrome(slot: PageChromeSlot): void {
  const page = activePage.value;
  if (!page) return;
  const targets = selectedBlocks.value.filter((b) => {
    // Only promote page body blocks (not already chrome).
    return Boolean(findBlockDeep(page.blocks, b.id));
  });
  if (!targets.length) return;
  const size = projectPageSize(project.value);
  updateProject(
    (draft) => {
      draft.pageChrome = ensurePageChrome(draft.pageChrome);
      const band = draft.pageChrome[slot]!;
      const local = toBandLocalBlocks(
        targets,
        slot,
        size.h,
        Math.max(band.height, bandNeedsHeight(
          toBandLocalBlocks(targets, slot, size.h, band.height),
          band.height,
        )),
      );
      band.height = bandNeedsHeight(local, band.height);
      band.blocks = [...band.blocks, ...local];
      band.enabled = true;
      const ids = new Set(targets.map((t) => t.id));
      for (const pg of draft.pages) {
        for (const id of ids) {
          pg.blocks = removeBlockDeep(pg.blocks, id);
        }
      }
      return draft;
    },
    { history: true, label: `Promote to ${slot}` },
  );
}

/** Pure helpers for tests */
export function reduceInsertBlock(
  proj: Project,
  type: BlockType,
  cascade: number,
  at?: { x: number; y: number },
): { project: Project; blockId: string; cascade: number } {
  const defaults = BLOCK_DEFAULTS[type];
  const blockId = createId();
  const next = structuredClone(proj);
  const page = next.pages.find((p) => p.id === next.activePageId);
  if (!page) throw new Error("missing active page");
  page.blocks.push({
    id: blockId,
    type,
    name: defaults.name,
    x: at?.x ?? 48 + (cascade % 5) * 24,
    y: at?.y ?? 48 + (cascade % 5) * 24,
    w: defaults.w,
    h: defaults.h,
    content: { ...defaults.content },
    style: {},
  });
  return { project: next, blockId, cascade: cascade + 1 };
}
