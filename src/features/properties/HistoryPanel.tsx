import {
  canRedo,
  canUndo,
  historyActionLog,
  historyEpoch,
  redoEdit,
  undoEdit,
} from "../../state/store";
import { Icon } from "../../ui/icons";

export function HistoryPanel() {
  void historyEpoch.value;
  const rows = historyActionLog();
  const undoable = canUndo();
  const redoable = canRedo();

  return (
    <div class="history-panel panel-pad" aria-label="Edit history">
      <div class="history-panel__toolbar">
        <button
          type="button"
          class="btn btn--ghost btn--small"
          disabled={!undoable}
          onClick={undoEdit}
          title="Undo (Ctrl+Z)"
        >
          <Icon name="undo" size={14} />
          Undo
        </button>
        <button
          type="button"
          class="btn btn--ghost btn--small"
          disabled={!redoable}
          onClick={redoEdit}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Icon name="redo" size={14} />
          Redo
        </button>
      </div>

      {rows.length <= 1 ? (
        <p class="muted history-panel__empty">
          Edits appear here. Undo and redo survive reload while the project
          session is autosaved.
        </p>
      ) : (
        <ol class="history-list" aria-label="Action timeline">
          {rows.map((row, index) => (
            <li
              key={`${row.kind}-${index}-${row.label}`}
              class={
                row.kind === "current"
                  ? "history-list__item history-list__item--current"
                  : row.kind === "future"
                    ? "history-list__item history-list__item--future"
                    : "history-list__item"
              }
              aria-current={row.kind === "current" ? "step" : undefined}
            >
              <span class="history-list__marker" aria-hidden="true">
                {row.kind === "current" ? "●" : row.kind === "future" ? "○" : "✓"}
              </span>
              <span class="history-list__label">{row.label}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
