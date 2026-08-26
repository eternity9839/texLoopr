import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  AppContextMenu,
  type ContextMenuEntry,
} from "../../ui/AppContextMenu";
import {
  activePage,
  activeTool,
  commitPlaceAt,
  insertBlock,
  select,
  selectBlockToggle,
  selectBlocks,
  selection,
  selectedBlock,
  selectedIds,
  updateBlock,
  deleteSelection,
  previewRow,
  prefs,
  activeOutputProfile,
  pushHistoryCheckpoint,
  project,
  copySelected,
  cutSelected,
  pasteClipboard,
  duplicateSelected,
  groupSelection,
  ungroupSelection,
  undoEdit,
  redoEdit,
  clipboardBlocks,
  toggleLockSelected,
  nudgeZOrder,
  addComment,
  inspectorTab,
  updatePrefs,
  dataRows,
  setActivePage,
  nudgeCanvasZoom,
  canvasViewScale,
  updatePage,
  focusDataFieldFromBindingPath,
} from "../../state/store";
import {
  beginIssuePass,
  endIssuePass,
} from "../../state/issueLog";
import { rectsIntersect } from "../../model/geometry";
import { PageWatermark } from "./PageWatermark";
import { EditorRulers } from "./EditorRulers";
import { canvasSizeForSession, gridSpacing } from "../../model/canvasView";
import type { Page } from "../../model/document";
import { isRulerUnit } from "../../model/rulerUnits";
import { enrichPreviewContext } from "../../model/runtime";
import { effectiveZ } from "../../model/layerStack";
import { findBlockDeep, flattenBlocksForPreview } from "../../model/groups";
import { dataColumnNames } from "../../model/bindings";
import { evaluateCondition, isOutputFormatCondition } from "../../model/bindings";
import { renderBlock } from "./blocks";
import type { RuntimeContext } from "../../model/expr";
import type { BlockType } from "../../model/document";
import {
  cssTransformFromStyle,
  normalizeMargins,
} from "../../model/document";
import { BLOCK_TYPE_ICON } from "../../ui/icons";
import { BLOCK_TOOLS } from "./Toolbox";
import { t } from "../../i18n";
import {
  formatZoomPercent,
  resolveCanvasScale,
  type CanvasZoomMode,
} from "./canvasScale";

interface EditorCanvasProps {
  preview?: boolean;
}

type CanvasMenu = {
  x: number;
  y: number;
  scope: "block" | "page" | "mergeChip";
  placeAt?: { x: number; y: number };
  mergePath?: string;
  blockId?: string;
};

function pageCoordsFromEvent(
  pageEl: Element,
  e: MouseEvent,
  step: number | null,
  scale: number,
): { x: number; y: number } {
  const rect = pageEl.getBoundingClientRect();
  const k = scale || 1;
  let x = Math.max(0, (e.clientX - rect.left) / k);
  let y = Math.max(0, (e.clientY - rect.top) / k);
  if (step != null && step > 1) {
    x = Math.round(x / step) * step;
    y = Math.round(y / step) * step;
  }
  return { x, y };
}

