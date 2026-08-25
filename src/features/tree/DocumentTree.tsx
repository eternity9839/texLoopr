import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Block, BlockType, Page } from "../../model/document";
import { flattenOutline, isContainerBlock, matchesQuery } from "../../model/groups";
import { VirtualList } from "../../ui/VirtualList";
import { Icon, BLOCK_TYPE_ICON } from "../../ui/icons";
import { BLOCK_TOOLS } from "../editor/Toolbox";
import {
  project,
  selection,
  select,
  selectBlockToggle,
  setActivePage,
  setStudioView,
  addPage,
  activePage,
  prefs,
  insertBlock,
} from "../../state/store";

type SortMode = "document" | "z" | "name" | "type";

type OutlineRow =
  | { kind: "page"; page: Page; count: number }
  | { kind: "block"; pageId: string; block: Block; depth: number };

const PAGE_ROW_H = 28;
const BLOCK_ROW_H = 24;
const ROW_H = 26;

function countBlocksDeep(blocks: Block[]): number {
  let n = 0;
  for (const b of blocks) {
    n += 1;
    if (isContainerBlock(b)) {
      const kids = Array.isArray(b.content.blocks)
        ? (b.content.blocks as Block[])
        : [];
      n += countBlocksDeep(kids);
    }
  }
  return n;
}

