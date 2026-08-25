import type { ComponentChildren, VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Block, BlockType, ListStyle } from "../../../model/document";
import {
  FONT_STACKS,
} from "../../../model/document";
import {
  resolveTemplate,
  evaluateCondition,
  resolveItemsPath,
  type DataRow,
} from "../../../model/bindings";
import type { RuntimeContext } from "../../../model/expr";
import {
  applyMove,
  px,
  resizeFromHandle,
  snapRect,
  type ResizeHandle,
} from "../../../model/geometry";

export interface BlockViewProps {
  block: Block;
  selected: boolean;
  preview: boolean;
  row?: DataRow;
  runtime?: RuntimeContext;
  commentCount?: number;
  snapStep?: number | null;
  /** Canvas zoom factor — pointer deltas arrive in screen px */
  scale?: number;
  onSelect: (id: string, opts?: { toggle?: boolean }) => void;
  onContextMenu?: (id: string, e: MouseEvent) => void;
  onChangeContent?: (id: string, content: Record<string, unknown>) => void;
  onGestureStart?: () => void;
  onMoveResize?: (
    id: string,
    patch: Partial<Pick<Block, "x" | "y" | "w" | "h">>,
    mode?: "drag" | "resize",
  ) => void;
}

const HANDLES: ResizeHandle[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
const DRAG_THRESHOLD = 3;

export function styleFromBlock(
  block: Block,
): Record<string, string | number | undefined> {
  const s = block.style;
  return {
    fontSize: s.fontSize ?? 14,
    fontWeight: s.fontWeight ?? 400,
    fontStyle: s.fontStyle ?? "normal",
    textDecoration: s.textDecoration ?? "none",
    fontFamily: s.fontFamily ? FONT_STACKS[s.fontFamily] : undefined,
    color: s.color ?? "#2a2622",
    textAlign: s.textAlign ?? "left",
    textIndent: `${s.textIndent ?? 0}px`,
    lineHeight: s.lineHeight && s.lineHeight > 0 ? String(s.lineHeight) : "1.4",
    letterSpacing: `${s.letterSpacing ?? 0}px`,
    textTransform: s.textTransform ?? "none",
    background: s.background ?? "transparent",
    borderRadius: s.borderRadius ?? 0,
    opacity: s.opacity ?? 1,
    padding: s.padding ?? 0,
    boxShadow: s.shadow ? "var(--shadow-page)" : undefined,
    listStyleType: s.listStyle && s.listStyle !== "none" ? s.listStyle : "none",
    "--marker-color": (block.content?.markerColor as string) || undefined,
    border:
      s.borderWidth && s.borderWidth > 0
        ? `${s.borderWidth}px solid ${s.borderColor ?? "#2a2622"}`
        : "none",
  };
}

/** CSS filter() string built from a picture block's filter params */
export function pictureFilter(content: Record<string, unknown>): string {
  const parts: string[] = [];
  const gray = Number(content.filterGrayscale ?? 0);
  const sepia = Number(content.filterSepia ?? 0);
  const blur = Number(content.filterBlur ?? 0);
  if (gray > 0) parts.push(`grayscale(${Math.min(100, gray)}%)`);
  if (sepia > 0) parts.push(`sepia(${Math.min(100, sepia)}%)`);
  if (blur > 0) parts.push(`blur(${Math.min(20, blur)}px)`);
  return parts.length ? parts.join(" ") : "none";
}

const ORDERED: ListStyle[] = ["decimal", "upper-roman", "lower-alpha"];

function textValue(
  block: Block,
  row: DataRow | undefined,
  preview: boolean,
  runtime?: RuntimeContext,
): string {
  const raw = String(block.content.text ?? "");
  return resolveTemplate(raw, row, { missingAsEmpty: preview, ctx: runtime });
}

export function BlockFrame(
  props: BlockViewProps & { children: ComponentChildren },
) {
  const {
    block,
    selected,
    preview,
    row,
    runtime,
    snapStep = null,
    scale = 1,
    onSelect,
    onContextMenu,
    onMoveResize,
    children,
  } = props;
  const [liveSize, setLiveSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const blockRef = useRef(block);
  blockRef.current = block;
  const gestureRef = useRef<{
    mode: "drag" | "resize";
    pointerId: number;
    ox: number;
    oy: number;
    x: number;
    y: number;
    w: number;
    h: number;
    handle?: ResizeHandle;
    moved: boolean;
  } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (!g || !onMoveResize) return;
      if (e.pointerId !== g.pointerId) return;
      const dx = (e.clientX - g.ox) / scale;
      const dy = (e.clientY - g.oy) / scale;
      if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      g.moved = true;
      e.preventDefault();

      if (g.mode === "resize" && g.handle) {
        let next = resizeFromHandle(
          { x: g.x, y: g.y, w: g.w, h: g.h },
          g.handle,
          dx,
          dy,
        );
        if (snapStep != null && snapStep > 1) {
          next = snapRect(next, snapStep);
        }
        setLiveSize({ w: next.w, h: next.h });
        onMoveResize(blockRef.current.id, next, "resize");
        return;
      }

      const step = snapStep != null && snapStep > 1 ? snapStep : null;
      onMoveResize(
        blockRef.current.id,
        applyMove({ x: g.x, y: g.y }, dx, dy, step),
        "drag",
      );
    };

    const onUp = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.pointerId) return;
      const wasClick = g.mode === "drag" && !g.moved;
      gestureRef.current = null;
      setLiveSize(null);
      try {
        frameRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      // Second click on a selected text block opens editing
      if (
        wasClick &&
        selected &&
        frameRef.current?.querySelector("textarea")
      ) {
        setEditing(true);
        queueMicrotask(() => {
          frameRef.current
            ?.querySelector<HTMLTextAreaElement>("textarea")
            ?.focus();
        });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [onMoveResize, snapStep, selected, scale]);

  if (!evaluateCondition(block.condition, row, runtime) && preview) {
    return null;
  }

  const beginDrag = (e: PointerEvent) => {
    if (preview || block.locked || !onMoveResize) return;
    if ((e.target as HTMLElement).closest(".resize-handle")) return;
    // Allow text editing interactions when already editing
    if (editing && (e.target as HTMLElement).closest("textarea, input")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onSelect(block.id, { toggle: e.shiftKey });
    props.onGestureStart?.();
    gestureRef.current = {
      mode: "drag",
      pointerId: e.pointerId,
      ox: e.clientX,
      oy: e.clientY,
      x: block.x,
      y: block.y,
      w: block.w,
      h: block.h,
      moved: false,
    };
    frameRef.current?.setPointerCapture(e.pointerId);
  };

  const beginResize = (handle: ResizeHandle) => (e: PointerEvent) => {
    if (preview || block.locked || !onMoveResize) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(block.id, { toggle: e.shiftKey });
    props.onGestureStart?.();
    gestureRef.current = {
      mode: "resize",
      pointerId: e.pointerId,
      ox: e.clientX,
      oy: e.clientY,
      x: block.x,
      y: block.y,
      w: block.w,
      h: block.h,
      handle,
      moved: true,
    };
    setLiveSize({ w: block.w, h: block.h });
    frameRef.current?.setPointerCapture(e.pointerId);
  };

  const className = [
    "block-frame",
    selected && !preview ? "block-frame--selected" : "",
    preview ? "block-frame--preview" : "",
    block.locked ? "block-frame--locked" : "",
    editing ? "block-frame--editing" : "",
    !preview && !block.locked ? "block-frame--movable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const commentCount = props.commentCount ?? 0;

  return (
    <div
      ref={frameRef}
      class={className}
      role="group"
      aria-label={`${block.name}, ${px(block.w)} by ${px(block.h)} pixels`}
      style={{
        left: `${px(block.x)}px`,
        top: `${px(block.y)}px`,
        width: `${px(block.w)}px`,
        height: `${px(block.h)}px`,
        zIndex: selected ? Math.max(block.zIndex ?? 1, 20) : (block.zIndex ?? 1),
      }}
      onPointerDown={beginDrag}
      onContextMenu={(e) => {
        if (preview) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect(block.id);
        onContextMenu?.(block.id, e);
      }}
      onDblClick={(e) => {
        if (preview || block.locked) return;
        e.stopPropagation();
        setEditing(true);
        onSelect(block.id);
        queueMicrotask(() => {
          frameRef.current
            ?.querySelector<HTMLTextAreaElement>("textarea")
            ?.focus();
        });
      }}
    >
      {commentCount > 0 && !preview && (
        <span class="block-comment-badge" title={`${commentCount} comment(s)`}>
          {commentCount}
        </span>
      )}
      {block.locked && !preview && (
        <span class="block-lock-badge" title="Locked">
          Locked
        </span>
      )}
      <div
        class={[
          "block-body",
          block.style.verticalAlign === "middle"
            ? "block-body--valign-middle"
            : block.style.verticalAlign === "bottom"
              ? "block-body--valign-bottom"
              : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={styleFromBlock(block)}
      >
        {children}
      </div>
      {selected && !preview && !block.locked &&
        HANDLES.map((h) => (
          <div
            key={h}
            class={`resize-handle resize-handle--${h}`}
            data-handle={h}
            onPointerDown={beginResize(h)}
          />
        ))}
      {selected && !preview && liveSize && (
        <div class="block-size-badge" aria-live="polite">
          {liveSize.w}×{liveSize.h}px
        </div>
      )}
    </div>
  );
}

export function ParagraphBlock(props: BlockViewProps) {
  const { block, preview, row, runtime, onChangeContent } = props;
  const value = textValue(block, row, preview, runtime);
  return (
    <BlockFrame {...props}>
      {preview ? (
        <div>{value}</div>
      ) : (
        <textarea
          value={String(block.content.text ?? "")}
          onInput={(e) =>
            onChangeContent?.(block.id, { text: e.currentTarget.value })
          }
          aria-label={`${block.name} text`}
          // Drag uses the frame; double-click enables editing (CSS pointer-events)
        />
      )}
    </BlockFrame>
  );
}

export function TextBlock(props: BlockViewProps) {
  return <ParagraphBlock {...props} />;
}

export function ListBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  const items = (block.content.items as string[]) ?? [];
  const style = ORDERED.includes(
    (block.style.listStyle ?? "disc") as ListStyle,
  )
    ? "ol"
    : "ul";
  const Tag = style as "ol" | "ul";
  return (
    <BlockFrame {...props}>
      <Tag
        class="block-list"
        start={Tag === "ol" ? Number(block.content.start ?? 1) : undefined}
      >
        {items.map((item, i) => (
          <li key={i}>
            {resolveTemplate(item, row, {
              missingAsEmpty: preview,
              ctx: runtime,
            })}
          </li>
        ))}
      </Tag>
    </BlockFrame>
  );
}

export function PictureBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  const src = resolveTemplate(String(block.content.src ?? ""), row, {
    missingAsEmpty: preview,
    ctx: runtime,
  });
  const alt = resolveTemplate(String(block.content.alt ?? "Picture"), row, {
    missingAsEmpty: preview,
    ctx: runtime,
  });
  const fit = (["cover", "contain", "fill"] as const).includes(
    block.content.fit as never,
  )
    ? (block.content.fit as "cover" | "contain" | "fill")
    : "cover";
  return (
    <BlockFrame {...props}>
      <div class="block-picture">
        {src ? (
          <img
            src={src}
            alt={alt}
            style={{ objectFit: fit, filter: pictureFilter(block.content) }}
          />
        ) : (
          <span>No image URL</span>
        )}
      </div>
    </BlockFrame>
  );
}

export function ShapeBlock(props: BlockViewProps) {
  const { block } = props;
  const variant =
    (block.content.variant as string) ??
    (block.content.shape as string) ??
    "rect";
  if (variant === "line") {
    return (
      <BlockFrame {...props}>
        <div class="block-shape block-shape--line">
          <div
            class="block-shape__rule"
            style={{
              borderTopWidth: `${Math.max(1, block.style.borderWidth ?? 2)}px`,
              borderTopColor: block.style.borderColor ?? "#2a2622",
            }}
          />
        </div>
      </BlockFrame>
    );
  }
  return (
    <BlockFrame {...props}>
      <div
        class={
          variant === "ellipse"
            ? "block-shape block-shape--ellipse"
            : "block-shape"
        }
      >
        <div
          class="block-shape__rect"
          style={{
            background: block.style.background ?? "#e3ddd3",
            border:
              (block.style.borderWidth ?? 0) > 0
                ? `${block.style.borderWidth}px solid ${block.style.borderColor ?? "#2a2622"}`
                : undefined,
          }}
        />
      </div>
    </BlockFrame>
  );
}

export function TableBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  const cells = (block.content.cells as string[][]) ?? [];
  const header = Boolean(block.content.header);
  const sourcePath = String(block.content.sourcePath ?? "").trim();

  const zebra = Boolean(block.content.zebra);
  const cellPad = Number(block.content.cellPadding ?? 6);
  const headerBg = String(block.content.headerBackground ?? "");

  let dataRows: Record<string, unknown>[] = [];
  if (sourcePath) {
    try {
      dataRows = resolveItemsPath(sourcePath, row, runtime).flatMap((it) =>
        it && typeof it === "object" && !Array.isArray(it)
          ? [it as Record<string, unknown>]
          : [],
      );
    } catch {
      dataRows = [];
    }
  }

  return (
    <BlockFrame {...props}>
      <table
        class={zebra ? "block-table block-table--zebra" : "block-table"}
        style={{ "--cell-pad": `${cellPad}px` }}
      >
        {header && (
          <thead>
            <tr>
              {(cells[0] ?? []).map((cell, ci) => (
                <th key={ci} style={headerBg ? { background: headerBg } : undefined}>
                  {resolveTemplate(cell, row, {
                    missingAsEmpty: preview,
                    ctx: runtime,
                  })}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {(sourcePath && dataRows.length
            ? dataRows.map((r) =>
                (cells[0] ?? []).map((_, ci) => String(r[Object.keys(r)[ci] ?? ci] ?? "")),
              )
            : cells.slice(header ? 1 : 0)
          ).map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td key={ci}>
                  {resolveTemplate(String(cell), row, {
                    missingAsEmpty: preview,
                    ctx: runtime,
                  })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </BlockFrame>
  );
}

export function FilesBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  return (
    <BlockFrame {...props}>
      <div class="block-files">
        {resolveTemplate(String(block.content.label ?? "Files"), row, {
          missingAsEmpty: preview,
          ctx: runtime,
        })}{" "}
        ({Number(block.content.count ?? 0)})
      </div>
    </BlockFrame>
  );
}

export function PrebuildBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  return (
    <BlockFrame {...props}>
      <div class="block-prebuild">
        {resolveTemplate(
          String(block.content.text ?? "Use Prebuild tool to expand recipes"),
          row,
          { missingAsEmpty: preview, ctx: runtime },
        )}
      </div>
    </BlockFrame>
  );
}

export function GroupBlock(props: BlockViewProps) {
  const { block, preview } = props;
  const itemsPath = String(block.content.itemsPath ?? "").trim();
  const children = Array.isArray(block.content.blocks)
    ? (block.content.blocks as Block[])
    : [];
  const repeating = Boolean(itemsPath) || block.type === "repeat";

  return (
    <BlockFrame {...props}>
      <div class={repeating ? "block-group block-group--repeat" : "block-group"}>
        <div class="block-group__badge">
          {repeating
            ? `Group · repeat ${itemsPath || "line_items"}`
            : `Group · ${children.length} item(s)`}
          {preview && repeating ? " (expanded)" : ""}
        </div>
        {!preview && (
          <div class="block-group__proto">
            {children.map((child) => (
              <div
                key={child.id}
                class="block-group__child"
                style={{
                  left: `${child.x}px`,
                  top: `${child.y}px`,
                  width: `${child.w}px`,
                  height: `${child.h}px`,
                }}
              >
                {String(
                  (child.content as { text?: string }).text ?? child.name,
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BlockFrame>
  );
}

export function RepeatBlock(props: BlockViewProps) {
  return <GroupBlock {...props} />;
}

const RENDERERS: Record<BlockType, (props: BlockViewProps) => VNode> = {
  paragraph: ParagraphBlock,
  text: TextBlock,
  list: ListBlock,
  picture: PictureBlock,
  shape: ShapeBlock,
  table: TableBlock,
  files: FilesBlock,
  prebuild: PrebuildBlock,
  group: GroupBlock,
  repeat: RepeatBlock,
};

export function renderBlock(props: BlockViewProps) {
  const Renderer = RENDERERS[props.block.type];
  return <Renderer key={props.block.id} {...props} />;
}
