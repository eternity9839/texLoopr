import { signal, computed, effect } from "@preact/signals";
import {
  Block,
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
  PAGE_HEIGHT,
  PAGE_WIDTH,
  Project,
  Selection,
  StudioView,
  UiOverlay,
  Watermark,
} from "../model/document";
import { createDemoProject, getDemo } from "../model/demos/library";
import { DataRow, parseDataInput, SAMPLE_CSV } from "../model/bindings";
import { normalizeRect, px } from "../model/geometry";
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
import type {
  OutputProfile,
  ProjectScript,
  WorkflowStep,
} from "../model/workflow";
import { EditHistory } from "../model/history";
import {
  isTourCompleted,
  markTourCompleted,
  TOUR_STEPS,
  type TourStepId,
} from "../model/tour";

const TEMP_KEY = "texloopr.temp.active.v1";

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
    saved?.overlay === "samples"
  ) {
    return saved.overlay;
  }
  if (saved?.mode === "settings") return "settings";
  if (saved?.mode === "about") return "about";
  return null;
}

function loadSnapshot(): Partial<AppStateSnapshot> | null {
  try {
    const raw =
      localStorage.getItem(TEMP_KEY) ??
      localStorage.getItem("texloopr.draft.v1");
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AppStateSnapshot>;
  } catch {
    return null;
  }
}

const saved = typeof localStorage !== "undefined" ? loadSnapshot() : null;

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
export const prefs = signal<EditorPrefs>(
  saved?.prefs ?? {
    showGrid: true,
    snap: true,
    density: "comfortable",
    theme: "stone",
    showRulers: true,
    showComments: true,
    navWidth: 240,
    toolsWidth: 96,
    inspectorWidth: 280,
    navCollapsed: false,
    toolsCollapsed: false,
    inspectorCollapsed: false,
    toolsOrientation: "horizontal",
    propsHeight: 240,
    propsCollapsed: false,
    gridSize: 16,
    gridLock: false,
    gridStyle: "lines",
    showMarginGuides: true,
  },
);
export const activeTool = signal<BlockType | null>(null);
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
  activeTool.value = null;
}

export function closePrebuildPicker(): void {
  prebuildPickerOpen.value = false;
}
export const catalogReady = signal(false);
export const catalogBackend = signal<"tauri" | "web" | null>(null);

const editHistory = new EditHistory();
export const historyEpoch = signal(0);
export const clipboardBlock = signal<Block | null>(null);
export const inspectorTab = signal<"props" | "comments" | "meta">(
  "props",
);
export const tourActive = signal(false);
export const tourStepIndex = signal(0);
export const tourStepId = computed(
  () => TOUR_STEPS[tourStepIndex.value]?.id ?? ("welcome" as TourStepId),
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
  return null;
});

/** Multi-select for grouping (Shift+click). Primary focus stays in `selection`. */
export const selectedIds = signal<string[]>([]);

export const selectedBlocks = computed(() => {
  const page = activePage.value;
  if (!page) return [];
  const ids = selectedIds.value.length
    ? selectedIds.value
    : selection.value?.kind === "block"
      ? [selection.value.id]
      : [];
  return ids
    .map((id) => findBlockDeep(page.blocks, id))
    .filter((b): b is Block => Boolean(b));
});

export const previewRow = computed(() => {
  const rows = dataRows.value;
  if (!rows.length) return undefined;
  const idx = Math.min(previewRowIndex.value, rows.length - 1);
  return rows[idx];
});

if (typeof localStorage !== "undefined") {
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
    };
    localStorage.setItem(TEMP_KEY, JSON.stringify(snapshot));
  });
}

function updateProject(
  mutator: (draft: Project) => Project,
  options: { history?: boolean } = {},
): void {
  if (options.history) {
    editHistory.push(project.value);
    historyEpoch.value += 1;
  }
  project.value = mutator(structuredClone(project.value));
}