export function EditorCanvas({ preview = false }: EditorCanvasProps) {
  beginIssuePass();
  useLayoutEffect(() => {
    endIssuePass();
  });

  const page = activePage.value;
  const sel = selection.value;
  const tool = activeTool.value;
  const row = previewRow.value;
  const showGrid = prefs.value.showGrid;
  const showRulers = prefs.value.showRulers !== false;
  const showComments = prefs.value.showComments !== false;
  const output = activeOutputProfile();
  const comments = project.value.comments ?? [];
  const spacing = gridSpacing(prefs.value);
  const canvasSize = canvasSizeForSession(project.value, prefs.value);
  const pageW = canvasSize.w;
  const pageH = canvasSize.h;
  const viewMode = prefs.value.pageViewMode ?? "single";
  const boardRotate = prefs.value.canvasRotate ?? 0;
  const zoomMode = (prefs.value.canvasZoomMode ?? "fit") as CanvasZoomMode;
  const zoomPref = prefs.value.canvasZoom ?? 1;
  const gridLock = prefs.value.gridLock === true;
  const snapStep: number | null = prefs.value.snap
    ? gridLock
      ? Math.min(spacing.x, spacing.y)
      : 8
    : null;
  const [menu, setMenu] = useState<CanvasMenu | null>(null);
  /** Start positions of every selected block at drag begin (multi-drag) */
  const dragOrigins = useRef<Map<string, { x: number; y: number }>>(new Map());
  const marqueeRef = useRef<{
    pointerId: number;
    pageEl: HTMLElement;
    x0: number;
    y0: number;
    additive: boolean;
    active: boolean;
  } | null>(null);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Uniform fit / manual zoom for the active artboard size.
  const fitAreaRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const board = boardRef.current;
    const el = fitAreaRef.current;
    if (!board && !el) return;
    let raf = 0;
    const update = () => {
      const box = board ?? el;
      if (!box) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w > 1 && h > 1) {
        const next = resolveCanvasScale({
          mode: zoomMode,
          zoom: zoomPref,
          availW: Math.max(40, w - 48),
          availH: Math.max(40, h - 48),
          pageW,
          pageH,
        });
        setScale(next);
        canvasViewScale.value = next;
      }
    };
    update();
    raf = requestAnimationFrame(() => {
      update();
      raf = requestAnimationFrame(update);
    });
    const t = window.setTimeout(update, 300);
    const ro = new ResizeObserver(update);
    if (board) ro.observe(board);
    else if (el) ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [pageW, pageH, viewMode, zoomMode, zoomPref]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board || preview) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const direction: 1 | -1 = e.deltaY < 0 ? 1 : -1;
      nudgeCanvasZoom(direction, scale);
    };
    board.addEventListener("wheel", onWheel, { passive: false });
    return () => board.removeEventListener("wheel", onWheel);
  }, [preview, scale]);

  const closeMenu = useCallback(() => setMenu(null), []);

  const openBlockMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, scope: "block" });
  }, []);

  const openMergeChipMenu = useCallback(
    (blockId: string, mergePath: string, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      select({ kind: "block", id: blockId });
      setMenu({
        x: e.clientX,
        y: e.clientY,
        scope: "mergeChip",
        mergePath,
        blockId,
      });
    },
    [],
  );

  const openPageMenu = useCallback((e: MouseEvent, pageEl: Element) => {
    e.preventDefault();
    e.stopPropagation();
    const placeAt = pageCoordsFromEvent(pageEl, e, snapStep, scale);
    setMenu({
      x: e.clientX,
      y: e.clientY,
      scope: "page",
      placeAt,
    });
  }, [snapStep, scale]);

  const runtime: RuntimeContext | undefined = useMemo(() => {
    if (!output) return undefined;
    return enrichPreviewContext(project.value, row, output);
  }, [output, row, project.value]);

  const { renderBlocks, itemContexts } = useMemo(() => {
    const source = page?.blocks ?? [];
    if (!runtime) {
      return {
        renderBlocks: source,
        itemContexts: new Map<string, RuntimeContext>(),
      };
    }
    const formatFiltered = source.filter((b) => {
      if (!b.condition) return true;
      // Edit: only apply pure output.kind gates so SMS/mobile cards stay off-canvas.
      if (!preview && !isOutputFormatCondition(b.condition)) return true;
      return evaluateCondition(b.condition, row, runtime, {
        diagnose: preview,
      });
    });
    if (!preview) {
      return {
        renderBlocks: formatFiltered,
        itemContexts: new Map<string, RuntimeContext>(),
      };
    }
    const flat = flattenBlocksForPreview(formatFiltered, row, runtime);
    return { renderBlocks: flat.blocks, itemContexts: flat.itemContexts };
  }, [page?.blocks, preview, runtime, row]);

  useEffect(() => {
    if (preview) return;
    const onMove = (e: PointerEvent) => {
      const m = marqueeRef.current;
      if (!m || e.pointerId !== m.pointerId) return;
      const at = pageCoordsFromEvent(m.pageEl, e, snapStep, scale);
      const dx = Math.abs(at.x - m.x0);
      const dy = Math.abs(at.y - m.y0);
      if (!m.active && (dx > 3 || dy > 3)) {
        m.active = true;
      }
      if (!m.active) return;
      const x = Math.min(m.x0, at.x);
      const y = Math.min(m.y0, at.y);
      setMarquee({
        x,
        y,
        w: Math.abs(at.x - m.x0),
        h: Math.abs(at.y - m.y0),
      });
    };
    const onUp = (e: PointerEvent) => {
      const m = marqueeRef.current;
      if (!m || e.pointerId !== m.pointerId) return;
      marqueeRef.current = null;
      setMarquee(null);
      try {
        m.pageEl.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (m.active) {
        const at = pageCoordsFromEvent(m.pageEl, e, snapStep, scale);
        const box = {
          x: Math.min(m.x0, at.x),
          y: Math.min(m.y0, at.y),
          w: Math.abs(at.x - m.x0),
          h: Math.abs(at.y - m.y0),
        };
        const hits = (activePage.value?.blocks ?? [])
          .filter((b) => !b.locked && rectsIntersect(box, b))
          .map((b) => b.id);
        if (m.additive) {
          selectBlocks([...new Set([...selectedIds.value, ...hits])]);
        } else {
          selectBlocks(hits);
        }
        return;
      }
      select(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [preview, scale, snapStep]);

  const block = selectedBlock.value;
  const hasBlock = Boolean(block);
  const hasClip = clipboardBlocks.value.length > 0;
  const columns = dataColumnNames(dataRows.value);
  const placeAt = menu?.placeAt;

  const createItems: ContextMenuEntry[] = BLOCK_TOOLS.map((t) => ({
    id: `add-${t.type}`,
    label: t.label,
    icon: BLOCK_TYPE_ICON[t.type as BlockType],
    action: () => insertBlock(t.type, placeAt),
  }));

  const menuItems: ContextMenuEntry[] = (() => {
    if (!menu) return [];
    if (menu.scope === "mergeChip" && menu.mergePath) {
      return [
        {
          id: "open-in-data",
          label: t("openInData"),
          icon: "database",
          action: () => focusDataFieldFromBindingPath(menu.mergePath!),
        },
      ];
    }
    if (menu.scope === "page") {
      return [
        ...createItems,
        { id: "s-create", type: "sep" },
        {
          id: "paste",
          label: "Paste",
          icon: "paste",
          shortcut: "Ctrl+V",
          disabled: !hasClip,
          action: pasteClipboard,
        },
        { id: "s0", type: "sep" },
        {
          id: "undo",
          label: "Undo",
          icon: "undo",
          shortcut: "Ctrl+Z",
          action: undoEdit,
        },
        {
          id: "redo",
          label: "Redo",
          icon: "redo",
          shortcut: "Ctrl+Shift+Z",
          action: redoEdit,
        },
        { id: "s1", type: "sep" },
        {
          id: "grid",
          label: prefs.value.showGrid ? "Hide grid" : "Show grid",
          icon: "grid",
          action: () => updatePrefs({ showGrid: !prefs.value.showGrid }),
        },
        {
          id: "snap",
          label: prefs.value.snap ? "Disable snap" : "Enable snap",
          icon: "crosshair",
          action: () => updatePrefs({ snap: !prefs.value.snap }),
        },
        {
          id: "magnet",
          label: gridLock ? "Unlock from grid" : "Lock to grid",
          icon: "magnet",
          action: () => updatePrefs({ gridLock: !gridLock }),
        },
        {
          id: "guides",
          label:
            prefs.value.showMarginGuides === false
              ? "Show margin guides"
              : "Hide margin guides",
          icon: "ruler",
          action: () =>
            updatePrefs({
              showMarginGuides: prefs.value.showMarginGuides === false,
            }),
        },
        { id: "s-view", type: "sep" },
        {
          id: "view-single",
          label: "View · one page",
          icon: "layout",
          action: () => updatePrefs({ pageViewMode: "single" }),
        },
        {
          id: "view-cont",
          label: "View · continuous",
          icon: "rows",
          action: () => updatePrefs({ pageViewMode: "continuous" }),
        },
        {
          id: "view-spread",
          label: "View · two-up",
          icon: "columns",
          action: () => updatePrefs({ pageViewMode: "spread" }),
        },
        {
          id: "canvas-mobile",
          label: "Artboard · mobile",
          icon: "focus",
          action: () => updatePrefs({ canvasPreset: "mobile" }),
        },
        {
          id: "canvas-doc",
          label: "Artboard · document",
          icon: "file",
          action: () => updatePrefs({ canvasPreset: "document" }),
        },
        {
          id: "props-page",
          label: "Surface setup",
          icon: "sliders",
          action: () => {
            select(null);
            inspectorTab.value = "design";
            updatePrefs({ inspectorCollapsed: false });
          },
        },
      ];
    }

    const fieldItems: ContextMenuEntry[] =
      hasBlock && columns.length > 0
        ? [
            { id: "s-fields", type: "sep" },
            ...columns.slice(0, 8).map((col) => ({
              id: `field-${col}`,
              label: `Insert {{${col}}}`,
              action: () => {
                if (!block) return;
                const text = String(block.content.text ?? "");
                updateBlock(block.id, {
                  content: { text: `${text}{{${col}}}` },
                });
              },
            })),
          ]
        : [];

    const dataJumpItem: ContextMenuEntry[] =
      block?.type === "data"
        ? [
            {
              id: "open-in-data",
              label: t("openInData"),
              icon: "database",
              action: () =>
                focusDataFieldFromBindingPath(String(block.content.path ?? "")),
            },
          ]
        : [];

    return [
      {
        id: "cut",
        label: "Cut",
        icon: "cut",
        shortcut: "Ctrl+X",
        disabled: !hasBlock,
        action: cutSelected,
      },
      {
        id: "copy",
        label: "Copy",
        icon: "copy",
        shortcut: "Ctrl+C",
        disabled: !hasBlock,
        action: copySelected,
      },
      {
        id: "paste",
        label: "Paste",
        icon: "paste",
        shortcut: "Ctrl+V",
        disabled: !hasClip,
        action: pasteClipboard,
      },
      {
        id: "dup",
        label: "Duplicate",
        icon: "duplicate",
        shortcut: "Ctrl+D",
        disabled: !hasBlock,
        action: duplicateSelected,
      },
      {
        id: "group",
        label: "Group",
        icon: "group",
        shortcut: "Ctrl+G",
        disabled: !hasBlock,
        action: groupSelection,
      },
      {
        id: "ungroup",
        label: "Ungroup",
        icon: "ungroup",
        disabled: !(block?.type === "group" || block?.type === "repeat"),
        action: ungroupSelection,
      },
      { id: "s0", type: "sep" },
      {
        id: "front",
        label: "Bring to front",
        icon: "bringToFront",
        disabled: !hasBlock,
        action: () => nudgeZOrder("front"),
      },
      {
        id: "back",
        label: "Send to back",
        icon: "sendToBack",
        disabled: !hasBlock,
        action: () => nudgeZOrder("back"),
      },
      {
        id: "lock",
        label: block?.locked ? "Unlock" : "Lock",
        icon: block?.locked ? "unlock" : "lock",
        disabled: !hasBlock,
        action: toggleLockSelected,
      },
      ...fieldItems,
      ...dataJumpItem,
      { id: "s1", type: "sep" },
      {
        id: "comment",
        label: "Add comment…",
        icon: "comment",
        disabled: !hasBlock,
        action: () => {
          const body = window.prompt("Comment text");
          if (body) addComment(body);
        },
      },
      {
        id: "props",
        label: "Properties",
        icon: "sliders",
        disabled: !hasBlock,
        action: () => {
          inspectorTab.value = "design";
          updatePrefs({ inspectorCollapsed: false });
        },
      },
      { id: "s2", type: "sep" },
      {
        id: "del",
        label: "Delete",
        shortcut: "Del",
        disabled: !hasBlock,
        danger: true,
        action: deleteSelection,
      },
    ];
  })();

  const onBoardClick = (e: MouseEvent) => {
    if (preview) return;
    if ((e.target as HTMLElement).closest(".block-frame")) return;
    if (e.ctrlKey || e.metaKey) {
      const pageEl = (e.currentTarget as HTMLElement).querySelector(
        ".editor-page",
      );
      if (pageEl) {
        openPageMenu(e, pageEl);
        return;
      }
    }
    closeMenu();
    const pageEl = (e.currentTarget as HTMLElement).querySelector(
      ".editor-page",
    );
    if (!pageEl) return;
    const at = pageCoordsFromEvent(pageEl, e, snapStep, scale);
    if (tool) {
      commitPlaceAt({
        x: Math.max(0, at.x),
        y: Math.max(0, at.y),
      });
      return;
    }
    select(null);
  };

  const boardClass = [
    "editor-board",
    tool && !preview ? "editor-board--placing" : "",
    showRulers && !preview ? "editor-board--rulers" : "",
    `editor-board--view-${viewMode}`,
  ]
    .filter(Boolean)
    .join(" ");

  const scrollClass = [
    "editor-board__scroll",
    showGrid ? "editor-board--grid" : "",
    showGrid && prefs.value.gridStyle === "dots"
      ? "editor-board--grid-dots"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sorted = [...renderBlocks].sort(
    (a, b) => effectiveZ(a) - effectiveZ(b) || a.id.localeCompare(b.id),
  );

  const allPages = project.value.pages;
  const visiblePages = allPages.filter((p) => {
    if (!p.condition?.trim()) return true;
    if (!runtime) return true;
    // Edit: only apply pure output.kind gates; language/data conditions apply in preview.
    if (!preview && !isOutputFormatCondition(p.condition)) return true;
    return evaluateCondition(p.condition, row, runtime, {
      diagnose: preview,
    });
  });
  const activeVisibleIdx = Math.max(
    0,
    visiblePages.findIndex((p) => p.id === page?.id),
  );
  const pagesToShow: Page[] =
    viewMode === "continuous"
      ? visiblePages
      : viewMode === "spread"
        ? visiblePages.slice(activeVisibleIdx, activeVisibleIdx + 2)
        : page && (!preview || visiblePages.some((p) => p.id === page.id))
          ? [page]
          : visiblePages.slice(0, 1);

  const sheetGap = 28;
  const sheetsWide = viewMode === "spread" ? Math.min(2, pagesToShow.length) : 1;
  const sheetsTall =
    viewMode === "continuous" ? pagesToShow.length : 1;
  const sheetW = pageW * scale;
  const sheetH = pageH * scale;
  const fitW =
    sheetW * sheetsWide +
    (sheetsWide > 1 ? sheetGap * (sheetsWide - 1) * scale : 0);
  const fitH =
    sheetH * sheetsTall +
    (sheetsTall > 1 ? sheetGap * (sheetsTall - 1) * scale : 0);

  const boardStyle = {
    "--board-grid-x": `${spacing.x}px`,
    "--board-grid-y": `${spacing.y}px`,
    "--board-grid-size": `${spacing.x}px`,
    "--board-grid-color": prefs.value.gridColor ?? "#c8c2b6",
    "--page-width": `${pageW}px`,
    "--page-height": `${pageH}px`,
  } as Record<string, string>;

  const filterSheetBlocks = (sheet: Page, isActive: boolean) => {
    if (isActive) {
      return {
        blocks: sorted,
        contexts: itemContexts,
      };
    }
    const source = sheet.blocks;
    if (!runtime) {
      return {
        blocks: [...source].sort(
          (a, b) => effectiveZ(a) - effectiveZ(b) || a.id.localeCompare(b.id),
        ),
        contexts: new Map<string, RuntimeContext>(),
      };
    }
    const formatFiltered = source.filter((b) => {
      if (!b.condition) return true;
      if (!preview && !isOutputFormatCondition(b.condition)) return true;
      return evaluateCondition(b.condition, row, runtime, {
        diagnose: preview,
      });
    });
    if (!preview) {
      return {
        blocks: [...formatFiltered].sort(
          (a, b) => effectiveZ(a) - effectiveZ(b) || a.id.localeCompare(b.id),
        ),
        contexts: new Map<string, RuntimeContext>(),
      };
    }
    const flat = flattenBlocksForPreview(formatFiltered, row, runtime);
    return { blocks: flat.blocks, contexts: flat.itemContexts };
  };

  const renderPageSheet = (sheet: Page, interactive: boolean) => {
    const isActive = sheet.id === page?.id;
    const { blocks: sheetBlocks, contexts: sheetContexts } = filterSheetBlocks(
      sheet,
      isActive,
    );
    const m = normalizeMargins(sheet.margins);
    return (
      <div
        key={sheet.id}
        class="editor-sheet"
        style={{
          flexShrink: 0,
          width: `${pageW * scale}px`,
          height: `${pageH * scale}px`,
        }}
      >
      <div
        class={[
          preview
            ? "editor-page editor-page--preview"
            : "editor-page",
          tool && interactive && !preview ? "editor-page--placing" : "",
          !tool && interactive && !preview ? "editor-page--select" : "",
          isActive ? "editor-page--active" : "editor-page--idle",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          width: `${pageW}px`,
          height: `${pageH}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        onPointerDown={(e) => {
          if (preview || !interactive || !isActive || tool) return;
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest(".block-frame")) return;
          closeMenu();
          const pageEl = e.currentTarget as HTMLElement;
          const at = pageCoordsFromEvent(pageEl, e, snapStep, scale);
          marqueeRef.current = {
            pointerId: e.pointerId,
            pageEl,
            x0: at.x,
            y0: at.y,
            additive: e.shiftKey,
            active: false,
          };
          pageEl.setPointerCapture(e.pointerId);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (preview) return;
          if (!isActive) {
            setActivePage(sheet.id);
            return;
          }
          closeMenu();
          if ((e.target as HTMLElement).closest(".block-frame") && !tool) {
            return;
          }
          if (e.ctrlKey || e.metaKey) {
            openPageMenu(e, e.currentTarget as HTMLElement);
            return;
          }
          if (tool) {
            const at = pageCoordsFromEvent(
              e.currentTarget as Element,
              e,
              snapStep,
              scale,
            );
            commitPlaceAt({
              x: Math.max(0, at.x),
              y: Math.max(0, at.y),
            });
            return;
          }
          select(null);
        }}
        onContextMenu={(e) => {
          if (preview) return;
          e.preventDefault();
          e.stopPropagation();
          if ((e.target as HTMLElement).closest(".block-frame")) return;
          if (!isActive) setActivePage(sheet.id);
          select(null);
          openPageMenu(e, e.currentTarget as HTMLElement);
        }}
      >
        <div
          class="editor-page__surface"
          style={{
            transform: cssTransformFromStyle({
              rotate: sheet.rotate,
              mirrorX: sheet.mirrorX,
              mirrorY: sheet.mirrorY,
            }) || undefined,
            transformOrigin: "center center",
          }}
        >
          <div
            class="page-bg"
            aria-hidden="true"
            style={{ background: sheet.background ?? "#ffffff" }}
          />
          {sheet.watermark && (sheet.watermark.layer ?? "behind") !== "front" ? (
            <PageWatermark
              watermark={sheet.watermark}
              pageW={pageW}
              pageH={pageH}
            />
          ) : null}
          {!preview && prefs.value.showMarginGuides !== false ? (
            <>
              <div
                class="page-margin-guide page-margin-guide--top"
                style={{ height: `${m.top}px` }}
              />
              <div
                class="page-margin-guide page-margin-guide--right"
                style={{ width: `${m.right}px` }}
              />
              <div
                class="page-margin-guide page-margin-guide--bottom"
                style={{ height: `${m.bottom}px` }}
              />
              <div
                class="page-margin-guide page-margin-guide--left"
                style={{ width: `${m.left}px` }}
              />
            </>
          ) : null}
          {interactive && sheet.blocks.length === 0 && !preview && (
            <div class="editor-empty">
              <strong>Empty surface</strong>
              <p class="muted">
                Use the pointer tool, drag to select, or pick a block tool to
                place. Right-click / Ctrl-click for options.
              </p>
            </div>
          )}
          {marquee && isActive && interactive && (
            <div
              class="selection-marquee"
              aria-hidden="true"
              style={{
                left: `${marquee.x}px`,
                top: `${marquee.y}px`,
                width: `${marquee.w}px`,
                height: `${marquee.h}px`,
              }}
            />
          )}
          {sheetBlocks.map((b) => {
            const count = comments.filter((c) => c.blockId === b.id).length;
            const itemCtx = sheetContexts.get(b.id);
            const isInteractive = interactive && !preview;
            return renderBlock({
              block: b,
              selected:
                isInteractive &&
                (selectedIds.value.includes(b.id) ||
                  (sel?.kind === "block" && sel.id === b.id)),
              preview,
              row,
              runtime: itemCtx ?? runtime,
              commentCount: showComments ? count : 0,
              snapStep,
              scale,
              onSelect: (id, opts) => {
                if (!isInteractive) {
                  setActivePage(sheet.id);
                  return;
                }
                if (opts?.toggle) selectBlockToggle(id);
                else select({ kind: "block", id });
              },
              onContextMenu: isInteractive
                ? (_id, ev) => openBlockMenu(ev)
                : undefined,
              onChipContextMenu: isInteractive
                ? (id, path, ev) => openMergeChipMenu(id, path, ev)
                : undefined,
              onChangeContent: isInteractive
                ? (id, content) => updateBlock(id, { content })
                : undefined,
              onGestureStart: isInteractive
                ? () => {
                    pushHistoryCheckpoint();
                    dragOrigins.current.clear();
                    const ids = selectedIds.value;
                    for (const oid of ids) {
                      const blk = findBlockDeep(sheet.blocks, oid);
                      if (blk) dragOrigins.current.set(oid, { x: blk.x, y: blk.y });
                    }
                  }
                : undefined,
              onMoveResize: isInteractive
                ? (id, patch, mode) => {
                    if (mode === "drag") {
                      const ids =
                        selectedIds.value.length > 1 &&
                        selectedIds.value.includes(id)
                          ? selectedIds.value
                          : [id];
                      const origins = dragOrigins.current;
                      if (ids.length > 1) {
                        const anchor = origins.get(id);
                        if (anchor) {
                          const dx = (patch.x ?? 0) - anchor.x;
                          const dy = (patch.y ?? 0) - anchor.y;
                          for (const [oid, o] of origins) {
                            if (oid === id) continue;
                            const ob = findBlockDeep(sheet.blocks, oid);
                            if (ob && !ob.locked) {
                              updateBlock(oid, { x: o.x + dx, y: o.y + dy });
                            }
                          }
                        }
                      } else {
                        origins.clear();
                      }
                    }
                    updateBlock(id, patch);
                  }
                : undefined,
            });
          })}
          {sheet.watermark && sheet.watermark.layer === "front" ? (
            <PageWatermark
              watermark={sheet.watermark}
              pageW={pageW}
              pageH={pageH}
            />
          ) : null}
        </div>
      </div>
      </div>
    );
  };

  return (
    <>
      <div class={boardClass}>
        {showRulers && !preview && page && (
          <EditorRulers
            scrollRef={boardRef}
            pageW={pageW}
            pageH={pageH}
            scale={scale}
            margins={normalizeMargins(page.margins)}
            unit={
              isRulerUnit(prefs.value.rulerUnit)
                ? prefs.value.rulerUnit
                : "px"
            }
            onMarginsChange={(patch) =>
              updatePage(page.id, { margins: patch })
            }
          />
        )}
        <div
          class={scrollClass}
          role="application"
          aria-label={
            preview
              ? "Document preview"
              : `Document editor · ${formatZoomPercent(scale)}`
          }
          data-tour="canvas"
          ref={boardRef}
          style={boardStyle}
          onClick={onBoardClick}
          onContextMenu={(e) => {
            if (preview) return;
            select(null);
            const pageEl = (e.currentTarget as HTMLElement).querySelector(
              ".editor-page--active, .editor-page",
            );
            if (pageEl) openPageMenu(e, pageEl);
          }}
        >
          <div
            class="editor-fit-area"
            ref={fitAreaRef}
            style={{
              transform:
                boardRotate !== 0 ? `rotate(${boardRotate}deg)` : undefined,
              transformOrigin: "center center",
            }}
          >
            <div class="editor-stack">
              <div
                class={
                  viewMode === "spread"
                    ? "editor-fit editor-fit--spread"
                    : viewMode === "continuous"
                      ? "editor-fit editor-fit--continuous"
                      : "editor-fit"
                }
                style={{
                  width: `${fitW}px`,
                  height: `${fitH}px`,
                  gap:
                    viewMode === "continuous" || viewMode === "spread"
                      ? `${sheetGap * scale}px`
                      : undefined,
                }}
              >
                {pagesToShow.map((sheet) =>
                  renderPageSheet(sheet, sheet.id === page?.id),
                )}
              </div>
            </div>
          </div>
          {!preview && selectedBlock.value && (
            <span class="visually-hidden">
              Selected {selectedBlock.value.name}
            </span>
          )}
        </div>
      </div>
      {!preview && menu && (
        <AppContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={closeMenu}
        />
      )}
    </>
  );
}
