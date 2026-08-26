import type { ComponentChildren, VNode } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import { BlockEditContext } from "../BlockEditContext";
import type { Block, BlockType, ListStyle } from "../../../model/document";
import { computeFlexRects } from "../../../model/flex";
import {
  FONT_STACKS,
  cssTransformFromStyle,
} from "../../../model/document";
import {
  resolveTemplate,
  blockMeetsCondition,
  type DataRow,
} from "../../../model/bindings";
import type { RuntimeContext } from "../../../model/expr";
import { resolveDateBlockText } from "../../../model/dateBlock";
import { parseQrEcc, qrDataUrl } from "../../../model/qrCode";
import {
  dataFieldLabel,
  normalizeDataFieldPath,
  resolveDataField,
} from "../../../model/dataField";
import {
  fieldKeyFromHeader,
  isLiteralColumnTemplate,
  mapTableItemToCells,
  resolveTableSourceRows,
  tableColumnTemplates,
} from "../../../model/tableData";
import {
  resolveListItems,
  type ListItemNode,
} from "../../../model/listData";
import { parseMergeSegments } from "../../../model/mergeSegments";
import { noteIssue } from "../../../state/issueLog";
import {
  estimateTableHeight,
  parseTableHeightMode,
} from "../../../model/tableLayout";
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
import { MergeAwareText } from "../MergeAwareText";
import { RichText } from "../../../model/richText";
import {
  activePage,
  dataRows,
  prefs,
  project,
  selection,
  setGroupIsolation,
  updateBlock,
} from "../../../state/store";
import {
  ensureReadableInk,
  isDarkFill,
  isLightInk,
  isOpaqueFill,
  resolveEditBackdrop,
} from "../../../model/contrast";
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
  onChipContextMenu?: (id: string, mergePath: string, e: MouseEvent) => void;
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
  opts?: {
    preview?: boolean;
    contrastAssist?: boolean;
    backdrop?: string;
  },
): Record<string, string | number | undefined> {
  const s = block.style;
  // Flex groups use padding as layout inset in computeFlexRects — skip CSS
  // padding on the body to avoid double inset.
  const cssPadding =
    s.layout === "flex" ? 0 : (s.padding ?? 0);
  const radius = s.borderRadius ?? 0;
  let color = s.color ?? "#2a2622";
  const background = s.background ?? "transparent";
  const assist = Boolean(opts?.contrastAssist) && !opts?.preview;
  const backdrop = opts?.backdrop ?? background;

  if (assist) {
    color = ensureReadableInk(color, backdrop);
    // Light ink on light transparent frames — force body ink (not on dark rails).
    if (
      isLightInk(s.color ?? "#2a2622") &&
      !isOpaqueFill(background) &&
      !isDarkFill(backdrop)
    ) {
      color = "var(--ink)";
    }
  }

  return {
    fontSize: s.fontSize ?? 14,
    fontWeight: s.fontWeight ?? 400,
    fontStyle: s.fontStyle ?? "normal",
    textDecoration: s.textDecoration ?? "none",
    fontFamily: s.fontFamily ? FONT_STACKS[s.fontFamily] : undefined,
    color,
    textAlign: s.textAlign ?? "left",
    textIndent: `${s.textIndent ?? 0}px`,
    lineHeight: s.lineHeight && s.lineHeight > 0 ? String(s.lineHeight) : "1.4",
    letterSpacing: `${s.letterSpacing ?? 0}px`,
    textTransform: s.textTransform ?? "none",
    whiteSpace: s.whiteSpace ?? "pre-wrap",
    background,
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
  return resolveTemplate(raw, row, {
    missingAsEmpty: preview,
    ctx: runtime,
    diagnose: preview,
  });
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
      if (!g.moved) {
        g.moved = true;
        // Defer preventDefault until real drag so dblclick still fires.
        e.preventDefault();
      }
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
      // Second click (or after merge chips mount a field) opens editing
      if (wasClick && selected && frameRef.current) {
        const editable = frameRef.current.querySelector(
          "textarea, input, .merge-aware-text, .binding-preview",
        );
        if (editable) {
          setEditing(true);
          queueMicrotask(() => {
            frameRef.current
              ?.querySelector<HTMLTextAreaElement | HTMLInputElement>(
                "textarea, input",
              )
              ?.focus();
          });
        }
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

  const meetsCondition = blockMeetsCondition(block, row, runtime, {
    preview: Boolean(preview),
  });
  const ghostInactive =
    !meetsCondition &&
    !preview &&
    prefs.value.showInactiveBranches === true;
  if (!meetsCondition && !ghostInactive) {
    return null;
  }

  const beginDrag = (e: PointerEvent) => {
    if (preview) return;
    e.stopPropagation();
    if (ghostInactive) {
      onSelect(block.id, {
        toggle: e.shiftKey || e.ctrlKey || e.metaKey,
      });
      return;
    }
    if (block.locked || !onMoveResize) return;
    // Edge-pinned blocks stay glued — unpin in Design to drag freely
    if (pinIsActive(block.pin)) return;
    if ((e.target as HTMLElement).closest(".resize-handle")) return;
    // Allow text editing interactions when already editing
    if (editing && (e.target as HTMLElement).closest("textarea, input")) {
      return;
    }
    // Do not preventDefault here — it cancels the dblclick sequence.
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
    !preview && !block.locked && !ghostInactive ? "block-frame--movable" : "",
    ghostInactive ? "block-frame--inactive" : "",
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
  const contrastAssist =
    !preview && prefs.value.editContrastAssist !== false;
  const backdrop = contrastAssist
    ? resolveEditBackdrop(
        block,
        page?.blocks ?? [],
        page?.background ?? "#ffffff",
      )
    : (block.style.background ?? "transparent");
  const darkFillAssist = contrastAssist && isDarkFill(backdrop);


  return (
    <BlockEditContext.Provider
      value={{
        editing,
        requestEdit: () => setEditing(true),
        endEdit: () => setEditing(false),
      }}
    >
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
              ?.querySelector<HTMLTextAreaElement | HTMLInputElement>(
                "textarea, input",
              )
              ?.focus();
          });
        }}
      >
        {ghostInactive && (
          <span
            class="block-inactive-badge"
            title={block.condition ?? "Hidden by condition"}
          >
            Hidden
          </span>
        )}
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
            darkFillAssist ? "block-body--dark-fill" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={styleFromBlock(block, {
            preview,
            contrastAssist,
            backdrop,
          })}
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
    </BlockEditContext.Provider>
  );
}

