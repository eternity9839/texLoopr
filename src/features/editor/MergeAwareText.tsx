import { useEffect, useState } from "preact/hooks";
import type { DataRow } from "../../model/bindings";
import type { RuntimeContext } from "../../model/expr";
import {
  parseMergeSegments,
  segmentPreviewValue,
} from "../../model/mergeSegments";
import { dataRows } from "../../state/store";
import { BindingPreview } from "./BindingPreview";
import { onTextExpansionKeyDown } from "./textExpansionField";

export function MergeAwareText({
  text,
  blockId,
  blockName,
  row,
  runtime,
  selected,
  onChangeContent,
}: {
  text: string;
  blockId: string;
  blockName: string;
  row?: DataRow;
  runtime?: RuntimeContext;
  selected?: boolean;
  onChangeContent?: (id: string, content: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const firstRow = dataRows.value[0];
  const previewRow = row ?? firstRow;
  const segments = parseMergeSegments(text);
  const hasMerge = segments.some((s) => s.kind === "merge");

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  if (editing || !hasMerge) {
    return (
      <textarea
        value={text}
        onInput={(e) =>
          onChangeContent?.(blockId, { text: e.currentTarget.value })
        }
        onBlur={() => setEditing(false)}
        onKeyDown={(e) =>
          onTextExpansionKeyDown(e, (next, cursor) => {
            onChangeContent?.(blockId, { text: next });
            queueMicrotask(() => {
              e.currentTarget.setSelectionRange(cursor, cursor);
            });
          })
        }
        aria-label={`${blockName} text`}
        autoFocus={editing && hasMerge}
      />
    );
  }

  return (
    <div
      class="merge-aware-text"
      onDblClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return (
            <span key={i} class="merge-aware-text__plain">
              {seg.text}
            </span>
          );
        }
        return (
          <BindingPreview
            key={i}
            class="merge-aware-text__chip-wrap"
            chipClass="block-data"
            label={seg.label}
            previewValue={segmentPreviewValue(seg, previewRow, runtime)}
            onActivate={() => setEditing(true)}
            ariaLabel={seg.raw}
          />
        );
      })}
    </div>
  );
}
