import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  AppContextMenu,
  type ContextMenuEntry,
} from "../../ui/AppContextMenu";
import {
  activePage,
  activeTool,
  insertBlock,
  select,
  selectBlockToggle,
  selection,
  selectedBlock,
  selectedIds,
  updateBlock,
  deleteSelection,
  nudgeSelection,
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
  clipboardBlock,
  toggleLockSelected,
  nudgeZOrder,
  addComment,
  inspectorTab,
  updatePrefs,
  dataRows,
} from "../../state/store";
import { enrichPreviewContext } from "../../model/runtime";
import { flattenBlocksForPreview } from "../../model/repeat";
import { dataColumnNames } from "../../model/bindings";
import { evaluateCondition } from "../../model/bindings";
import { renderBlock } from "./blocks";
import type { RuntimeContext } from "../../model/expr";
import type { BlockType } from "../../model/document";
import { normalizeMargins } from "../../model/document";
import { BLOCK_TYPE_ICON } from "../../ui/icons";
import { BLOCK_TOOLS } from "./Toolbox";
import { PAGE_WIDTH, PAGE_HEIGHT } from "../../model/document";
import { fitScale } from "./canvasScale";

interface EditorCanvasProps {
  preview?: boolean;
}

type CanvasMenu = {
  x: number;
  y: number;
  scope: "block" | "page";
  placeAt?: { x: number; y: number };
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
  const page = activePage.value;
  const sel = selection.value;
  const tool = activeTool.value;
  const row = previewRow.value;
  const showGrid = prefs.value.showGrid;
  const showRulers = prefs.value.showRulers !== false;
  const showComments = prefs.value.showComments !== false;
  const output = activeOutputProfile();
  const comments = project.value.comments ?? [];
  const gridSize = prefs.value.gridSize ?? 16;
  const gridLock = prefs.value.gridLock === true;
  const snapStep: number | null = prefs.value.snap
    ? gridLock
      ? gridSize
      : 8
    : null;
  const [menu, setMenu] = useState<CanvasMenu | null>(null);
  /** Start positions of every selected block at drag begin (multi-drag) */
  const dragOrigins = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Uniform fit-to-area scale: the sheet is always rendered at exactly
  // PAGE_WIDTH × PAGE_HEIGHT and scaled as one unit, so blocks can never
  // stray outside the page on any viewport.
  const fitAreaRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = fitAreaRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      // Ignore transient zero-size states (hidden pane mid-animation)
      const rect = el.getBoundingClientRect();
      const w = rect.width || el.clientWidth;
      const h = rect.height || el.clientHeight;
      if (w > 1 && h > 1) setScale(fitScale(w, h));
    };
    update();
    raf = requestAnimationFrame(() => {
      update();
      raf = requestAnimationFrame(update);
    });
    const t = window.setTimeout(update, 300);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  const openBlockMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, scope: "block" });
  }, []);

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
    if (!preview || !output) return undefined;
    return enrichPreviewContext(project.value, row, output);
  }, [preview, output, row, project.value]);

  const { renderBlocks, itemContexts } = useMemo(() => {
    const source = page?.blocks ?? [];
    if (!preview || !runtime) {
      return {
        renderBlocks: source,
        itemContexts: new Map<string, RuntimeContext>(),
      };
    }
    const visible = source.filter((b) =>
      evaluateCondition(b.condition, row, runtime),
    );
    const flat = flattenBlocksForPreview(visible, row, runtime);
    return { renderBlocks: flat.blocks, itemContexts: flat.itemContexts };
  }, [page?.blocks, preview, runtime, row]);

  useEffect(() => {
    if (preview) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoEdit();
        return;
      }
      if (
        mod &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redoEdit();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        e.preventDefault();
        cutSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
        return;
      }
      if (e.key === "Escape") {
        closeMenu();
        select(null);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeSelection(-step, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeSelection(step, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeSelection(0, -step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeSelection(0, step);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, closeMenu]);

  const block = selectedBlock.value;
  const hasBlock = Boolean(block);
  const hasClip = Boolean(clipboardBlock.value);
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
          inspectorTab.value = "props";
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
    closeMenu();
    const pageEl = (e.currentTarget as HTMLElement).querySelector(
      ".editor-page",
    );
    if (!pageEl) return;
    const at = pageCoordsFromEvent(pageEl, e, snapStep, scale);
    if (tool) {
      insertBlock(tool, {
        x: Math.max(0, at.x - 40),
        y: Math.max(0, at.y - 20),
      });
      return;
    }
    select(null);
  };

  const empty = !page || page.blocks.length === 0;
  const boardClass = [
    "editor-board",
    showGrid ? "editor-board--grid" : "",
    showGrid && prefs.value.gridStyle === "dots" ? "editor-board--grid-dots" : "",
    showRulers ? "editor-board--rulers" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Paint order: explicit zIndex wins; otherwise decorative layers
  // (shapes, then pictures) stay beneath content so rules/washes can
  // never cover text in preview.
  const layerRank = (t: string | undefined) =>
    t === "shape" ? 0 : t === "picture" ? 1 : 2;

  const sorted = [...renderBlocks].sort((a, b) => {
    const za = a.zIndex ?? layerRank(a.type);
    const zb = b.zIndex ?? layerRank(b.type);
    return za - zb;
  });

  return (
    <>
      <div
        class={boardClass}
        role="application"
        aria-label={preview ? "Document preview" : "Document editor"}
        data-tour="canvas"
        style={{ "--board-grid-size": `${gridSize}px` } as Record<string, string>}
        onClick={onBoardClick}
        onContextMenu={(e) => {
          if (preview) return;
          select(null);
          const pageEl = (e.currentTarget as HTMLElement).querySelector(
            ".editor-page",
          );
          if (pageEl) openPageMenu(e, pageEl);
        }}
      >
        {showRulers && !preview && (
          <>
            <div class="editor-ruler editor-ruler--x" aria-hidden="true" />
            <div class="editor-ruler editor-ruler--y" aria-hidden="true" />
          </>
        )}
        <div class="editor-fit-area" ref={fitAreaRef}>
          <div
            class="editor-fit"
            style={{
              width: `${PAGE_WIDTH * scale}px`,
              height: `${PAGE_HEIGHT * scale}px`,
            }}
          >
            <div
              class={
                preview ? "editor-page editor-page--preview" : "editor-page"
              }
              style={{ transform: `scale(${scale})` }}
          onClick={(e) => {
            e.stopPropagation();
            if (preview) return;
            if ((e.target as HTMLElement).closest(".block-frame")) return;
            select(null);
            closeMenu();
          }}
          onContextMenu={(e) => {
            if (preview) return;
            if ((e.target as HTMLElement).closest(".block-frame")) return;
            select(null);
            openPageMenu(e, e.currentTarget as HTMLElement);
          }}
        >
          {(() => {
            if (!page) return null;
            const m = normalizeMargins(page.margins);
            return (
              <>
                {page.background ? (
                  <div
                    class="page-bg"
                    aria-hidden="true"
                    style={{ background: page.background }}
                  />
                ) : null}
                {page.watermark ? (
                  <div
                    class="page-watermark"
                    aria-hidden="true"
                    style={{
                      transform: `rotate(${page.watermark.angle ?? -30}deg)`,
                      opacity: String(page.watermark.opacity ?? 0.08),
                      color: page.watermark.color ?? "#334155",
                      fontSize: `${page.watermark.fontSize ?? 96}px`,
                    }}
                  >
                    {page.watermark.kind && page.watermark.kind !== "text"
                      ? page.watermark.kind.toUpperCase()
                      : page.watermark.text || ""}
                  </div>
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
              </>
            );
          })()}
          {empty && !preview && (
            <div class="editor-empty">
              <strong>Empty page</strong>
              <p class="muted">
                Right-click to add a block, or use the floating toolbox.
              </p>
            </div>
          )}
          {sorted.map((b) => {
            const itemRuntime = itemContexts.get(b.id) ?? runtime;
            const show =
              !preview ||
              evaluateCondition(b.condition, row, itemRuntime);
            if (!show) return null;
            return renderBlock({
              block: b,
              selected:
                selectedIds.value.includes(b.id) ||
                (sel?.kind === "block" && sel.id === b.id),
              preview,
              row,
              runtime: itemRuntime,
              commentCount: showComments
                ? comments.filter((c) => c.blockId === b.id && !c.resolved)
                    .length
                : 0,
              onSelect: (id, opts) => {
                if (opts?.toggle) selectBlockToggle(id);
                else select({ kind: "block", id });
              },
              onContextMenu: (_id, ev) => openBlockMenu(ev),
              onChangeContent: (id, content) => updateBlock(id, { content }),
              onGestureStart: pushHistoryCheckpoint,
              snapStep,
              scale,
              onMoveResize: (id, patch, mode) => {
                if (mode === "drag" && selectedIds.value.length > 1) {
                  const ids = selectedIds.value;
                  const origins = dragOrigins.current;
                  if (!origins.has(id)) {
                    origins.clear();
                    for (const b of page?.blocks ?? []) {
                      if (ids.includes(b.id)) origins.set(b.id, { x: b.x, y: b.y });
                    }
                  }
                  const anchor = origins.get(id);
                  if (anchor) {
                    const dx = (patch.x ?? 0) - anchor.x;
                    const dy = (patch.y ?? 0) - anchor.y;
                    for (const [oid, o] of origins) {
                      if (oid === id) continue;
                      const ob = page?.blocks.find((b) => b.id === oid);
                      if (ob && !ob.locked) {
                        updateBlock(oid, { x: o.x + dx, y: o.y + dy });
                      }
                    }
                  }
                } else if (mode === "drag") {
                  dragOrigins.current.clear();
                }
                updateBlock(id, patch);
              },
            });
            })}
            {preview && activePage.value?.pageNumber && (() => {
              const pn = activePage.value.pageNumber!;
              const pages = project.value.pages;
              const idx = pages.findIndex((p) => p.id === activePage.value!.id);
              const n = idx + 1;
              if (pn.mode === "odd" && n % 2 === 0) return null;
              if (pn.mode === "even" && n % 2 !== 0) return null;
              if (pn.skipFirst && idx === 0) return null;
              if (pn.skipPages?.includes(n)) return null;
              const total = pages.length;
              const fmt = (pn.format || "{n}")
                .replace(/\{n\}/g, String(n))
                .replace(/\{total\}/g, String(total));
              return (
                <div class="page-number" aria-hidden="true">{fmt}</div>
              );
            })()}
            </div>
          </div>
        </div>
        {!preview && selectedBlock.value && (
          <span class="visually-hidden">
            Selected {selectedBlock.value.name}
          </span>
        )}
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
