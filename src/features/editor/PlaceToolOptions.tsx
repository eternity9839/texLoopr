import { useRef, useState } from "preact/hooks";
import {
  armPlaceTool,
  dataRows,
  placeDraft,
  updatePlaceDraft,
} from "../../state/store";
import { dataColumnNames } from "../../model/bindings";
import {
  assertAttachmentSize,
  formatBytes,
  MAX_ATTACHMENT_BYTES,
  resizeTableCells,
} from "../../model/placeTools";
import {
  LINK_HOOK_DEFAULTS,
  LINK_HOOK_LABEL,
  LINK_HOOKS,
  type LinkHook,
} from "../../model/linkHook";
import { onTextExpansionKeyDown } from "./textExpansionField";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

/** Compact tool options for the options strip (armed place tool). */
export function PlaceToolOptions() {
  const draft = placeDraft.value;
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  if (!draft) return null;

  const onPickFile = async (file: File | undefined, asPicture: boolean) => {
    if (!file) return;
    const err = assertAttachmentSize(file.size);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    const dataUrl = await readFileAsDataUrl(file);
    if (asPicture) {
      updatePlaceDraft({ content: { src: dataUrl, alt: file.name } });
    } else {
      updatePlaceDraft({
        content: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
          count: 1,
          label: file.name,
        },
      });
    }
  };

  return (
    <div class="options-bar__group options-bar__group--place" role="group">
      <span class="options-bar__label">{draft.name}</span>
      <label class="options-bar__num" title="Width">
        W
        <input
          type="number"
          min={16}
          max={2000}
          value={draft.w}
          onChange={(e) =>
            updatePlaceDraft({ w: Math.round(Number(e.currentTarget.value) || 16) })
          }
        />
      </label>
      <label class="options-bar__num" title="Height">
        H
        <input
          type="number"
          min={8}
          max={2000}
          value={draft.h}
          onChange={(e) =>
            updatePlaceDraft({ h: Math.round(Number(e.currentTarget.value) || 8) })
          }
        />
      </label>

      {(draft.type === "text" ||
        draft.type === "paragraph" ||
        draft.type === "list") && (
        <input
          class="options-bar__text"
          aria-label="Text"
          placeholder="Text…"
          value={String(draft.content.text ?? "")}
          onInput={(e) =>
            updatePlaceDraft({ content: { text: e.currentTarget.value } })
          }
          onKeyDown={(e) =>
            onTextExpansionKeyDown(e, (text) =>
              updatePlaceDraft({ content: { text } }),
            )
          }
        />
      )}

      {draft.type === "data" && (
        <>
          <input
            class="options-bar__text"
            aria-label="Field path"
            placeholder="field · date|date:short"
            value={String(draft.content.path ?? "")}
            onInput={(e) =>
              updatePlaceDraft({ content: { path: e.currentTarget.value } })
            }
          />
          {dataColumnNames(dataRows.value).length > 0 && (
            <select
              aria-label="Pick column"
              value=""
              onChange={(e) => {
                const col = e.currentTarget.value;
                if (col) updatePlaceDraft({ content: { path: col } });
              }}
            >
              <option value="">Column…</option>
              {dataColumnNames(dataRows.value).map((c) => (
                <option value={c} key={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      {draft.type === "link" && (
        <>
          <select
            aria-label="Link kind"
            value={String(draft.content.hook ?? "url")}
            onChange={(e) => {
              const hook = e.currentTarget.value as LinkHook;
              const defs = LINK_HOOK_DEFAULTS[hook];
              updatePlaceDraft({
                content: {
                  hook,
                  target: defs.target,
                  label: defs.label,
                },
                name: LINK_HOOK_LABEL[hook],
              });
            }}
          >
            {LINK_HOOKS.map((h) => (
              <option value={h} key={h}>
                {LINK_HOOK_LABEL[h]}
              </option>
            ))}
          </select>
          <input
            class="options-bar__text"
            aria-label="Target"
            placeholder="https://… · {{email}} · #section"
            value={String(draft.content.target ?? "")}
            onInput={(e) =>
              updatePlaceDraft({ content: { target: e.currentTarget.value } })
            }
          />
          <input
            class="options-bar__text"
            aria-label="Label"
            placeholder="Visible label"
            value={String(draft.content.label ?? "")}
            onInput={(e) =>
              updatePlaceDraft({ content: { label: e.currentTarget.value } })
            }
          />
        </>
      )}

      {draft.type === "list" && (
        <select
          aria-label="Markers"
          value={String(draft.style.listStyle ?? "disc")}
          onChange={(e) =>
            updatePlaceDraft({
              style: { listStyle: e.currentTarget.value as never },
            })
          }
        >
          <option value="disc">•</option>
          <option value="circle">◦</option>
          <option value="square">▪</option>
          <option value="decimal">1.</option>
          <option value="upper-roman">I.</option>
          <option value="lower-alpha">a.</option>
          <option value="none">—</option>
        </select>
      )}

      {draft.type === "picture" && (
        <>
          <input
            class="options-bar__text"
            aria-label="Image URL"
            placeholder="URL or {{field}}"
            value={String(draft.content.src ?? "")}
            onInput={(e) =>
              updatePlaceDraft({ content: { src: e.currentTarget.value } })
            }
          />
          <label class="options-bar__file">
            <span>Upload</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                void onPickFile(e.currentTarget.files?.[0], true)
              }
            />
          </label>
          <select
            aria-label="Fit"
            value={String(draft.content.fit ?? "contain")}
            onChange={(e) =>
              updatePlaceDraft({ content: { fit: e.currentTarget.value } })
            }
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="fill">Stretch</option>
          </select>
        </>
      )}

      {draft.type === "shape" && (
        <>
          <select
            aria-label="Variant"
            value={String(
              draft.content.variant ?? draft.content.shape ?? "rect",
            )}
            onChange={(e) => {
              const v = e.currentTarget.value;
              updatePlaceDraft({ content: { variant: v, shape: v } });
            }}
          >
            <option value="rect">Rectangle</option>
            <option value="rounded">Rounded</option>
            <option value="ellipse">Ellipse</option>
            <option value="circle">Circle</option>
            <option value="triangle">Triangle</option>
            <option value="diamond">Diamond</option>
            <option value="line">Line</option>
          </select>
          <button
            type="button"
            class={
              draft.content.filled
                ? "options-bar__chip options-bar__chip--on"
                : "options-bar__chip"
            }
            aria-pressed={Boolean(draft.content.filled)}
            onClick={() => {
              const next = !draft.content.filled;
              updatePlaceDraft({
                content: { filled: next },
                style: next
                  ? {
                      background:
                        draft.style.background &&
                        draft.style.background !== "transparent"
                          ? draft.style.background
                          : "#e3ddd3",
                    }
                  : { background: "transparent" },
              });
            }}
          >
            Fill
          </button>
          {Boolean(draft.content.filled) && (
            <input
              type="color"
              aria-label="Fill color"
              value={String(draft.style.background ?? "#e3ddd3")}
              onInput={(e) =>
                updatePlaceDraft({ style: { background: e.currentTarget.value } })
              }
            />
          )}
          <input
            type="color"
            aria-label="Stroke"
            value={String(draft.style.borderColor ?? "#2a2622")}
            onInput={(e) =>
              updatePlaceDraft({
                style: { borderColor: e.currentTarget.value },
              })
            }
          />
        </>
      )}

      {draft.type === "table" && (
        <>
          <label class="options-bar__num" title="Rows">
            R
            <input
              type="number"
              min={1}
              max={32}
              value={Number(draft.content.rows ?? 3)}
              onChange={(e) => {
                const rows = Math.round(Number(e.currentTarget.value) || 1);
                const cols = Number(draft.content.cols ?? 3);
                updatePlaceDraft({
                  content: {
                    rows,
                    cells: resizeTableCells(
                      (draft.content.cells as string[][]) ?? [],
                      rows,
                      cols,
                    ),
                  },
                  h: Math.max(48, rows * 28 + 16),
                });
              }}
            />
          </label>
          <label class="options-bar__num" title="Columns">
            C
            <input
              type="number"
              min={1}
              max={16}
              value={Number(draft.content.cols ?? 3)}
              onChange={(e) => {
                const cols = Math.round(Number(e.currentTarget.value) || 1);
                const rows = Number(draft.content.rows ?? 3);
                updatePlaceDraft({
                  content: {
                    cols,
                    cells: resizeTableCells(
                      (draft.content.cells as string[][]) ?? [],
                      rows,
                      cols,
                    ),
                  },
                  w: Math.max(120, cols * 72 + 16),
                });
              }}
            />
          </label>
          <button
            type="button"
            class={
              draft.content.header
                ? "options-bar__chip options-bar__chip--on"
                : "options-bar__chip"
            }
            aria-pressed={Boolean(draft.content.header)}
            onClick={() =>
              updatePlaceDraft({ content: { header: !draft.content.header } })
            }
          >
            Header
          </button>
        </>
      )}

      {draft.type === "files" && (
        <>
          <input
            class="options-bar__text"
            aria-label="Label"
            placeholder="Label"
            value={String(draft.content.label ?? "")}
            onInput={(e) =>
              updatePlaceDraft({ content: { label: e.currentTarget.value } })
            }
          />
          <label class="options-bar__file">
            <span>File ≤{formatBytes(MAX_ATTACHMENT_BYTES)}</span>
            <input
              ref={fileRef}
              type="file"
              onChange={(e) =>
                void onPickFile(e.currentTarget.files?.[0], false)
              }
            />
          </label>
          {String(draft.content.fileName ?? "") ? (
            <span class="options-bar__meta muted">
              {String(draft.content.fileName)}
            </span>
          ) : null}
        </>
      )}

      {fileError && (
        <span class="options-bar__error" role="alert">
          {fileError}
        </span>
      )}

      <span class="options-bar__meta muted">Click page to place · Esc</span>
      <button
        type="button"
        class="options-bar__chip"
        onClick={() => armPlaceTool(null)}
      >
        Cancel
      </button>
    </div>
  );
}
