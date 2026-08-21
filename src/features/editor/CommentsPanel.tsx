import { useState } from "preact/hooks";
import {
  addComment,
  deleteComment,
  project,
  resolveComment,
  selectedBlock,
  select,
} from "../../state/store";

export function CommentsPanel() {
  const comments = project.value.comments ?? [];
  const selected = selectedBlock.value;
  const [draft, setDraft] = useState("");
  const open = comments.filter((c) => !c.resolved);
  const done = comments.filter((c) => c.resolved);

  return (
    <div class="comments-panel panel-pad" data-tour="comments" aria-label="Comments">
      <h3 class="panel-subtitle" style={{ marginTop: 0 }}>
        Open ({open.length})
      </h3>
      {open.length === 0 && (
        <p class="muted" style={{ fontSize: "0.75rem" }}>
          No open notes.
        </p>
      )}
      <ul class="comment-list">
        {open.map((c) => (
          <li key={c.id} class="comment-card">
            <button
              type="button"
              class="comment-card__anchor"
              onClick={() => select({ kind: "block", id: c.blockId })}
            >
              Jump to block
            </button>
            <p class="comment-card__body">{c.body}</p>
            <p class="muted comment-card__meta">
              {c.author} · {new Date(c.createdAt).toLocaleString()}
            </p>
            <div class="field-row">
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() => resolveComment(c.id, true)}
              >
                Resolve
              </button>
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() => deleteComment(c.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <h3 class="panel-subtitle">Resolved ({done.length})</h3>
          <ul class="comment-list">
            {done.map((c) => (
              <li key={c.id} class="comment-card comment-card--resolved">
                <p class="comment-card__body">{c.body}</p>
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() => resolveComment(c.id, false)}
                >
                  Reopen
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div class="field comment-compose">
        <label for="comment-draft">
          {selected ? `Note on “${selected.name}”` : "New note"}
        </label>
        <textarea
          id="comment-draft"
          rows={2}
          value={draft}
          placeholder={
            selected ? "Write a note…" : "Select a block on the page first"
          }
          disabled={!selected}
          onInput={(e) => setDraft(e.currentTarget.value)}
        />
        <button
          type="button"
          class="btn btn--small"
          style={{ marginTop: "0.35rem" }}
          disabled={!selected || !draft.trim()}
          onClick={() => {
            addComment(draft);
            setDraft("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
