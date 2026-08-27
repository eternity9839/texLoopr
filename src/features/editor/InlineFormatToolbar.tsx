import { useCallback, useEffect } from "preact/hooks";
import { Icon } from "../../ui/icons";
import {
  type InlineFormat,
  selectionHasFormat,
  toggleInlineFormat,
} from "../../model/inlineFormat";
import {
  bumpTextEditSelection,
  textEditSession,
} from "./textEditSession";

const FORMATS: {
  id: InlineFormat;
  label: string;
  icon?: "bold" | "italic" | "underline";
  glyph?: string;
}[] = [
  { id: "bold", label: "Bold", icon: "bold" },
  { id: "italic", label: "Italic", icon: "italic" },
  { id: "underline", label: "Underline", icon: "underline" },
  { id: "strike", label: "Strikethrough", glyph: "S" },
];

/** Inline B/I/U/S — lives in the edit ribbon, not over the text block. */
export function InlineFormatToolbar() {
  const session = textEditSession.value;
  void session?.tick;

  const syncSelection = useCallback(() => {
    bumpTextEditSelection();
  }, []);

  useEffect(() => {
    const el = session?.textareaRef.current;
    if (!el) return;
    const onSel = () => syncSelection();
    el.addEventListener("select", onSel);
    el.addEventListener("keyup", onSel);
    el.addEventListener("mouseup", onSel);
    return () => {
      el.removeEventListener("select", onSel);
      el.removeEventListener("keyup", onSel);
      el.removeEventListener("mouseup", onSel);
    };
  }, [session?.blockId, syncSelection]);

  if (!session) return null;

  const el = session.textareaRef.current;
  const value = session.value;
  const start = el?.selectionStart ?? 0;
  const end = el?.selectionEnd ?? 0;

  const apply = (format: InlineFormat) => {
    if (!el) return;
    const selStart = el.selectionStart;
    const selEnd = el.selectionEnd;
    const result = toggleInlineFormat(value, selStart, selEnd, format);
    session.onApply(result.text, result.selectionStart, result.selectionEnd);
    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
      bumpTextEditSelection();
    });
  };

  return (
    <div
      class="inline-format-toolbar"
      role="toolbar"
      aria-label="Inline text formatting"
      onPointerDown={(e) => e.preventDefault()}
    >
      {FORMATS.map((fmt) => {
        const active = selectionHasFormat(value, start, end, fmt.id);
        return (
          <button
            key={fmt.id}
            type="button"
            class={
              active
                ? "inline-format-toolbar__btn inline-format-toolbar__btn--on"
                : "inline-format-toolbar__btn"
            }
            title={fmt.label}
            aria-label={fmt.label}
            aria-pressed={active}
            onClick={() => apply(fmt.id)}
          >
            {fmt.icon ? (
              <Icon name={fmt.icon} size={13} />
            ) : (
              <span class="inline-format-toolbar__glyph" aria-hidden="true">
                {fmt.glyph}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
