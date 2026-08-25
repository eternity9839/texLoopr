import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { BindingPreviewMode } from "../../model/document";
import { prefs } from "../../state/store";

export interface BindingPreviewProps {
  /** Chip / trigger label in edit mode */
  label: string;
  /** Resolved preview text or URL; omit when unavailable */
  previewValue?: string | null;
  /** Shown when preview resolves empty */
  emptyHint?: string;
  /** Override app pref for tests */
  mode?: BindingPreviewMode;
  class?: string;
  chipClass?: string;
  /** Optional rich preview (e.g. image thumbnail) */
  media?: ComponentChildren;
  editing?: boolean;
  editSlot?: ComponentChildren;
  onActivate?: () => void;
  ariaLabel?: string;
}

/** Edit-mode binding hint — inline swap or popup, driven by Settings → Editor. */
export function BindingPreview({
  label,
  previewValue,
  emptyHint = "(empty)",
  mode: modeOverride,
  class: className,
  chipClass,
  media,
  editing,
  editSlot,
  onActivate,
  ariaLabel,
}: BindingPreviewProps) {
  const mode =
    modeOverride ?? prefs.value.bindingPreviewMode ?? "popup";
  const [hovering, setHovering] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const previewText =
    previewValue?.trim() ||
    (previewValue === "" ? emptyHint : null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer, true);
    return () => window.removeEventListener("pointerdown", onPointer, true);
  }, [open]);

  useEffect(() => {
    if (!hovering && !open) return;
    const close = () => {
      setHovering(false);
      setOpen(false);
    };
    window.addEventListener("blur", close);
    return () => window.removeEventListener("blur", close);
  }, [hovering, open]);

  if (editing && editSlot) {
    return (
      <div class={["binding-preview", className].filter(Boolean).join(" ")}>
        {editSlot}
      </div>
    );
  }

  const showInlinePreview =
    mode === "inline" && hovering && (previewText || media);
  const showPopup = mode === "popup" && open && (previewText || media);

  const triggerLabel =
    showInlinePreview && previewText && !media ? previewText : label;

  return (
    <div
      ref={rootRef}
      class={["binding-preview", className].filter(Boolean).join(" ")}
      onPointerLeave={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && rootRef.current?.contains(next)) return;
        setHovering(false);
        setOpen(false);
      }}
    >
      <span
        class={["binding-preview__chip", chipClass].filter(Boolean).join(" ")}
        aria-label={ariaLabel ?? label}
        onPointerEnter={() => {
          if (!previewText && !media) return;
          setHovering(true);
          if (mode === "popup") setOpen(true);
        }}
        onDblClick={(e) => {
          e.stopPropagation();
          onActivate?.();
        }}
      >
        {showInlinePreview && media ? media : triggerLabel}
      </span>
      {showPopup && (
        <div class="binding-preview__popup" role="tooltip">
          {media ?? previewText}
        </div>
      )}
    </div>
  );
}