export function pushHistoryCheckpoint(): void {
  editHistory.push(project.value);
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

export function setStudioView(next: StudioView): void {
  studioView.value = next;
  overlay.value = null;
  if (next === "data") {
    previewMode.value = false;
  }
}

export function setPreviewMode(on: boolean): void {
  previewMode.value = on;
  if (on) {
    studioView.value = "edit";
    activeTool.value = null;
  }
}

export function togglePreviewMode(): void {
  setPreviewMode(!previewMode.value);
}

export function setOverlay(next: UiOverlay): void {
  overlay.value = next;
}

export function select(next: Selection): void {
  selection.value = next;
  if (next?.kind === "block") {
    selectedIds.value = [next.id];
  } else {
    selectedIds.value = [];
  }
}

/** Shift+click: toggle id in multi-selection. */
export function selectBlockToggle(id: string): void {
  const set = new Set(selectedIds.value);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  selectedIds.value = [...set];
  selection.value = set.size
    ? { kind: "block", id: [...set][set.size - 1]! }
    : null;
}

export function setActiveTool(tool: BlockType | null): void {
  activeTool.value = tool;
}

export function createProject(): void {
  editHistory.clear();
  historyEpoch.value += 1;
  project.value = createEmptyProject();
  catalogProjectId.value = null;
  selection.value = { kind: "page", id: project.value.activePageId };
  placeCascade.value = 0;
  studioView.value = "edit";
  previewMode.value = false;
}

export function loadDemoProject(): void {
  loadDemoSample("welcome");
}

export function loadDemoSample(id: string): void {
  const entry = getDemo(id) ?? getDemo("welcome");
  if (!entry) return;
  editHistory.clear();
  historyEpoch.value += 1;
  project.value = ensureProjectAutomation(entry.build());
  catalogProjectId.value = null;
  selection.value = null;
  placeCascade.value = 0;
  studioView.value = "edit";
  previewMode.value = false;
  setOverlay(null);
  try {
    dataRows.value = parseDataInput(entry.sampleCsv);
    previewRowIndex.value = 0;
  } catch {
    dataRows.value = parseDataInput(SAMPLE_CSV);
    previewRowIndex.value = 0;
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
      | "version"
      | "category"
      | "tags"
      | "createdAt"
      | "company"
      | "contactEmail"
      | "customMeta"
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

export function activeOutputProfile(): OutputProfile | undefined {
  const p = ensureProjectAutomation(project.value);
  return p.outputs?.find((o) => o.id === p.activeOutputId) ?? p.outputs?.[0];
}

export function stampSaved(): void {
  updateProject((draft) => ({
    ...draft,
    lastSaved: new Date().toISOString(),
  }));
  void persistActiveToCatalog();
}

export async function persistActiveToCatalog(): Promise<void> {
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
    },
  });
  catalogProjectId.value = record.summary.id;
}

export async function hydrateFromCatalog(): Promise<void> {
  const { getCatalog } = await import("../storage/catalog");
  const catalog = await getCatalog();
  catalogBackend.value = catalog.backend;
  const active = await catalog.getActiveProject();
  if (active && active.document && typeof active.document === "object") {
    catalogProjectId.value = active.summary.id;
    project.value = ensureProjectAutomation(active.document as Project);
  }
  catalogReady.value = true;
}

export async function openCatalogProject(id: string): Promise<void> {
  const { getCatalog } = await import("../storage/catalog");
  const catalog = await getCatalog();
  const record = await catalog.setActiveProject(id);
  catalogProjectId.value = record.summary.id;
  if (record.document && typeof record.document === "object") {
    project.value = ensureProjectAutomation(record.document as Project);
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
      name: name ?? `Page ${draft.pages.length + 1}`,
      blocks: [],
    };
    draft.pages.push(page);
    draft.activePageId = id;
    return draft;
  });
  selection.value = { kind: "page", id };
}

export function updatePage(
  pageId: string,
  patch: Partial<Pick<Page, "name" | "background">> & {
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
  }, { history: true });
}

