import {
  activeOutputProfile,
  activePage,
  nudgeZOrder,
  previewRow,
  project,
  selectedBlock,
  selection,
  select,
  setGroupIsolation,
  prefs,
} from "../../state/store";
import {
  extractMergePaths,
  findBlockAncestors,
} from "../../model/outlineTree";
import { stackIndexAmongSiblings } from "../../model/layerStack";
import { evaluateCondition } from "../../model/bindings";
import { enrichPreviewContext } from "../../model/runtime";
import { OUTPUT_KINDS, OUTPUT_KIND_LABEL } from "../../model/workflow";
import { pinIsActive } from "../../model/geometry";

/** Associations strip for Layers / inspector — parent chain, stack, outputs, fields. */
export function BlockAssociations({ compact = false }: { compact?: boolean }) {
  const block = selectedBlock.value;
  const page = activePage.value;
  const sel = selection.value;
  const p = prefs.value;
  const isolation = p.groupIsolationId;

  if (sel?.kind !== "block" || !block || !page) {
    if (compact) return null;
    return (
      <div class="assoc-strip assoc-strip--empty panel-pad muted">
        <p class="prop-hint">Select a component to see associations.</p>
      </div>
    );
  }

  const chain = findBlockAncestors(page.blocks, block.id);
  const stack = stackIndexAmongSiblings(page.blocks, block.id);
  const fields = extractMergePaths(block);
  const row = previewRow.value;
  const outputs = project.value.outputs ?? [];
  const activeOut = activeOutputProfile() ?? outputs[0];
  const ctx = activeOut
    ? enrichPreviewContext(project.value, row, activeOut)
    : undefined;

  const visibleOutputs = OUTPUT_KINDS.filter((kind) => {
    if (!block.condition) return true;
    if (!ctx) return true;
    try {
      return evaluateCondition(block.condition, row, {
        ...ctx,
        output: { ...ctx.output, kind },
      });
    } catch {
      return false;
    }
  });

  return (
    <div class={`assoc-strip${compact ? " assoc-strip--compact" : ""}`}>
      <div class="assoc-strip__row">
        <span class="assoc-strip__label">Surface</span>
        <button
          type="button"
          class="assoc-strip__link"
          onClick={() => select({ kind: "page", id: page.id })}
        >
          {page.name}
        </button>
        {chain.map((g) => (
          <span key={g.id} class="assoc-strip__chain">
            <span class="assoc-strip__sep">›</span>
            <button
              type="button"
              class="assoc-strip__link"
              onClick={() => select({ kind: "block", id: g.id })}
            >
              {g.name}
            </button>
          </span>
        ))}
        <span class="assoc-strip__sep">›</span>
        <span class="assoc-strip__current">{block.name}</span>
      </div>

      <div class="assoc-strip__row assoc-strip__chips">
        {stack && (
          <span class="assoc-chip" title="Stack position among siblings">
            Layer {stack.index}/{stack.total}
          </span>
        )}
        {pinIsActive(block.pin) && <span class="assoc-chip">Pinned</span>}
        {block.locked && <span class="assoc-chip">Locked</span>}
        {isolation === block.id && (
          <span class="assoc-chip assoc-chip--on">Isolated</span>
        )}
        {chain.length > 0 && isolation !== block.id && (
          <button
            type="button"
            class="assoc-chip assoc-chip--btn"
            onClick={() => setGroupIsolation(chain[chain.length - 1]!.id)}
          >
            Isolate group
          </button>
        )}
        {isolation && (
          <button
            type="button"
            class="assoc-chip assoc-chip--btn"
            onClick={() => setGroupIsolation(null)}
          >
            Exit isolation
          </button>
        )}
        <button
          type="button"
          class="assoc-chip assoc-chip--btn"
          title="Bring forward"
          onClick={() => nudgeZOrder("forward")}
        >
          ↑
        </button>
        <button
          type="button"
          class="assoc-chip assoc-chip--btn"
          title="Send backward"
          onClick={() => nudgeZOrder("backward")}
        >
          ↓
        </button>
      </div>

      {fields.length > 0 && (
        <div class="assoc-strip__row">
          <span class="assoc-strip__label">Fields</span>
          {fields.map((f) => (
            <span class="assoc-chip assoc-chip--field" key={f}>
              {f}
            </span>
          ))}
        </div>
      )}

      {block.condition && (
        <div class="assoc-strip__row">
          <span class="assoc-strip__label">Condition</span>
          <code class="assoc-strip__code">{block.condition}</code>
        </div>
      )}

      <div class="assoc-strip__row">
        <span class="assoc-strip__label">Outputs</span>
        {visibleOutputs.map((k) => (
          <span class="assoc-chip assoc-chip--ok" key={k}>
            {OUTPUT_KIND_LABEL[k]}
          </span>
        ))}
      </div>
    </div>
  );
}
