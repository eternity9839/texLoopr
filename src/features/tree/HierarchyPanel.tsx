import { useEffect, useMemo, useState } from "preact/hooks";
import type { Block, Page } from "../../model/document";
import {
  flattenOutline,
  isContainerBlock,
  matchesQuery,
} from "../../model/groups";
import { VirtualList } from "../../ui/VirtualList";
import { Icon, BLOCK_TYPE_ICON } from "../../ui/icons";
import {
  project,
  selection,
  select,
  setActivePage,
  setStudioView,
  activePage,
} from "../../state/store";

type TreeRow =
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
      n += countBlocksDeep(
        Array.isArray(b.content.blocks) ? (b.content.blocks as Block[]) : [],
      );
    }
  }
  return n;
}

/** Flatten a page's full hierarchy, keeping ancestors of matching
 *  subtrees so filtered results stay in context. */
function pageBlockRows(page: Page, q: string): {
  block: Block;
  depth: number;
}[] {
  const flat = flattenOutline(page.blocks);
  if (!q) return flat;
  const hit = flat.map(({ block }) => matchesQuery(block, q));
  const keep = flat.map((_, i) => {
    if (hit[i]) return true;
    for (let j = i + 1; j < flat.length && flat[j].depth > flat[i].depth; j++) {
      if (hit[j]) return true;
    }
    return false;
  });
  return flat.filter((_, i) => keep[i]);
}

export function HierarchyPanel() {
  const proj = project.value;
  const sel = selection.value;
  const currentPageId = activePage.value?.id ?? proj.activePageId;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    [proj.activePageId]: true,
  }));

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

  const rows = useMemo<TreeRow[]>(() => {
    const out: TreeRow[] = [];
    for (const page of proj.pages) {
      out.push({ kind: "page", page, count: countBlocksDeep(page.blocks) });
      if (expanded[page.id]) {
        for (const { block, depth } of pageBlockRows(page, q)) {
          out.push({ kind: "block", pageId: page.id, block, depth });
        }
      }
    }
    return out;
  }, [proj.pages, expanded, q]);

  const scrollToIndex = useMemo(() => {
    if (sel?.kind !== "block") return null;
    const idx = rows.findIndex(
      (r) => r.kind === "block" && r.block.id === sel.id,
    );
    return idx >= 0 ? idx : null;
  }, [rows, sel]);

  const openPage = (pageId: string) => {
    setActivePage(pageId);
    setStudioView("edit");
    setExpanded((p) => ({ ...p, [pageId]: true }));
  };

  const totalBlocks = proj.pages.reduce((n, p) => n + countBlocksDeep(p.blocks), 0);

  return (
    <div class="nav-outline" data-tour="hierarchy">
      <div class="nav-outline__controls">
        <input
          class="nav-outline__search"
          type="search"
          placeholder="Search components…"
          value={query}
          aria-label="Search hierarchy"
          title={`${proj.pages.length} pages · ${totalBlocks} components`}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
      </div>

      <div class="nav-outline__body nav-outline__body--virt">
        <VirtualList
          items={rows}
          rowHeight={ROW_H}
          className="nav-outline__virt"
          getKey={(row, i) =>
            row.kind === "page" ? `p:${row.page.id}` : `t:${row.block.id}:${i}`
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
                    onClick={() =>
                      setExpanded((p) => ({ ...p, [row.page.id]: !p[row.page.id] }))
                    }
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
                      isActive ? "true" : undefined
                    }
                    onClick={() => openPage(row.page.id)}
                  >
                    <span class="nav-page__label">{row.page.name}</span>
                    <span class="nav-page__count">{row.count}</span>
                  </button>
                </div>
              );
            }

            const { block, pageId, depth } = row;
            const selected = sel?.kind === "block" && sel.id === block.id;
            const childCount = isContainerBlock(block)
              ? countBlocksDeep(
                  Array.isArray(block.content.blocks)
                    ? (block.content.blocks as Block[])
                    : [],
                )
              : 0;
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
                onClick={() => {
                  setActivePage(pageId);
                  select({ kind: "block", id: block.id });
                  setStudioView("edit");
                }}
              >
                <span class="nav-block__type" aria-hidden="true">
                  <Icon name={BLOCK_TYPE_ICON[block.type]} size={12} />
                </span>
                <span class="nav-block__name">{block.name}</span>
                {childCount > 0 && (
                  <span class="nav-block__z" title={`${childCount} children`}>
                    {childCount}
                  </span>
                )}
                {block.locked && (
                  <span class="nav-block__flag" title="Locked">
                    <Icon name="lock" size={10} />
                  </span>
                )}
              </button>
            );
          }}
        />
      </div>
    </div>
  );
}
