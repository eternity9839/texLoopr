import type { ComponentChildren, VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Block, BlockType } from "../../../model/document";
import {
  resolveTemplate,
  evaluateCondition,
  type DataRow,
} from "../../../model/bindings";
import type { RuntimeContext } from "../../../model/expr";
import {
  applyMove,
  px,
  resizeFromHandle,
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
  onSelect: (id: string, opts?: { toggle?: boolean }) => void;
  onContextMenu?: (id: string, e: MouseEvent) => void;
  onChangeContent?: (id: string, content: Record<string, unknown>) => void;
  onGestureStart?: () => void;
  onMoveResize?: (
    id: string,
    patch: Partial<Pick<Block, "x" | "y" | "w" | "h">>,
  ) => void;
}

const HANDLES: ResizeHandle[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
const DRAG_THRESHOLD = 3;

function styleFromBlock(block: Block): Record<string, string | number> {
  return {
    fontSize: block.style.fontSize ?? 14,
    fontWeight: block.style.fontWeight ?? 400,
    fontStyle: block.style.fontStyle ?? "normal",
    textDecoration: block.style.textDecoration ?? "none",
    color: block.style.color ?? "#2a2622",
    textAlign: block.style.textAlign ?? "left",
    background: block.style.background ?? "transparent",
    borderRadius: block.style.borderRadius ?? 0,
    opacity: block.style.opacity ?? 1,
    padding: block.style.padding ?? 0,
    border:
      block.style.borderWidth && block.style.borderWidth > 0
        ? `${block.style.borderWidth}px solid ${block.style.borderColor ?? "#2a2622"}`
        : "none",
  };
}

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
      const dx = e.clientX - g.ox;
      const dy = e.clientY - g.oy;
      if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      g.moved = true;
      e.preventDefault();

      if (g.mode === "resize" && g.handle) {
        const next = resizeFromHandle(
          { x: g.x, y: g.y, w: g.w, h: g.h },
          g.handle,
          dx,
          dy,
        );
        setLiveSize({ w: next.w, h: next.h });
        onMoveResize(blockRef.current.id, next);
        return;
      }

      const step = snapStep != null && snapStep > 1 ? snapStep : null;
      onMoveResize(
        blockRef.current.id,
        applyMove({ x: g.x, y: g.y }, dx, dy, step),
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
  }, [onMoveResize, snapStep, selected]);

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
      <div class="block-body" style={styleFromBlock(block)}>
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
  return (
    <BlockFrame {...props}>
      <ul class="block-list">
        {items.map((item, i) => (
          <li key={i}>
            {resolveTemplate(item, row, {
              missingAsEmpty: preview,
              ctx: runtime,
            })}
          </li>
        ))}
      </ul>
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
  return (
    <BlockFrame {...props}>
      <div class="block-picture">
        {src ? <img src={src} alt={alt} /> : <span>No image URL</span>}
      </div>
    </BlockFrame>
  );
}

export function ShapeBlock(props: BlockViewProps) {
  return (
    <BlockFrame {...props}>
      <div class="block-shape">
        <div class="block-shape__rect" />
      </div>
    </BlockFrame>
  );
}

export function TableBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  const cells = (block.content.cells as string[][]) ?? [];
  return (
    <BlockFrame {...props}>
      <table class="block-table">
        <tbody>
          {cells.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td key={ci}>
                  {resolveTemplate(cell, row, {
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
