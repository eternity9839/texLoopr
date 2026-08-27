import { useEffect, useRef, useState } from "preact/hooks";
import { Field } from "../../ui/controls";
import {
  indentedTextToListItems,
  listItemsToIndentedText,
  normalizeListItems,
  type ListItemNode,
} from "../../model/listData";

/** Inspect-panel list editor: Enter adds an item; Shift+Enter keeps a line break in the item. */
export function ListItemsField({
  items,
  onChange,
  id = "data-list",
}: {
  items: unknown;
  onChange: (nodes: ListItemNode[]) => void;
  id?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusedRef = useRef(false);
  const externalText = listItemsToIndentedText(normalizeListItems(items));
  const [draft, setDraft] = useState(externalText);

  useEffect(() => {
    if (!focusedRef.current) setDraft(externalText);
  }, [externalText]);

  const commit = (next: string, cursor?: number) => {
    setDraft(next);
    onChange(indentedTextToListItems(next));
    if (cursor != null) {
      queueMicrotask(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.selectionStart = el.selectionEnd = cursor;
      });
    }
  };

  return (
    <Field
      label="List items"
      forId={id}
      hint="One item per line. Enter adds a bullet; Shift+Enter for a line break inside an item. Tab indents nested items."
    >
      <textarea
        ref={textareaRef}
        id={id}
        rows={6}
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          commit(draft);
        }}
        onInput={(e) => {
          const el = e.currentTarget;
          const pos = el.selectionStart ?? 0;
          commit(el.value, pos);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const el = e.currentTarget;
          const start = el.selectionStart ?? 0;
          const end = el.selectionEnd ?? start;
          if (e.shiftKey) return;
          e.preventDefault();
          const val = el.value;
          const next = `${val.slice(0, start)}\n${val.slice(end)}`;
          commit(next, start + 1);
        }}
      />
    </Field>
  );
}