export function insertBlock(
  type: BlockType,
  at?: { x: number; y: number },
): string {
  const cascade = placeCascade.value;
  const x = px(at?.x ?? 48 + (cascade % 5) * 24);
  const y = px(at?.y ?? 48 + (cascade % 5) * 24);

  if (type === "prebuild") {
    const pieces = expandPrebuild(activePrebuildId.value, { x, y });
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
    }, { history: true });
    placeCascade.value = cascade + pieces.length;
    if (lastId) selection.value = { kind: "block", id: lastId };
    activeTool.value = null;
    return lastId;
  }

  const defaults = BLOCK_DEFAULTS[type];
  const id = createId();
  const content =
    type === "repeat"
      ? {
          itemsPath: "line_items",
          itemVar: "item",
          blocks: defaultRepeatChildren(),
        }
      : type === "group"
        ? { blocks: [] }
        : { ...defaults.content };

  const block: Block = {
    id,
    type,
    name: defaults.name,
    x,
    y,
    w: px(defaults.w),
    h: px(type === "repeat" || type === "group" ? defaults.h : defaults.h),
    content,
    style: { fontSize: 14, color: "#2a2622", textAlign: "left" },
    zIndex: cascade + 1,
  };
  updateProject((draft) => {
    const page = draft.pages.find((p) => p.id === draft.activePageId);
    if (page) page.blocks.push(block);
    return draft;
  }, { history: true });
  placeCascade.value = cascade + 1;
  selection.value = { kind: "block", id };
  activeTool.value = null;
  return id;
}

/** Compute the origin for a placed insert according to the chosen placement */
function originForPlacement(
  placement: InsertPlacement,
  wPx: number,
  hPx: number,
): { x: number; y: number } {
  if (placement === "center") {
    return {
      x: Math.round((PAGE_WIDTH - wPx) / 2),
      y: Math.round((PAGE_HEIGHT - hPx) / 2),
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
    // Never insert blindly — let the user pick a recipe first.
    openPrebuildPicker();
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
  }, { history: true });
  placeCascade.value = cascade + pieces.length;
  activePrebuildId.value = recipeId;
  if (lastId) selection.value = { kind: "block", id: lastId };
  closePrebuildPicker();
}

export function updateBlock(
  blockId: string,
  patch: Partial<
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
    >
  >,
  options: { history?: boolean } = {},
): void {
  updateProject((draft) => {
    for (const page of draft.pages) {
      page.blocks = updateBlockDeep(page.blocks, blockId, (block) => {
        const next = { ...block };
        const moving =
          patch.x != null || patch.y != null || patch.w != null || patch.h != null;
        if (patch.content) next.content = { ...next.content, ...patch.content };
        if (patch.style) next.style = { ...next.style, ...patch.style };
        if (patch.bindings)
          next.bindings = { ...next.bindings, ...patch.bindings };
        const { content: _c, style: _s, bindings: _b, ...rest } = patch;
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
      });
    }
    return draft;
  }, options);
}

export function deleteSelection(): void {
  const sel = selection.value;
  if (!sel) return;
  if (sel.kind === "block") {
    const ids = new Set(
      selectedIds.value.length ? selectedIds.value : [sel.id],
    );
    updateProject((draft) => {
      for (const page of draft.pages) {
        for (const id of ids) {
          page.blocks = removeBlockDeep(page.blocks, id);
        }
      }
      draft.comments = (draft.comments ?? []).filter(
        (c) => !ids.has(c.blockId),
      );
      return draft;
    }, { history: true });
    selection.value = null;
    selectedIds.value = [];
    return;
  }
  updateProject((draft) => {
    if (draft.pages.length <= 1) return draft;
    draft.pages = draft.pages.filter((p) => p.id !== sel.id);
    if (draft.activePageId === sel.id) {
      draft.activePageId = draft.pages[0].id;
    }
    return draft;
  }, { history: true });
  selection.value = { kind: "page", id: project.value.activePageId };
}

export function nudgeSelection(dx: number, dy: number): void {
  const sel = selection.value;
  if (!sel || sel.kind !== "block") return;
  const ids = selectedIds.value.length ? selectedIds.value : [sel.id];
  const page = activePage.value;
  const targets = (page?.blocks ?? []).filter(
    (b) => ids.includes(b.id) && !b.locked,
  );
  if (!targets.length) return;
  updateProject((draft) => {
    const draftPage = draft.pages.find((p) => p.id === draft.activePageId);
    if (!draftPage) return draft;
    for (const b of draftPage.blocks) {
      if (!ids.includes(b.id) || b.locked) continue;
      b.x += dx;
      b.y += dy;
    }
    return draft;
  }, { history: true });
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
    }, { history: true });
    return;
  }

  // Single selection: align to the page
  const block = selectedBlock.value;
  if (!block || block.locked) return;
  let patch: Partial<Pick<Block, "x" | "y">> = {};
  switch (mode) {
    case "left":
      patch = { x: 0 };
      break;
    case "center-x":
      patch = { x: Math.round((PAGE_WIDTH - block.w) / 2) };
      break;
    case "right":
      patch = { x: Math.max(0, PAGE_WIDTH - block.w) };
      break;
    case "top":
      patch = { y: 0 };
      break;
    case "middle":
      patch = { y: Math.round((PAGE_HEIGHT - block.h) / 2) };
      break;
    case "bottom":
      patch = { y: Math.max(0, PAGE_HEIGHT - block.h) };
      break;
  }
  updateBlock(block.id, patch, { history: true });
}

