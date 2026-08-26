import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { VirtualList } from "../../ui/VirtualList";
import { Icon, BLOCK_TYPE_ICON } from "../../ui/icons";
import { BLOCK_TOOLS, localizedBlockTypeLabel } from "../editor/Toolbox";
import {
  accentForKey,
  blockBindingHint,
  buildOutlineRows,
  expandKeyFormat,
  expandKeyGroup,
  expandKeyPage,
  expandKeyProject,
  findBlockAncestors,
  isExpanded,
  outlineKinKey,
  type OutlineRow,
  type OutlineSortMode,
} from "../../model/outlineTree";
import {
  project,
  selection,
  select,
  selectBlockToggle,
  setActivePage,
  setStudioView,
  activePage,
  prefs,
  updatePrefs,
  setActiveOutputId,
  addPage,
  insertBlock,
  updateBlock,
  setGroupIsolation,
  previewRow,
  previewLanguageOverride,
  activeOutputProfile,
} from "../../state/store";
import { BlockAssociations } from "../properties/BlockAssociations";
import { enrichPreviewContext } from "../../model/runtime";

const ROW_H = 26;
const PAGE_ROW_H = 28;
const BLOCK_ROW_H = 24;

type HoverPlay = {
  kinKey: string | null;
  fields: string[];
  blockId: string | null;
};

function rowKey(row: OutlineRow, i: number): string {
  switch (row.kind) {
    case "project":
      return "project";
    case "page":
      return `page:${row.page.id}`;
    case "format":
      return `format:${row.pageId}:${row.output.id}`;
    case "block":
      return `block:${row.block.id}:${i}`;
    default:
      return `row:${i}`;
  }
}

function fieldsOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const set = new Set(a);
  return b.some((f) => set.has(f));
}

