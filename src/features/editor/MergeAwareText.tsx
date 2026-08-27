import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import type { DataRow } from "../../model/bindings";
import type { RuntimeContext } from "../../model/expr";
import {
  parseMergeSegments,
  segmentPreviewValue,
} from "../../model/mergeSegments";
import { assertMergeTemplate } from "../../model/templateFilters";
import { RichText } from "../../model/richText";
import { dataRows } from "../../state/store";
import {
  clearMergeAssertIssues,
  reportStickyIssue,
} from "../../state/issueLog";
import { BindingPreview } from "./BindingPreview";
import { BlockEditContext } from "./BlockEditContext";
import { onTextExpansionKeyDown } from "./textExpansionField";
import {
  clearTextEditSession,
  registerTextEditSession,
} from "./textEditSession";
import { mergeChipClassName } from "../../model/mergeChipKind";

function runMergeAsserts(
  text: string,
  blockId: string,
  row: DataRow | undefined,
  runtime?: RuntimeContext,
): Set<string> {
  clearMergeAssertIssues(blockId);
  const fails = assertMergeTemplate(text, row, { ctx: runtime });
  const bad = new Set<string>();
  for (const f of fails) {
    bad.add(f.detail);
    reportStickyIssue({
      category: "merge-assert",
      severity: f.severity,
      message: f.message,
      detail: f.detail,
      blockId,
      source: "manual",
    });
  }
  return bad;
}

export function MergeAwareText({
  text,
  blockId,
  blockName,
  row,
  runtime,
  selected,
  onChangeContent,
  onChipContextMenu,
  onEnter,
  focusItemKey,
  itemKey,
}: {
  text: string;
  blockId: string;
  blockName: string;
  row?: DataRow;
  runtime?: RuntimeContext;
  selected?: boolean;
  onChangeContent?: (id: string, content: Record<string, unknown>) => void;
  onChipContextMenu?: (mergePath: string, e: MouseEvent) => void;
  /** Return true when Enter should create a new list row instead of a newline. */
  onEnter?: (text: string, cursor: number) => boolean;
  /** Focus and open edit mode when this key matches (list item continuity). */
  focusItemKey?: string | null;
  itemKey?: string;
}) {
  const frameEdit = useContext(BlockEditContext);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [warnTokens, setWarnTokens] = useState<Set<string>>(() => new Set());
  const firstRow = dataRows.value[0];
  const previewRow = row ?? firstRow;
  const sampleRow = firstRow ?? previewRow;
  const segments = parseMergeSegments(text);
  const hasMerge = segments.some((s) => s.kind === "merge");
  const active = editing || Boolean(frameEdit?.editing);

  const applyFormattedText = useCallback(
    (next: string, start: number, end: number) => {
      onChangeContent?.(blockId, { text: next });
      queueMicrotask(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.setSelectionRange(start, end);
      });
    },
    [blockId, onChangeContent],
  );

  useEffect(() => {
    if (!selected) {
      setEditing(false);
      frameEdit?.endEdit();
      clearTextEditSession(blockId);
    }
  }, [selected, blockId, frameEdit]);

  useEffect(() => {
    if (frameEdit?.editing) setEditing(true);
  }, [frameEdit?.editing]);

  useEffect(() => {
    if (!focusItemKey || !itemKey || focusItemKey !== itemKey) return;
    setEditing(true);
    frameEdit?.requestEdit();
    queueMicrotask(() => textareaRef.current?.focus());
  }, [focusItemKey, itemKey, frameEdit]);

  useEffect(() => {
    if (!active) {
      clearTextEditSession(blockId);
      return;
    }
    registerTextEditSession({
      blockId,
      textareaRef,
      value: text,
      onApply: applyFormattedText,
      tick: 0,
    });
    return () => clearTextEditSession(blockId);
  }, [active, blockId, text, applyFormattedText]);

  const enterEdit = () => {
    setEditing(true);
    frameEdit?.requestEdit();
    queueMicrotask(() => textareaRef.current?.focus());
  };

  const exitEdit = () => {
    setEditing(false);
    frameEdit?.endEdit();
    clearTextEditSession(blockId);
    if (hasMerge) {
      setWarnTokens(runMergeAsserts(text, blockId, sampleRow, runtime));
    }
  };

  if (active) {
    return (
      <div class="rich-text-field">
        <textarea
          ref={textareaRef}
          value={text}
          onInput={(e) =>
            onChangeContent?.(blockId, { text: e.currentTarget.value })
          }
          onBlur={exitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && onEnter) {
              const el = e.currentTarget;
              const start = el.selectionStart ?? 0;
              const end = el.selectionEnd ?? start;
              if (start === end && onEnter(el.value, start)) {
                e.preventDefault();
                return;
              }
            }
            onTextExpansionKeyDown(e, (next, cursor) => {
              onChangeContent?.(blockId, { text: next });
              queueMicrotask(() => {
                e.currentTarget.setSelectionRange(cursor, cursor);
              });
            });
          }}
          aria-label={`${blockName} text`}
          autoFocus
        />
      </div>
    );
  }

  if (!hasMerge) {
    return (
      <div
        class="rich-text-field rich-text-field--preview merge-aware-text"
        onDblClick={(e) => {
          e.stopPropagation();
          enterEdit();
        }}
        title="Double-click to edit · use the ribbon for Bold/Italic/Underline"
      >
        <RichText text={text} />
      </div>
    );
  }

  return (
    <div
      class="merge-aware-text"
      onDblClick={(e) => {
        e.stopPropagation();
        enterEdit();
      }}
    >
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return (
            <span key={i} class="merge-aware-text__plain">
              <RichText text={seg.text} />
            </span>
          );
        }
        const warn = warnTokens.has(seg.raw);
        return (
          <BindingPreview
            key={i}
            class={[
              "merge-aware-text__chip-wrap",
              warn ? "merge-aware-text__chip-wrap--warn" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            chipClass={mergeChipClassName(seg.path, seg.filters, warn)}
            label={seg.label}
            previewValue={segmentPreviewValue(seg, previewRow, runtime)}
            onActivate={enterEdit}
            onChipContextMenu={(e) => onChipContextMenu?.(seg.path, e)}
            ariaLabel={seg.raw}
          />
        );
      })}
    </div>
  );
}