export function nudgeZOrder(direction: "front" | "forward" | "backward" | "back"): void {
  const block = selectedBlock.value;
  const page = activePage.value;
  if (!block || !page) return;
  const zs = page.blocks.map((b) => b.zIndex ?? 0);
  const max = Math.max(0, ...zs);
  const min = Math.min(0, ...zs);
  let next = block.zIndex ?? 0;
  if (direction === "front") next = max + 1;
  else if (direction === "back") next = min - 1;
  else if (direction === "forward") next += 1;
  else next -= 1;
  updateBlock(block.id, { zIndex: next }, { history: true });
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
  }, { history: true });
  selection.value = { kind: "block", id };
}

export function copySelected(): void {
  const block = selectedBlock.value;
  if (!block) return;
  clipboardBlock.value = structuredClone(block);
}

export function cutSelected(): void {
  copySelected();
  deleteSelection();
}

export function pasteClipboard(): void {
  const src = clipboardBlock.value;
  if (!src) return;
  const id = createId();
  const copy: Block = {
    ...structuredClone(src),
    id,
    x: src.x + 24,
    y: src.y + 24,
    zIndex: (src.zIndex ?? 0) + 1,
    locked: false,
  };
  updateProject((draft) => {
    const page = draft.pages.find((p) => p.id === draft.activePageId);
    if (page) page.blocks.push(copy);
    return draft;
  }, { history: true });
  selection.value = { kind: "block", id };
}

export function toggleLockSelected(): void {
  const block = selectedBlock.value;
  if (!block) return;
  updateBlock(block.id, { locked: !block.locked }, { history: true });
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
  }, { history: true });
  inspectorTab.value = "comments";
}

export function resolveComment(id: string, resolved = true): void {
  updateProject((draft) => {
    const c = (draft.comments ?? []).find((x) => x.id === id);
    if (c) c.resolved = resolved;
    return draft;
  }, { history: true });
}

export function deleteComment(id: string): void {
  updateProject((draft) => {
    draft.comments = (draft.comments ?? []).filter((c) => c.id !== id);
    return draft;
  }, { history: true });
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
  if (next >= TOUR_STEPS.length) {
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
  const step = TOUR_STEPS[index];
  if (!step) return;
  if (step.view) setStudioView(step.view);
  if (typeof step.preview === "boolean") setPreviewMode(step.preview);
  if (step.overlay === "automation") setOverlay("automation");
  else if (step.overlay === null) setOverlay(null);
  if (step.id === "comments") inspectorTab.value = "comments";
  if (step.id === "inspector") inspectorTab.value = "props";
}

export function maybeAutoStartTour(): void {
  if (!isTourCompleted()) startTour();
}

export async function setDataFromText(raw: string): Promise<void> {
  const { parseDataInputBackend } = await import("../model/backend");
  dataRows.value = await parseDataInputBackend(raw);
  previewRowIndex.value = 0;
}

export function setPreviewRowIndex(index: number): void {
  previewRowIndex.value = Math.max(0, index);
}

export function updatePrefs(patch: Partial<EditorPrefs>): void {
  prefs.value = { ...prefs.value, ...patch };
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
  }, { history: true });
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
  }, { history: true });
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
  }, { history: true });
  placeCascade.value = cascade + 1;
  select({ kind: "block", id: group.id });
}

export function deleteCustomObject(objectId: string): void {
  updateProject((draft) => ({
    ...draft,
    customObjects: (draft.customObjects ?? []).filter((o) => o.id !== objectId),
  }));
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