export function HierarchyPanel() {
  const proj = project.value;
  const p = prefs.value;
  const sel = selection.value;
  const currentPageId = activePage.value?.id ?? proj.activePageId;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<OutlineSortMode>("document");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    [expandKeyProject()]: true,
    [expandKeyPage(proj.activePageId)]: true,
  }));
  const [addOpen, setAddOpen] = useState(false);
  const [hover, setHover] = useState<HoverPlay>({
    kinKey: null,
    fields: [],
    blockId: null,
  });
  const addRef = useRef<HTMLDivElement>(null);
  const clearHoverTimer = useRef<number | null>(null);

  const showFormats = p.showFormatsInTree === true;

  const scheduleClearHover = () => {
    if (clearHoverTimer.current != null) {
      window.clearTimeout(clearHoverTimer.current);
    }
    clearHoverTimer.current = window.setTimeout(() => {
      setHover({ kinKey: null, fields: [], blockId: null });
      clearHoverTimer.current = null;
    }, 80);
  };

  const playHover = (next: HoverPlay) => {
    if (clearHoverTimer.current != null) {
      window.clearTimeout(clearHoverTimer.current);
      clearHoverTimer.current = null;
    }
    setHover(next);
  };

  useEffect(() => {
    return () => {
      if (clearHoverTimer.current != null) {
        window.clearTimeout(clearHoverTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!addRef.current?.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [addOpen]);

  useEffect(() => {
    setExpanded((prev) => ({
      ...prev,
      [expandKeyPage(currentPageId)]: true,
    }));
  }, [currentPageId]);

  const rows = useMemo(() => {
    const output = activeOutputProfile() ?? proj.outputs?.[0];
    const runtime = output
      ? enrichPreviewContext(
          proj,
          previewRow.value,
          output,
          {},
          previewLanguageOverride.value,
        )
      : undefined;
    return buildOutlineRows({
      project: proj,
      expanded,
      query,
      sort,
      showFormatsInTree: showFormats,
      runtime,
    });
  }, [
    proj,
    expanded,
    query,
    sort,
    showFormats,
    previewRow.value,
    previewLanguageOverride.value,
    proj.activeOutputId,
  ]);

  const scrollToIndex = useMemo(() => {
    if (sel?.kind !== "block") return null;
    const idx = rows.findIndex(
      (r) => r.kind === "block" && r.block.id === sel.id,
    );
    return idx >= 0 ? idx : null;
  }, [rows, sel]);

  const toggle = (key: string, defaultOpen = true) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !isExpanded(prev, key, defaultOpen),
    }));
  };

  const openPage = (pageId: string) => {
    setActivePage(pageId);
    setStudioView("edit");
    setExpanded((prev) => ({
      ...prev,
      [expandKeyProject()]: true,
      [expandKeyPage(pageId)]: true,
    }));
    select({ kind: "page", id: pageId });
  };

  const selectBlockRow = (
    pageId: string,
    blockId: string,
    e: MouseEvent,
    isGroup: boolean,
  ) => {
    setActivePage(pageId);
    setStudioView("edit");
    if (e.shiftKey) selectBlockToggle(blockId);
    else select({ kind: "block", id: blockId });
    const pg = proj.pages.find((p) => p.id === pageId);
    if (pg) {
      const chain = findBlockAncestors(pg.blocks, blockId);
      if (chain.length > 0 && !isGroup) {
        setGroupIsolation(chain[chain.length - 1]!.id);
      } else if (isGroup && e.detail >= 2) {
        setGroupIsolation(blockId);
      } else if (chain.length === 0 && !isGroup) {
        setGroupIsolation(null);
      }
    }
  };

  const addBlock = (type: import("../../model/document").BlockType) => {
    setStudioView("edit");
    setActivePage(currentPageId);
    setExpanded((prev) => ({
      ...prev,
      [expandKeyPage(currentPageId)]: true,
    }));
    insertBlock(type);
    setAddOpen(false);
  };

  return (
    <div
      class={[
        "nav-outline",
        hover.kinKey || hover.fields.length ? "nav-outline--play" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-tour="hierarchy"
      onPointerLeave={scheduleClearHover}
    >
      <BlockAssociations compact />

      <div class="nav-outline__controls">
        <input
          class="nav-outline__search"
          type="search"
          placeholder="Search components…"
          value={query}
          aria-label="Search hierarchy"
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <select
          class="nav-outline__sort"
          aria-label="Sort blocks"
          value={sort}
          onChange={(e) => setSort(e.currentTarget.value as OutlineSortMode)}
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
          class={
            showFormats
              ? "nav-outline__chip nav-outline__chip--on"
              : "nav-outline__chip"
          }
          title="Show output formats under each surface"
          aria-pressed={showFormats}
          onClick={() =>
            updatePrefs({ showFormatsInTree: !showFormats })
          }
        >
          Formats
        </button>
        <button
          type="button"
          class="nav-outline__chip nav-outline__chip--icon"
          onClick={() =>
            setExpanded({
              [expandKeyProject()]: true,
              [expandKeyPage(currentPageId)]: true,
            })
          }
          title="Focus active surface"
          aria-label="Focus active surface"
        >
          <Icon name="focus" size={13} />
        </button>
        <button
          type="button"
          class="nav-outline__chip nav-outline__chip--icon"
          onClick={() => {
            const all: Record<string, boolean> = {
              [expandKeyProject()]: true,
            };
            for (const pg of proj.pages) all[expandKeyPage(pg.id)] = true;
            setExpanded(all);
          }}
          title="Expand all"
          aria-label="Expand all"
        >
          <Icon name="expand" size={13} />
        </button>
        <div class="nav-add" ref={addRef}>
          <button
            type="button"
            class="nav-outline__chip nav-outline__chip--icon nav-outline__chip--accent"
            title="Add surface or block"
            aria-label="Add surface or block"
            aria-expanded={addOpen}
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
                Surface
              </button>
              <hr class="nav-add__sep" />
              {BLOCK_TOOLS.map((tool) => (
                <button
                  type="button"
                  role="menuitem"
                  key={tool.type}
                  onClick={() => addBlock(tool.type)}
                >
                  <Icon name={BLOCK_TYPE_ICON[tool.type]} size={13} />
                  {localizedBlockTypeLabel(tool.type, tool.label)}
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
          getKey={rowKey}
          scrollToIndex={scrollToIndex}
          renderRow={(row) => {
            if (row.kind === "project") {
              const open = expanded[expandKeyProject()] !== false;
              return (
                <div
                  class="nav-page__row nav-page__row--project"
                  style={{ height: `${PAGE_ROW_H}px` }}
                >
                  <button
                    type="button"
                    class="nav-page__twist"
                    aria-expanded={open}
                    onClick={() => toggle(expandKeyProject())}
                  >
                    <Icon
                      name={open ? "chevronDown" : "chevronRight"}
                      size={12}
                    />
                  </button>
                  <span class="nav-page__name nav-page__name--static">
                    <span class="nav-page__label">{row.name}</span>
                    <span class="nav-page__count">
                      {row.pageCount} · {row.blockCount}
                    </span>
                  </span>
                </div>
              );
            }

            if (row.kind === "page") {
              const key = expandKeyPage(row.page.id);
              const open = expanded[key] !== false;
              const isActive = row.page.id === currentPageId;
              const kinKey = outlineKinKey(row.page.id, null);
              const accent = accentForKey(kinKey);
              const kinHot = hover.kinKey === kinKey;
              return (
                <div
                  class={[
                    "nav-page__row",
                    "nav-page__row--surface",
                    isActive ? "nav-page__row--active" : "",
                    kinHot ? "nav-page__row--kin" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    height: `${PAGE_ROW_H}px`,
                    paddingLeft: `${8 + row.depth * 10}px`,
                    ["--group-accent" as string]: accent,
                  }}
                  onPointerEnter={() =>
                    playHover({
                      kinKey,
                      fields: [],
                      blockId: null,
                    })
                  }
                >
                  <button
                    type="button"
                    class="nav-page__twist"
                    aria-expanded={open}
                    onClick={() => toggle(key)}
                  >
                    <Icon
                      name={open ? "chevronDown" : "chevronRight"}
                      size={12}
                    />
                  </button>
                  <button
                    type="button"
                    class="nav-page__name"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => openPage(row.page.id)}
                  >
                    <span class="nav-page__swatch" aria-hidden="true" />
                    <span class="nav-page__label">{row.page.name}</span>
                    <span class="nav-page__count">{row.count}</span>
                  </button>
                </div>
              );
            }

            if (row.kind === "format") {
              const key = expandKeyFormat(row.pageId, row.output.id);
              const open = expanded[key] === true;
              return (
                <div
                  class="nav-page__row nav-page__row--format"
                  style={{
                    height: `${PAGE_ROW_H}px`,
                    paddingLeft: `${8 + row.depth * 10}px`,
                  }}
                >
                  <button
                    type="button"
                    class="nav-page__twist"
                    aria-expanded={open}
                    onClick={() => toggle(key, false)}
                  >
                    <Icon
                      name={open ? "chevronDown" : "chevronRight"}
                      size={12}
                    />
                  </button>
                  <button
                    type="button"
                    class="nav-page__name"
                      onClick={() => {
                      setActivePage(row.pageId);
                      setActiveOutputId(row.output.id);
                      setExpanded((prev) => ({
                        ...prev,
                        [expandKeyProject()]: true,
                        [expandKeyPage(row.pageId)]: true,
                        [key]: true,
                      }));
                      setStudioView("edit");
                    }}
                  >
                    <Icon name="workflow" size={12} />
                    <span class="nav-page__label">{row.label}</span>
                  </button>
                </div>
              );
            }

            const {
              block,
              pageId,
              depth,
              parentId,
              hasChildren,
              dimmed,
              effectiveZ,
            } = row;
            const selected = sel?.kind === "block" && sel.id === block.id;
            const gKey = expandKeyGroup(block.id);
            const groupOpen = expanded[gKey] !== false;
            const kinKey = outlineKinKey(pageId, parentId);
            // Group header + its children share one accent / kinship key.
            const wrapKey = hasChildren
              ? outlineKinKey(pageId, block.id)
              : kinKey;
            const accent = accentForKey(wrapKey);
            const binding = blockBindingHint(block);
            const kinHot = Boolean(
              hover.kinKey &&
                (hover.kinKey === kinKey ||
                  (hasChildren && hover.kinKey === wrapKey)),
            );
            const linked = Boolean(
              binding &&
                hover.fields.length &&
                fieldsOverlap(binding.fields, hover.fields),
            );
            const selfHot = hover.blockId === block.id;

            return (
              <div
                class={[
                  "nav-block-row",
                  selected ? "nav-block-row--selected" : "",
                  dimmed ? "nav-block-row--dimmed" : "",
                  hasChildren ? "nav-block-row--group" : "nav-block-row--leaf",
                  parentId
                    ? "nav-block-row--nested"
                    : "nav-block-row--surface-child",
                  kinHot ? "nav-block-row--kin" : "",
                  linked ? "nav-block-row--linked" : "",
                  selfHot ? "nav-block-row--self" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  height: `${BLOCK_ROW_H}px`,
                  paddingLeft: `${8 + depth * 10}px`,
                  ["--group-accent" as string]: accent,
                }}
                onPointerEnter={() =>
                  playHover({
                    kinKey: wrapKey,
                    fields: binding?.fields ?? [],
                    blockId: block.id,
                  })
                }
              >
                {hasChildren ? (
                  <button
                    type="button"
                    class="nav-page__twist nav-page__twist--inline"
                    aria-expanded={groupOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(gKey);
                    }}
                  >
                    <Icon
                      name={groupOpen ? "chevronDown" : "chevronRight"}
                      size={10}
                    />
                  </button>
                ) : (
                  <span class="nav-page__twist nav-page__twist--spacer" />
                )}
                <button
                  type="button"
                  class={
                    selected ? "nav-block nav-block--selected" : "nav-block"
                  }
                  aria-current={selected ? "true" : undefined}
                  title={`${block.type} · z ${effectiveZ}${block.locked ? " · locked" : ""}${block.condition ? ` · if ${block.condition}` : ""}${binding ? ` · ${binding.label}` : ""}`}
                  onClick={(e) =>
                    selectBlockRow(pageId, block.id, e, hasChildren)
                  }
                >
                  <span class="nav-block__type" aria-hidden="true">
                    <Icon name={BLOCK_TYPE_ICON[block.type]} size={12} />
                  </span>
                  <span class="nav-block__name">{block.name}</span>
                  {block.condition?.trim() && (
                    <span
                      class="nav-block__cond"
                      title={block.condition}
                      aria-label={`Condition: ${block.condition}`}
                    >
                      if
                    </span>
                  )}
                  {binding && (
                    <span
                      class={[
                        "nav-block__data-dot",
                        linked ? "nav-block__data-dot--pulse" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      title={binding.label}
                      aria-label={binding.label}
                      onPointerEnter={(e) => {
                        e.stopPropagation();
                        playHover({
                          kinKey,
                          fields: binding.fields,
                          blockId: block.id,
                        });
                      }}
                    />
                  )}
                  {sort === "z" && (
                    <span class="nav-block__z">{effectiveZ}</span>
                  )}
                  {block.locked && (
                    <span class="nav-block__flag" title="Locked">
                      <Icon name="lock" size={10} />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  class="nav-block__lock-toggle"
                  title={block.locked ? "Unlock" : "Lock"}
                  aria-label={block.locked ? "Unlock" : "Lock"}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateBlock(block.id, { locked: !block.locked });
                  }}
                >
                  <Icon name={block.locked ? "unlock" : "lock"} size={10} />
                </button>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
