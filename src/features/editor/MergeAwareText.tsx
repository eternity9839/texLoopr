import { useContext, useEffect, useState } from "preact/hooks";
import type { DataRow } from "../../model/bindings";
import type { RuntimeContext } from "../../model/expr";
import {
  parseMergeSegments,
  segmentPreviewValue,
} from "../../model/mergeSegments";
import { assertMergeTemplate } from "../../model/templateFilters";
import { dataRows } from "../../state/store";
import {
  clearMergeAssertIssues,
  reportStickyIssue,
} from "../../state/issueLog";
import { BindingPreview } from "./BindingPreview";
import { BlockEditContext } from "./BlockEditContext";
import { onTextExpansionKeyDown } from "./textExpansionField";

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
}: {
  text: string;
  blockId: string;
  blockName: string;
  row?: DataRow;
  runtime?: RuntimeContext;
  selected?: boolean;
  onChangeContent?: (id: string, content: Record<string, unknown>) => void;
}) {
  const frameEdit = useContext(BlockEditContext);
  const [editing, setEditing] = useState(false);
  const [warnTokens, setWarnTokens] = useState<Set<string>>(() => new Set());
  const firstRow = dataRows.value[0];
  const previewRow = row ?? firstRow;
  const sampleRow = firstRow ?? previewRow;
  const segments = parseMergeSegments(text);
  const hasMerge = segments.some((s) => s.kind === "merge");
  const active = editing || Boolean(frameEdit?.editing);

  useEffect(() => {
    if (!selected) {
      setEditing(false);
      frameEdit?.endEdit();
    }
  }, [selected]);

  useEffect(() => {
    if (frameEdit?.editing) setEditing(true);
  }, [frameEdit?.editing]);

  const exitEdit = () => {
    setEditing(false);
    frameEdit?.endEdit();
    if (hasMerge) {
      setWarnTokens(runMergeAsserts(text, blockId, sampleRow, runtime));
    }
  };

  if (active || !hasMerge) {
    return (
      <textarea
        value={text}
        onInput={(e) =>
          onChangeContent?.(blockId, { text: e.currentTarget.value })
        }
        onBlur={exitEdit}
        onKeyDown={(e) =>
          onTextExpansionKeyDown(e, (next, cursor) => {
            onChangeContent?.(blockId, { text: next });
            queueMicrotask(() => {
              e.currentTarget.setSelectionRange(cursor, cursor);
            });
          })
        }
        aria-label={`${blockName} text`}
        autoFocus={active && hasMerge}
      />
    );
  }

  return (
    <div
      class="merge-aware-text"
      onDblClick={(e) => {
        e.stopPropagation();
        setEditing(true);
        frameEdit?.requestEdit();
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
            chipClass={[
              "block-data",
              warn ? "merge-aware-text__chip--warn" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            label={seg.label}
            previewValue={segmentPreviewValue(seg, previewRow, runtime)}
            onActivate={() => {
              setEditing(true);
              frameEdit?.requestEdit();
            }}
            ariaLabel={seg.raw}
          />
        );
      })}
    </div>
  );
}