export function sortBlocks(blocks: Block[], mode: SortMode): Block[] {
  const list = [...blocks];
  switch (mode) {
    case "z":
      return list.sort(
        (a, b) =>
          (b.zIndex ?? 0) - (a.zIndex ?? 0) || a.name.localeCompare(b.name),
      );
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "type":
      return list.sort(
        (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
      );
    default:
      return list;
  }
}

export function buildOutlineRows(
  pages: Page[],
  expanded: Record<string, boolean>,
  query: string,
  sort: SortMode,
): OutlineRow[] {
  const q = query.trim().toLowerCase();
  const rows: OutlineRow[] = [];
  for (const page of pages) {
    const top = sort === "document" ? page.blocks : sortBlocks(page.blocks, sort);
    const hierarchy =
      sort === "document"
        ? flattenOutline(top)
        : top.map((block) => ({ block, depth: 0 }));
    const filtered = q
      ? hierarchy.filter(({ block }) => matchesQuery(block, q))
      : hierarchy;
    rows.push({
      kind: "page",
      page,
      count: countBlocksDeep(page.blocks),
    });
    if (expanded[page.id]) {
      for (const { block, depth } of filtered) {
        rows.push({ kind: "block", pageId: page.id, block, depth });
      }
    }
  }
  return rows;
}

export function Navigator() {
  const proj = project.value;
  const sel = selection.value;
  const currentPageId = activePage.value?.id ?? proj.activePageId;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("document");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    [proj.activePageId]: true,
  }));
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev, [currentPageId]: true };
      if (q) {
        for (const page of proj.pages) {
          if (page.blocks.some((b) => matchesQuery(b, q))) next[page.id] = true;
        }
      }
      return next;
    });
  }, [currentPageId, q, proj.pages]);

  useEffect(() => {
    if (!addOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!addRef.current?.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [addOpen]);

  const totalBlocks = useMemo(
    () => proj.pages.reduce((n, p) => n + p.blocks.length, 0),
    [proj.pages],
  );

  const rows = useMemo(
    () => buildOutlineRows(proj.pages, expanded, query, sort),
    [proj.pages, expanded, query, sort],
  );

  const scrollToIndex = useMemo(() => {
    if (sel?.kind !== "block") return null;
    const idx = rows.findIndex(
      (r) => r.kind === "block" && r.block.id === sel.id,
    );
    return idx >= 0 ? idx : null;
  }, [rows, sel]);

  const togglePage = (pageId: string) => {
    setExpanded((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const addBlock = (type: BlockType) => {
    setStudioView("edit");
    setActivePage(currentPageId);
    setExpanded((p) => ({ ...p, [currentPageId]: true }));
    insertBlock(type);
    setAddOpen(false);
  };

  const collapsed = Boolean(prefs.value.navCollapsed);

  if (collapsed) {
    return (
      <div class="nav-outline nav-outline--icons" data-tour="navigator">
        {proj.pages.map((pg) => (
          <button
            type="button"
            key={pg.id}
            class={
              pg.id === currentPageId
                ? "nav-icon-btn nav-icon-btn--on"
                : "nav-icon-btn"
            }
            title={`${pg.name} (${pg.blocks.length})`}
            aria-label={pg.name}
            aria-current={pg.id === currentPageId ? "page" : undefined}
            onClick={() => {
              setActivePage(pg.id);
              setStudioView("edit");
            }}
          >
            <Icon name="file" size={14} />
            <span class="nav-icon-btn__count">{pg.blocks.length}</span>
          </button>
        ))}
        <button
          type="button"
          class="nav-icon-btn"
          title="Add page"
          aria-label="Add page"
          onClick={() => addPage()}
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
    );
  }

  return (
    <div class="nav-outline" data-tour="navigator">
      <div class="nav-outline__controls">
        <input
          class="nav-outline__search"
          type="search"
          placeholder="Filter…"
          value={query}
          aria-label="Filter navigator"
          title={`${proj.pages.length} pages · ${totalBlocks} blocks`}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <select
          class="nav-outline__sort"
          aria-label="Sort blocks"
          title="Sort blocks"
          value={sort}
          onChange={(e) => setSort(e.currentTarget.value as SortMode)}
        >
          <option value="document">Order</option>
          <option value="z">Pile</option>
          <option value="name">Name</option>
          <option value="type">Type</option>
        </select>
      </div>

      <div class="nav-outline__toolbar">
        <button
          type="button"
          class="nav-outline__chip nav-outline__chip--icon"
          onClick={() => setExpanded({ [currentPageId]: true })}
          title="Focus active page"
          aria-label="Focus active page"
        >
          <Icon name="focus" size={13} />
        </button>
        <button
          type="button"
          class="nav-outline__chip nav-outline__chip--icon"
          onClick={() => {
            const all: Record<string, boolean> = {};
            for (const p of proj.pages) all[p.id] = true;
            setExpanded(all);
          }}
          title="Expand all pages"
          aria-label="Expand all pages"
        >
          <Icon name="expand" size={13} />
        </button>
        <div class="nav-add" ref={addRef}>
          <button
            type="button"
            class="nav-outline__chip nav-outline__chip--icon nav-outline__chip--accent"
            title="Add page or block"
            aria-label="Add page or block"
            aria-expanded={addOpen}
            aria-haspopup="menu"
            onClick={() => setAddOpen((o) => !o)}
          >
            <Icon name="plus" size={13} />
          </button>
          {addOpen && (
            <div class="nav-add__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  addPage();
                  setAddOpen(false);
                }}
              >
                <Icon name="file" size={13} />
                Page
              </button>
              <hr class="nav-add__sep" />
              {BLOCK_TOOLS.map((t) => (
                <button
                  type="button"
                  role="menuitem"
                  key={t.type}
                  onClick={() => addBlock(t.type)}
                >
                  <Icon name={BLOCK_TYPE_ICON[t.type]} size={13} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div class="nav-outline__body nav-outline__body--virt">
        <VirtualList
          items={rows}
          rowHeight={ROW_H}
          className="nav-outline__virt"
          getKey={(row, i) =>
            row.kind === "page" ? `p:${row.page.id}` : `b:${row.block.id}:${i}`
          }
          scrollToIndex={scrollToIndex}
          renderRow={(row) => {
            if (row.kind === "page") {
              const open = Boolean(expanded[row.page.id]);
              const isActive = row.page.id === currentPageId;
              return (
                <div
                  class={
                    isActive
                      ? "nav-page__row nav-page__row--active"
                      : "nav-page__row"
                  }
                  style={{ height: `${PAGE_ROW_H}px` }}
                >
                  <button
                    type="button"
                    class="nav-page__twist"
                    aria-expanded={open}
                    aria-label={open ? "Collapse page" : "Expand page"}
                    onClick={() => togglePage(row.page.id)}
                  >
                    <Icon
                      name={open ? "chevronDown" : "chevronRight"}
                      size={12}
                    />
                  </button>
                  <button
                    type="button"
                    class="nav-page__name"
                    aria-current={
                      (sel?.kind === "page" && sel.id === row.page.id) ||
                      (sel?.kind !== "block" && isActive)
                        ? "true"
                        : undefined
                    }
                    onClick={() => {
                      setActivePage(row.page.id);
                      setExpanded((p) => ({ ...p, [row.page.id]: true }));
                      setStudioView("edit");
                    }}
                  >
                    <span class="nav-page__label">{row.page.name}</span>
                    <span class="nav-page__count">{row.count}</span>
                  </button>
                </div>
              );
            }

            const { block, pageId, depth } = row;
            const selected = sel?.kind === "block" && sel.id === block.id;
            return (
              <button
                type="button"
                class={
                  selected ? "nav-block nav-block--selected" : "nav-block"
                }
                style={{
                  height: `${BLOCK_ROW_H}px`,
                  paddingLeft: `${8 + depth * 12}px`,
                }}
                aria-current={selected ? "true" : undefined}
                title={`${block.type} · ${block.w}×${block.h}${block.locked ? " · locked" : ""}`}
                onClick={(e) => {
                  setActivePage(pageId);
                  if (e.shiftKey) selectBlockToggle(block.id);
                  else select({ kind: "block", id: block.id });
                  setStudioView("edit");
                }}
              >
                <span class="nav-block__type" aria-hidden="true">
                  <Icon name={BLOCK_TYPE_ICON[block.type]} size={12} />
                </span>
                <span class="nav-block__name">{block.name}</span>
                {block.locked && (
                  <span class="nav-block__flag" title="Locked">
                    <Icon name="lock" size={10} />
                  </span>
                )}
                {sort === "z" && (
                  <span class="nav-block__z">{block.zIndex ?? 0}</span>
                )}
              </button>
            );
          }}
        />
      </div>
    </div>
  );
}
