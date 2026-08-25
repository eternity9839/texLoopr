import type { ComponentChildren, VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Block, BlockType, ListStyle } from "../../../model/document";
import { computeFlexRects } from "../../../model/flex";
import {
  FONT_STACKS,
  cssTransformFromStyle,
} from "../../../model/document";
import {
  resolveTemplate,
  evaluateCondition,
  type DataRow,
} from "../../../model/bindings";
import type { RuntimeContext } from "../../../model/expr";
import {
  dataFieldLabel,
  normalizeDataFieldPath,
  resolveDataField,
} from "../../../model/dataField";
import {
  mapTableItemToCells,
  resolveTableSourceRows,
  tableColumnTemplates,
} from "../../../model/tableData";
import {
  applyMove,
  px,
  resizeFromHandle,
  resolvePinnedRect,
  pinIsActive,
  snapRect,
  type ResizeHandle,
} from "../../../model/geometry";
import { effectiveZ } from "../../../model/layerStack";
import {
  bindingPreviewLabel,
  hasMergeBinding,
  resolveBindingPreview,
} from "../../../model/bindingPreview";
import {
  linkEditLabel,
  parseLinkHook,
  resolveLinkTarget,
  LINK_HOOK_LABEL,
} from "../../../model/linkHook";
import { BindingPreview } from "../BindingPreview";
import { RichText } from "../../../model/richText";
import { onTextExpansionKeyDown } from "../textExpansionField";
import {
  activePage,
  dataRows,
  prefs,
  project,
  selection,
  setGroupIsolation,
} from "../../../state/store";
import { findBlockAncestors } from "../../../model/outlineTree";
import { canvasSizeForSession } from "../../../model/canvasView";

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
  // Flex groups use padding as layout inset in computeFlexRects — skip CSS
  // padding on the body to avoid double inset.
  const cssPadding =
    s.layout === "flex" ? 0 : (s.padding ?? 0);
  const radius = s.borderRadius ?? 0;
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
    borderRadius: radius,
    // Clip fills to rounded / circular corners (badges, pills, …)
    overflow: radius > 0 ? "hidden" : undefined,
    opacity: s.opacity ?? 1,
    padding: cssPadding,
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
    if (preview) return;
    e.stopPropagation();
    if (block.locked || !onMoveResize) return;
    // Edge-pinned blocks stay glued — unpin in Design to drag freely
    if (pinIsActive(block.pin)) return;
    if ((e.target as HTMLElement).closest(".resize-handle")) return;
    // Allow text editing interactions when already editing
    if (editing && (e.target as HTMLElement).closest("textarea, input")) {
      return;
    }
    e.preventDefault();
    onSelect(block.id, {
      toggle: e.shiftKey || e.ctrlKey || e.metaKey,
    });
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
    onSelect(block.id, {
      toggle: e.shiftKey || e.ctrlKey || e.metaKey,
    });
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
  const frameTransform = cssTransformFromStyle(block.style);
  const page = activePage.value;
  const sessionSize = canvasSizeForSession(project.value, prefs.value);
  const layout = resolvePinnedRect(
    block,
    page?.margins,
    sessionSize.w,
    sessionSize.h,
  );
  const pinned = pinIsActive(block.pin);

  return (
    <div
      ref={frameRef}
      class={[
        className,
        pinned ? "block-frame--pinned" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={`${block.name}, ${px(layout.w)} by ${px(layout.h)} pixels`}
      style={{
        left: `${px(layout.x)}px`,
        top: `${px(layout.y)}px`,
        width: `${px(layout.w)}px`,
        height: `${px(layout.h)}px`,
        margin: block.style.margin ? `${block.style.margin}px` : undefined,
        zIndex: effectiveZ(block),
        transform: frameTransform || undefined,
        transformOrigin: "center center",
      }}
      onPointerDown={beginDrag}
      onClick={(e) => {
        e.stopPropagation();
      }}
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
      {pinned && !preview && !block.locked && (
        <span class="block-pin-badge" title="Pinned to surface edge">
          Pin
        </span>
      )}
      <div
        class={[
          "block-body",
          block.type === "picture" || block.type === "shape"
            ? "block-body--clip"
            : "",
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
        <div class="block-paragraph-preview">
          <RichText text={value} />
        </div>
      ) : (
        <textarea
          value={String(block.content.text ?? "")}
          onInput={(e) =>
            onChangeContent?.(block.id, { text: e.currentTarget.value })
          }
          onKeyDown={(e) =>
            onTextExpansionKeyDown(e, (text, cursor) => {
              onChangeContent?.(block.id, { text });
              queueMicrotask(() => {
                e.currentTarget.setSelectionRange(cursor, cursor);
              });
            })
          }
          aria-label={`${block.name} text`}
        />
      )}
    </BlockFrame>
  );
}

export function TextBlock(props: BlockViewProps) {
  return <ParagraphBlock {...props} />;
}

export function DataBlock(props: BlockViewProps) {
  const { block, preview, row, runtime, selected, onChangeContent } = props;
  const path = String(block.content.path ?? "");
  const label = dataFieldLabel(path);
  const [editing, setEditing] = useState(false);
  const firstRow = dataRows.value[0];

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  const previewValue = normalizeDataFieldPath(path)
    ? firstRow
      ? resolveDataField(path, firstRow, runtime)
      : null
    : null;

  if (preview) {
    const value = resolveDataField(path, row, runtime);
    return (
      <BlockFrame {...props}>
        <span class="block-data block-data--resolved">{value || label}</span>
      </BlockFrame>
    );
  }

  return (
    <BlockFrame {...props}>
      <BindingPreview
        class="block-data-wrap binding-preview--data"
        chipClass="block-data"
        label={label}
        previewValue={
          previewValue ??
          (normalizeDataFieldPath(path) && !firstRow ? "No data rows loaded" : null)
        }
        editing={selected && editing}
        ariaLabel={`${block.name} field path`}
        onActivate={() => setEditing(true)}
        editSlot={
          <input
            class="block-data__input"
            value={path}
            aria-label={`${block.name} field path`}
            onInput={(e) =>
              onChangeContent?.(block.id, { path: e.currentTarget.value })
            }
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                setEditing(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        }
      />
    </BlockFrame>
  );
}

export function LinkBlock(props: BlockViewProps) {
  const { block, preview, row, runtime, selected, onChangeContent } = props;
  const hook = parseLinkHook(block.content.hook);
  const target = String(block.content.target ?? "");
  const customLabel = String(block.content.label ?? "");
  const [editing, setEditing] = useState(false);
  const firstRow = dataRows.value[0];

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  const editLabel = linkEditLabel(hook, target, customLabel);
  const resolvedHref = resolveLinkTarget(hook, target, preview ? row : firstRow, runtime);
  const previewText =
    resolvedHref ||
    (hasMergeBinding(target) && !firstRow ? "No data rows loaded" : null);

  if (preview) {
    const href = resolveLinkTarget(hook, target, row, runtime);
    const text = resolveTemplate(customLabel || editLabel, row, {
      missingAsEmpty: true,
      ctx: runtime,
    });
    return (
      <BlockFrame {...props}>
        {href ? (
          <a class="block-link block-link--resolved" href={href}>
            {text || href}
          </a>
        ) : (
          <span class="block-link block-link--missing">{text || editLabel}</span>
        )}
      </BlockFrame>
    );
  }

  return (
    <BlockFrame {...props}>
      <BindingPreview
        class="block-link-wrap binding-preview--link"
        chipClass="block-link"
        label={`${LINK_HOOK_LABEL[hook]} · ${editLabel}`}
        previewValue={previewText}
        editing={selected && editing}
        ariaLabel={`${block.name} link target`}
        onActivate={() => setEditing(true)}
        editSlot={
          <input
            class="block-link__input"
            value={target}
            aria-label={`${block.name} link target`}
            onInput={(e) =>
              onChangeContent?.(block.id, { target: e.currentTarget.value })
            }
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                setEditing(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        }
      />
    </BlockFrame>
  );
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
            <RichText
              text={resolveTemplate(item, row, {
                missingAsEmpty: preview,
                ctx: runtime,
              })}
            />
          </li>
        ))}
      </Tag>
    </BlockFrame>
  );
}