export function ParagraphBlock(props: BlockViewProps) {
  const { block, preview, row, runtime, selected, onChangeContent, onChipContextMenu } = props;
  const value = textValue(block, row, preview, runtime);
  return (
    <BlockFrame {...props}>
      {preview ? (
        <div class="block-paragraph-preview">
          <RichText text={value} />
        </div>
      ) : (
        <MergeAwareText
          text={String(block.content.text ?? "")}
          blockId={block.id}
          blockName={block.name}
          row={row}
          runtime={runtime}
          selected={selected}
          onChangeContent={onChangeContent}
          onChipContextMenu={(path, e) => onChipContextMenu?.(block.id, path, e)}
        />
      )}
    </BlockFrame>
  );
}

export function TextBlock(props: BlockViewProps) {
  return <ParagraphBlock {...props} />;
}

export function DataBlock(props: BlockViewProps) {
  const { block, preview, row, runtime, selected, onChangeContent, onChipContextMenu } = props;
  const path = String(block.content.path ?? "");
  const label = dataFieldLabel(path);
  const frameEdit = useContext(BlockEditContext);
  const [editing, setEditing] = useState(false);
  const firstRow = dataRows.value[0];

  useEffect(() => {
    if (!selected) {
      setEditing(false);
      frameEdit?.endEdit();
    }
  }, [selected]);

  useEffect(() => {
    if (frameEdit?.editing) setEditing(true);
  }, [frameEdit?.editing]);

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
        editing={selected && (editing || Boolean(frameEdit?.editing))}
        ariaLabel={`${block.name} field path`}
        onActivate={() => {
          setEditing(true);
          frameEdit?.requestEdit();
        }}
        onChipContextMenu={(e) => onChipContextMenu?.(block.id, path, e)}
        editSlot={
          <input
            class="block-data__input"
            value={path}
            aria-label={`${block.name} field path`}
            onInput={(e) =>
              onChangeContent?.(block.id, { path: e.currentTarget.value })
            }
            onBlur={() => {
              setEditing(false);
              frameEdit?.endEdit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                setEditing(false);
                frameEdit?.endEdit();
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
  const frameEdit = useContext(BlockEditContext);
  const [editing, setEditing] = useState(false);
  const firstRow = dataRows.value[0];

  useEffect(() => {
    if (!selected) {
      setEditing(false);
      frameEdit?.endEdit();
    }
  }, [selected]);

  useEffect(() => {
    if (frameEdit?.editing) setEditing(true);
  }, [frameEdit?.editing]);

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
        editing={selected && (editing || Boolean(frameEdit?.editing))}
        ariaLabel={`${block.name} link target`}
        onActivate={() => {
          setEditing(true);
          frameEdit?.requestEdit();
        }}
        editSlot={
          <input
            class="block-link__input"
            value={target}
            aria-label={`${block.name} link target`}
            onInput={(e) =>
              onChangeContent?.(block.id, { target: e.currentTarget.value })
            }
            onBlur={() => {
              setEditing(false);
              frameEdit?.endEdit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                setEditing(false);
                frameEdit?.endEdit();
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
  const { block, preview, row, runtime, selected, onChangeContent, onChipContextMenu } = props;
  const nodes = resolveListItems(block.content, row, runtime);
  const style = ORDERED.includes(
    (block.style.listStyle ?? "disc") as ListStyle,
  )
    ? "ol"
    : "ul";
  const Tag = style as "ol" | "ul";

  const renderNodes = (items: ListItemNode[], path: number[] = []) => (
    <Tag
      class="block-list"
      start={
        Tag === "ol" && path.length === 0
          ? Number(block.content.start ?? 1)
          : undefined
      }
    >
      {items.map((item, i) => {
        const key = [...path, i].join(".");
        return (
          <li key={key}>
            {preview ? (
              <RichText
                text={resolveTemplate(item.text, row, {
                  missingAsEmpty: true,
                  ctx: runtime,
                })}
              />
            ) : (
              <MergeAwareText
                text={item.text}
                blockId={block.id}
                blockName={`${block.name} item ${key}`}
                row={row}
                runtime={runtime}
                selected={selected}
                onChangeContent={(_id, content) => {
                  const next = structuredClone(nodes) as ListItemNode[];
                  let cursor: ListItemNode[] = next;
                  for (let d = 0; d < path.length; d++) {
                    cursor = cursor[path[d]!]!.children!;
                  }
                  cursor[i] = {
                    ...cursor[i]!,
                    text: String(content.text ?? ""),
                  };
                  onChangeContent?.(block.id, { items: next });
                }}
                onChipContextMenu={(p, e) => onChipContextMenu?.(block.id, p, e)}
              />
            )}
            {item.children?.length
              ? renderNodes(item.children, [...path, i])
              : null}
          </li>
        );
      })}
    </Tag>
  );

  return <BlockFrame {...props}>{renderNodes(nodes)}</BlockFrame>;
}

export function PictureBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  const rawSrc = String(block.content.src ?? "");
  const src = resolveTemplate(rawSrc, row, {
    missingAsEmpty: preview,
    ctx: runtime,
    diagnose: preview,
  });
  const alt = resolveTemplate(String(block.content.alt ?? "Picture"), row, {
    missingAsEmpty: preview,
    ctx: runtime,
    diagnose: preview,
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
  const { block, preview, row, runtime, selected, onChangeContent, onChipContextMenu } = props;
  const cells = (block.content.cells as string[][]) ?? [];
  const header = Boolean(block.content.header);
  const datasetName = String(block.content.datasetName ?? "").trim();
  const sourcePath = String(block.content.sourcePath ?? "").trim();
  const bound = Boolean(datasetName || sourcePath);

  const zebra = Boolean(block.content.zebra);
  const cellPad = Number(block.content.cellPadding ?? 6);
  const rowGap = Math.max(0, Number(block.content.rowGap ?? 0));
  const colGap = Math.max(0, Number(block.content.colGap ?? 0));
  const headerBg = String(block.content.headerBackground ?? "");
  const headerColor = String(block.content.headerColor ?? "");
  const headerWeight = Number(block.content.headerFontWeight ?? 0);
  const headerSize = Number(block.content.headerFontSize ?? 0);
  const headerAlign = String(block.content.headerTextAlign ?? "left") as
    | "left"
    | "center"
    | "right";
  const headerRule = Boolean(block.content.headerRule);
  const showBorders = block.content.showBorders !== false;
  const borderH = block.content.borderHorizontal !== false;
  const borderV = block.content.borderVertical !== false;
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
    ? dataRows.map((r) =>
        mapTableItemToCells(r, templates, preview, runtime, {
          diagnose: preview,
        }),
      )
    : cells.slice(header ? 1 : 0);

  if (bound && preview) {
    if (datasetName && dataRows.length === 0) {
      noteIssue({
        category: "dataset",
        severity: "warning",
        message: `Dataset «${datasetName}» produced no rows for this preview`,
        detail: datasetName,
        blockId: block.id,
        source: "preview",
      });
    } else if (sourcePath && dataRows.length === 0) {
      noteIssue({
        category: "missing-data",
        severity: "warning",
        message: `Table path «${sourcePath}» is missing or empty`,
        detail: sourcePath,
        blockId: block.id,
        source: "preview",
      });
    }
  }

  const renderEditCell = (
    cell: string,
    ri: number,
    ci: number,
    isHeader: boolean,
  ) => {
    if (preview || bound) {
      return resolveTemplate(String(cell), row, {
        missingAsEmpty: preview,
        ctx: runtime,
        diagnose: preview,
      });
    }
    return (
      <MergeAwareText
        text={String(cell)}
        blockId={block.id}
        blockName={`${block.name} cell`}
        row={row}
        runtime={runtime}
        selected={selected}
        onChangeContent={(_id, content) => {
          const next = cells.map((r) => [...r]);
          const rowIdx = isHeader ? 0 : header ? ri + 1 : ri;
          if (!next[rowIdx]) return;
          next[rowIdx]![ci] = String(content.text ?? "");
          onChangeContent?.(block.id, { cells: next });
        }}
        onChipContextMenu={(path, e) => onChipContextMenu?.(block.id, path, e)}
      />
    );
  };

  const boundCellChip = (ci: number, value: string) => {
    const tpl = templates[ci] ?? "";
    if (isLiteralColumnTemplate(tpl) || preview) return value;
    const segs = parseMergeSegments(tpl);
    const merge = segs.find((s) => s.kind === "merge");
    const fieldLabel =
      merge && merge.kind === "merge"
        ? merge.label
        : fieldKeyFromHeader(tpl) || tpl || "field";
    // Show resolved value as the chip so multi-row tables stay readable;
    // hover/popup reveals the binding (sku, color, …).
    return (
      <BindingPreview
        class="block-data-wrap"
        chipClass="block-data"
        label={value || "(empty)"}
        previewValue={fieldLabel}
        ariaLabel={`${fieldLabel}: ${value}`}
      />
    );
  };

  const spaced = rowGap > 0 || colGap > 0;
  const sourceHint = datasetName || sourcePath;
  const heightMode = parseTableHeightMode(block.content.heightMode);
  const rowMinHeight = Number(block.content.rowMinHeight ?? 28);
  const rowMaxHeight = Number(block.content.rowMaxHeight ?? 0);
  const tableRef = useRef<HTMLTableElement>(null);

  const displayMatrix: string[][] = header
    ? [cells[0] ?? [], ...bodyRows.map((r) => r.map(String))]
    : bodyRows.map((r) => r.map(String));

  useEffect(() => {
    if (heightMode !== "auto") return;
    const el = tableRef.current;
    let nextH = 0;
    if (el) {
      nextH = Math.ceil(el.scrollHeight);
    } else {
      nextH = estimateTableHeight(displayMatrix, {
        tableWidth: block.w,
        cols: Math.max(
          1,
          Number(block.content.cols ?? displayMatrix[0]?.length ?? 1),
        ),
        fontSize: Number(block.style.fontSize ?? 12),
        lineHeight: Number(block.style.lineHeight ?? 1.35),
        cellPadding: cellPad,
        rowMinHeight,
        rowMaxHeight,
        rowGap,
      });
    }
    if (nextH > 0 && Math.abs(nextH - block.h) > 2) {
      updateBlock(block.id, { h: nextH }, { history: false });
    }
  }, [
    heightMode,
    block.id,
    block.w,
    block.h,
    cellPad,
    rowGap,
    rowMinHeight,
    rowMaxHeight,
    displayMatrix.length,
    bodyRows.length,
    JSON.stringify(displayMatrix),
  ]);

  return (
    <BlockFrame {...props}>
      <table
        ref={tableRef}
        class={[
          "block-table",
          heightMode === "auto" ? "block-table--auto" : "",
          zebra ? "block-table--zebra" : "",
          showBorders ? "" : "block-table--borderless",
          showBorders && !borderH ? "block-table--no-h-borders" : "",
          showBorders && !borderV ? "block-table--no-v-borders" : "",
          headerRule ? "block-table--header-rule" : "",
          spaced ? "block-table--spaced" : "",
          bound && !preview ? "block-table--bound" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          "--cell-pad": `${cellPad}px`,
          "--table-border": borderColor,
          "--row-gap": `${rowGap}px`,
          "--col-gap": `${colGap}px`,
          "--row-min": `${rowMinHeight}px`,
          ...(rowMaxHeight > 0 ? { "--row-max": `${rowMaxHeight}px` } : {}),
          height: heightMode === "auto" ? "auto" : "100%",
        }}
        title={
          bound && !preview && sourceHint
            ? `Rows from ${sourceHint}`
            : undefined
        }
      >
        {header && (
          <thead>
            <tr>
              {(cells[0] ?? []).map((cell, ci) => (
                <th
                  key={ci}
                  style={{
                    background: headerBg || undefined,
                    color: headerColor || undefined,
                    fontWeight: headerWeight > 0 ? headerWeight : undefined,
                    fontSize: headerSize > 0 ? `${headerSize}px` : undefined,
                    textAlign: headerAlign,
                  }}
                >
                  {bound
                    ? resolveTemplate(cell, row, {
                        missingAsEmpty: preview,
                        ctx: runtime,
                        diagnose: preview,
                      })
                    : renderEditCell(cell, 0, ci, true)}
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
                    ? boundCellChip(ci, String(cell))
                    : renderEditCell(String(cell), ri, ci, false)}
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
    diagnose: preview,
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

export function DateBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  const text = resolveDateBlockText(block.content, preview ? row : dataRows.value[0], runtime);
  const source = String(block.content.source ?? "today");
  const chip =
    source === "today"
      ? "Today"
      : source === "fixed"
        ? "Fixed"
        : dataFieldLabel(String(block.content.path ?? "date"));

  if (preview) {
    return (
      <BlockFrame {...props}>
        <div class="block-date block-date--resolved">{text || "—"}</div>
      </BlockFrame>
    );
  }

  return (
    <BlockFrame {...props}>
      <BindingPreview
        class="block-date-wrap"
        chipClass="block-date"
        label={chip}
        previewValue={text || null}
        ariaLabel={`${block.name} date`}
      />
    </BlockFrame>
  );
}

export function SignatureBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  const rawSrc = String(block.content.src ?? "");
  const src = resolveTemplate(rawSrc, row, {
    missingAsEmpty: preview,
    ctx: runtime,
    diagnose: preview,
  });
  const label = resolveTemplate(String(block.content.label ?? "Signature"), row, {
    missingAsEmpty: preview,
    ctx: runtime,
  });
  const caption = resolveTemplate(String(block.content.caption ?? ""), row, {
    missingAsEmpty: preview,
    ctx: runtime,
  });
  const showLine = block.content.showLine !== false;
  const firstRow = dataRows.value[0];
  const bindingEdit = !preview && hasMergeBinding(rawSrc);

  if (bindingEdit) {
    const previewUrl = resolveBindingPreview(rawSrc, firstRow, runtime);
    return (
      <BlockFrame {...props}>
        <div class="block-signature block-signature--binding">
          <BindingPreview
            class="binding-preview--media"
            chipClass="block-signature__chip"
            label={bindingPreviewLabel(rawSrc || "signature")}
            previewValue={previewUrl ?? (!firstRow ? "No data rows loaded" : null)}
            media={
              previewUrl && !previewUrl.startsWith("(") ? (
                <img class="binding-preview__thumb" src={previewUrl} alt="" />
              ) : undefined
            }
            ariaLabel={`${block.name} signature image`}
          />
        </div>
      </BlockFrame>
    );
  }

  return (
    <BlockFrame {...props}>
      <div class="block-signature">
        {src ? (
          <img class="block-signature__ink" src={src} alt={label} />
        ) : (
          <div class="block-signature__pad" aria-hidden="true" />
        )}
        {showLine ? <div class="block-signature__line" /> : null}
        <div class="block-signature__meta">
          {label ? <div class="block-signature__label">{label}</div> : null}
          {caption ? (
            <div class="block-signature__caption">
              {caption.split("\n").map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </BlockFrame>
  );
}

export function QrCodeBlock(props: BlockViewProps) {
  const { block, preview, row, runtime } = props;
  const rawValue = String(block.content.value ?? "");
  const value = resolveTemplate(rawValue, preview ? row : dataRows.value[0], {
    missingAsEmpty: true,
    ctx: runtime,
    diagnose: preview,
  });
  const src = qrDataUrl(value, {
    ecc: parseQrEcc(block.content.ecc),
    dark: String(block.content.dark ?? "#1c2430"),
    light: String(block.content.light ?? "#ffffff"),
  });

  if (!preview && hasMergeBinding(rawValue)) {
    return (
      <BlockFrame {...props}>
        <div class="block-qrcode block-qrcode--binding">
          <BindingPreview
            class="binding-preview--media"
            chipClass="block-qrcode__chip"
            label={bindingPreviewLabel(rawValue)}
            previewValue={value || (!dataRows.value[0] ? "No data rows loaded" : null)}
            media={src ? <img class="binding-preview__thumb" src={src} alt="" /> : undefined}
            ariaLabel={`${block.name} QR payload`}
          />
        </div>
      </BlockFrame>
    );
  }

  return (
    <BlockFrame {...props}>
      <div class="block-qrcode">
        {src ? (
          <img src={src} alt={value || "QR code"} />
        ) : (
          <span>Set QR value</span>
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
          { missingAsEmpty: preview, ctx: runtime, diagnose: preview },
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
  date: DateBlock,
  signature: SignatureBlock,
  qrcode: QrCodeBlock,
  prebuild: PrebuildBlock,
  group: GroupBlock,
  repeat: RepeatBlock,
};

export function renderBlock(props: BlockViewProps) {
  const Renderer = RENDERERS[props.block.type];
  return <Renderer key={props.block.id} {...props} />;
}