export function PictureBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  const rawSrc = String(block.content.src ?? "");
  const src = resolveTemplate(rawSrc, row, {
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
    : "contain";
  const pos = String(block.content.objectPosition ?? "center");
  const firstRow = dataRows.value[0];
  const bindingEdit =
    !preview && (hasMergeBinding(rawSrc) || (!rawSrc.trim() && hasMergeBinding(String(block.content.alt ?? ""))));

  if (bindingEdit) {
    const previewUrl = resolveBindingPreview(rawSrc, firstRow, runtime);
    const chipLabel = bindingPreviewLabel(rawSrc || String(block.content.alt ?? "image"));
    return (
      <BlockFrame {...props}>
        <div class="block-picture block-picture--binding">
          <BindingPreview
            class="binding-preview--media"
            chipClass="block-picture__chip"
            label={chipLabel}
            previewValue={previewUrl ?? (!firstRow ? "No data rows loaded" : null)}
            media={
              previewUrl && !previewUrl.startsWith("(") ? (
                <img
                  class="binding-preview__thumb"
                  src={previewUrl}
                  alt=""
                />
              ) : undefined
            }
            ariaLabel={`${block.name} image URL`}
          />
        </div>
      </BlockFrame>
    );
  }

  return (
    <BlockFrame {...props}>
      <div class="block-picture">
        {src ? (
          <img
            src={src}
            alt={alt}
            style={{
              objectFit: fit,
              objectPosition: pos,
              filter: pictureFilter(block.content),
            }}
          />
        ) : (
          <span>No image — set URL or upload</span>
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
  const filled = Boolean(block.content.filled);
  const bg =
    filled ||
    (block.style.background && block.style.background !== "transparent")
      ? (block.style.background ?? "#e3ddd3")
      : "transparent";
  const strokeW = block.style.borderWidth ?? (filled ? 0 : 1.5);
  const radius = Number(block.style.borderRadius ?? 0);
  const roundClass =
    variant === "ellipse" || variant === "circle"
      ? "block-shape--ellipse"
      : variant === "triangle"
        ? "block-shape--triangle"
        : variant === "diamond"
          ? "block-shape--diamond"
          : variant === "rounded"
            ? "block-shape--rounded"
            : "";
  // Circle / ellipse always fully round; rounded defaults to 16px if unset;
  // rect uses the Radius control (high value on a square → circle).
  const corner =
    variant === "ellipse" || variant === "circle"
      ? "50%"
      : variant === "rounded"
        ? `${radius > 0 ? radius : 16}px`
        : variant === "triangle" || variant === "diamond"
          ? undefined
          : `${radius}px`;

  return (
    <BlockFrame {...props}>
      <div class={["block-shape", roundClass].filter(Boolean).join(" ")}>
        <div
          class="block-shape__rect"
          style={{
            background: bg,
            borderRadius: corner,
            border:
              strokeW > 0
                ? `${strokeW}px solid ${block.style.borderColor ?? "#2a2622"}`
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
  const datasetName = String(block.content.datasetName ?? "").trim();
  const sourcePath = String(block.content.sourcePath ?? "").trim();
  const bound = Boolean(datasetName || sourcePath);

  const zebra = Boolean(block.content.zebra);
  const cellPad = Number(block.content.cellPadding ?? 6);
  const headerBg = String(block.content.headerBackground ?? "");
  const showBorders = block.content.showBorders !== false;
  const borderColor = String(block.content.borderColor ?? "#cfc8bc");

  const dataRows = bound
    ? resolveTableSourceRows(
        {
          datasetName,
          sourcePath,
          header,
          cells,
        },
        row,
        runtime,
      )
    : [];
  const templates = bound ? tableColumnTemplates(cells, header) : [];
  const bodyRows = bound
    ? dataRows.map((r) => mapTableItemToCells(r, templates, preview, runtime))
    : cells.slice(header ? 1 : 0);

  return (
    <BlockFrame {...props}>
      <table
        class={[
          "block-table",
          zebra ? "block-table--zebra" : "",
          showBorders ? "" : "block-table--borderless",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          "--cell-pad": `${cellPad}px`,
          "--table-border": borderColor,
        }}
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
          {bodyRows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td key={ci}>
                  {bound
                    ? String(cell)
                    : resolveTemplate(String(cell), row, {
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
  const fileName = String(block.content.fileName ?? "");
  const fileSize = Number(block.content.fileSize ?? 0);
  const dataUrl = String(block.content.dataUrl ?? "");
  const label = resolveTemplate(String(block.content.label ?? "Attachment"), row, {
    missingAsEmpty: preview,
    ctx: runtime,
  });
  return (
    <BlockFrame {...props}>
      <div class="block-files">
        {dataUrl && fileName ? (
          <a
            class="block-files__link"
            href={dataUrl}
            download={fileName}
            onClick={(e) => e.stopPropagation()}
          >
            {label || fileName}
            {fileSize > 0 ? ` · ${(fileSize / 1024).toFixed(0)} KB` : ""}
          </a>
        ) : (
          <span>
            {label}
            {Number(block.content.count ?? 0) > 0
              ? ` (${Number(block.content.count)})`
              : " — no file"}
          </span>
        )}
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
  const nests = preview && !repeating;
  const flexRects = computeFlexRects(block);
  const page = activePage.value;
  const sel = selection.value;
  const isolationId = prefs.value.groupIsolationId;
  const isolated = isolationId === block.id;
  const selectedInside =
    sel?.kind === "block" &&
    page &&
    findBlockAncestors(page.blocks, sel.id).some((a) => a.id === block.id);
  const drillIn = !preview && (isolated || selectedInside) && !repeating;

  return (
    <BlockFrame
      {...props}
      block={{
        ...block,
        style: {
          ...block.style,
          ...(isolated
            ? { borderColor: "#0f6b63", borderWidth: 2 }
            : {}),
        },
      }}
    >
      <div
        class={[
          repeating ? "block-group block-group--repeat" : "block-group",
          drillIn ? "block-group--drill" : "",
          isolated ? "block-group--isolated" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onDblClick={(e) => {
          if (preview || repeating) return;
          e.stopPropagation();
          setGroupIsolation(block.id);
        }}
      >
        {!nests && !drillIn && (
          <div class="block-group__badge">
            {repeating
              ? `Group · repeat ${itemsPath || "line_items"}`
              : `Group · ${children.length} item(s) — double-click to isolate`}
            {preview && repeating ? " (expanded)" : ""}
          </div>
        )}
        {drillIn &&
          children.map((child) => {
            const r = flexRects.get(child.id);
            const placed: Block = {
              ...child,
              x: r?.x ?? child.x,
              y: r?.y ?? child.y,
              w: r?.w ?? child.w,
              h: r?.h ?? child.h,
            };
            return (
              <div
                key={child.id}
                class="block-group__nested"
                style={{
                  position: "absolute",
                  left: `${px(placed.x)}px`,
                  top: `${px(placed.y)}px`,
                  width: `${px(placed.w)}px`,
                  height: `${px(placed.h)}px`,
                }}
              >
                {renderBlock({
                  ...props,
                  block: placed,
                  selected: sel?.kind === "block" && sel.id === child.id,
                })}
              </div>
            );
          })}
        {!preview &&
          !drillIn &&
          children.map((child) => {
            const r = flexRects.get(child.id);
            return (
              <div
                key={child.id}
                class="block-group__child"
                style={{
                  left: `${px(r?.x ?? child.x)}px`,
                  top: `${px(r?.y ?? child.y)}px`,
                  width: `${px(r?.w ?? child.w)}px`,
                  height: `${px(r?.h ?? child.h)}px`,
                }}
              >
                {String(
                  (child.content as { text?: string }).text ?? child.name,
                )}
              </div>
            );
          })}
        {nests &&
          children.map((child) => {
            const r = flexRects.get(child.id);
            const placed: Block = r
              ? { ...child, x: r.x, y: r.y, w: r.w, h: r.h }
              : child;
            return (
              <GroupChildView key={child.id} {...props} block={placed} />
            );
          })}
      </div>
    </BlockFrame>
  );
}

/** Nested static rendering of a group's child inside preview */
function GroupChildView(props: BlockViewProps) {
  const vnode = renderBlock({
    ...props,
    selected: false,
    commentCount: 0,
  });
  return vnode;
}

export function RepeatBlock(props: BlockViewProps) {
  return <GroupBlock {...props} />;
}

const RENDERERS: Record<BlockType, (props: BlockViewProps) => VNode> = {
  paragraph: ParagraphBlock,
  text: TextBlock,
  data: DataBlock,
  link: LinkBlock,
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
