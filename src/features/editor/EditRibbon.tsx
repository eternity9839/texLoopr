import { useState } from "preact/hooks";
import { Icon, type IconName } from "../../ui/icons";
import { BLOCK_TOOLS } from "./Toolbox";
import {
  alignSelected,
  canRedo,
  canUndo,
  clipboardBlock,
  copySelected,
  cutSelected,
  duplicateSelected,
  groupSelection,
  insertBlockPlaced,
  insertPlacement,
  nudgeZOrder,
  pasteClipboard,
  prefs,
  redoEdit,
  saveSelectionAsCustomObject,
  selectedBlock,
  selectedIds,
  setInsertPlacement,
  toggleLockSelected,
  undoEdit,
  ungroupSelection,
  updateBlock,
  updatePrefs,
  addComment,
  inspectorTab,
} from "../../state/store";
import type { BlockType } from "../../model/document";

function IconBtn({
  icon,
  label,
  onClick,
  disabled,
  pressed,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      class={
        pressed
          ? "ribbon-btn ribbon-btn--icon ribbon-btn--on"
          : "ribbon-btn ribbon-btn--icon"
      }
      title={label}
      aria-label={label}
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

function Sep() {
  return <span class="ribbon-sep" aria-hidden="true" />;
}

export function EditRibbon() {
  const block = selectedBlock.value;
  const hasBlock = Boolean(block);
  const hasClip = Boolean(clipboardBlock.value);
  const locked = Boolean(block?.locked);
  const multi = selectedIds.value.length;
  const canGroup = multi >= 1 || hasBlock;
  const isGroup = block?.type === "group" || block?.type === "repeat";
  const [insertType, setInsertType] = useState<BlockType>("paragraph");
  const [gridMenu, setGridMenu] = useState(false);
  const p = prefs.value;
  const gridSize = p.gridSize ?? 16;

  return (
    <div
      class="edit-ribbon edit-ribbon--icons"
      data-tour="ribbon"
      role="toolbar"
      aria-label="Edit ribbon"
    >
      <div class="ribbon-group__actions" role="group" aria-label="Insert">
        <span class="ribbon-select">
          <select
            value={insertType}
            aria-label="Block type to insert"
            onChange={(e) => setInsertType(e.currentTarget.value as BlockType)}
          >
            {BLOCK_TOOLS.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </span>
        <span class="ribbon-select ribbon-select--narrow">
          <select
            value={insertPlacement.value}
            aria-label="Insert placement"
            title="Where inserted blocks land"
            onChange={(e) =>
              setInsertPlacement(e.currentTarget.value as typeof insertPlacement.value)
            }
          >
            <option value="cascade">Cascade</option>
            <option value="center">Center</option>
            <option value="margins">At margins</option>
          </select>
        </span>
        <button
          type="button"
          class="ribbon-btn"
          onClick={() => insertBlockPlaced(insertType)}
        >
          <Icon name="plus" size={14} />
          <span>Insert</span>
        </button>
      </div>
      <Sep />
      <div class="ribbon-group__actions" role="group" aria-label="Clipboard">
        <IconBtn icon="cut" label="Cut (Ctrl+X)" disabled={!hasBlock} onClick={cutSelected} />
        <IconBtn icon="copy" label="Copy (Ctrl+C)" disabled={!hasBlock} onClick={copySelected} />
        <IconBtn icon="paste" label="Paste (Ctrl+V)" disabled={!hasClip} onClick={pasteClipboard} />
        <IconBtn icon="duplicate" label="Duplicate (Ctrl+D)" disabled={!hasBlock} onClick={duplicateSelected} />
        <IconBtn icon="undo" label="Undo (Ctrl+Z)" disabled={!canUndo()} onClick={undoEdit} />
        <IconBtn icon="redo" label="Redo (Ctrl+Shift+Z)" disabled={!canRedo()} onClick={redoEdit} />
      </div>
      <Sep />
      <div class="ribbon-group__actions" role="group" aria-label="Group">
        <IconBtn
          icon="group"
          label="Group selection (Ctrl+G)"
          disabled={!canGroup}
          onClick={groupSelection}
        />
        <IconBtn
          icon="ungroup"
          label="Ungroup"
          disabled={!isGroup}
          onClick={ungroupSelection}
        />
        <IconBtn
          icon="object"
          label="Save group as custom object"
          disabled={!isGroup}
          onClick={() => {
            const name = window.prompt(
              "Custom object name",
              block?.name || "Letter header",
            );
            if (name) saveSelectionAsCustomObject(name);
          }}
        />
      </div>
      <Sep />
      <div class="ribbon-group__actions" role="group" aria-label="Arrange">
        <IconBtn icon="alignLeft" label="Align left" disabled={!hasBlock} onClick={() => alignSelected("left")} />
        <IconBtn icon="alignCenter" label="Align center" disabled={!hasBlock} onClick={() => alignSelected("center-x")} />
        <IconBtn icon="alignRight" label="Align right" disabled={!hasBlock} onClick={() => alignSelected("right")} />
        <IconBtn icon="alignTop" label="Align top" disabled={!hasBlock} onClick={() => alignSelected("top")} />
        <IconBtn icon="alignMiddle" label="Align middle" disabled={!hasBlock} onClick={() => alignSelected("middle")} />
        <IconBtn icon="alignBottom" label="Align bottom" disabled={!hasBlock} onClick={() => alignSelected("bottom")} />
        <IconBtn icon="bringToFront" label="Bring to front" disabled={!hasBlock} onClick={() => nudgeZOrder("front")} />
        <IconBtn icon="bringForward" label="Bring forward" disabled={!hasBlock} onClick={() => nudgeZOrder("forward")} />
        <IconBtn icon="sendBackward" label="Send backward" disabled={!hasBlock} onClick={() => nudgeZOrder("backward")} />
        <IconBtn icon="sendToBack" label="Send to back" disabled={!hasBlock} onClick={() => nudgeZOrder("back")} />
        <IconBtn
          icon={locked ? "unlock" : "lock"}
          label={locked ? "Unlock" : "Lock"}
          disabled={!hasBlock}
          pressed={locked}
          onClick={toggleLockSelected}
        />
      </div>
      <Sep />
      <div class="ribbon-group__actions" role="group" aria-label="Typography">
        <IconBtn
          icon="bold"
          label="Bold"
          disabled={!hasBlock}
          pressed={Number(block?.style.fontWeight) >= 600}
          onClick={() => {
            if (!block) return;
            const bold = Number(block.style.fontWeight) >= 600;
            updateBlock(block.id, { style: { fontWeight: bold ? 400 : 700 } }, { history: true });
          }}
        />
        <IconBtn
          icon="italic"
          label="Italic"
          disabled={!hasBlock}
          pressed={block?.style.fontStyle === "italic"}
          onClick={() => {
            if (!block) return;
            const on = block.style.fontStyle === "italic";
            updateBlock(
              block.id,
              { style: { fontStyle: on ? "normal" : "italic" } },
              { history: true },
            );
          }}
        />
        <IconBtn
          icon="underline"
          label="Underline"
          disabled={!hasBlock}
          pressed={block?.style.textDecoration === "underline"}
          onClick={() => {
            if (!block) return;
            const on = block.style.textDecoration === "underline";
            updateBlock(
              block.id,
              { style: { textDecoration: on ? "none" : "underline" } },
              { history: true },
            );
          }}
        />
        <IconBtn
          icon="alignTextLeft"
          label="Align text left"
          disabled={!hasBlock}
          pressed={block?.style.textAlign === "left" || !block?.style.textAlign}
          onClick={() =>
            block && updateBlock(block.id, { style: { textAlign: "left" } }, { history: true })
          }
        />
        <IconBtn
          icon="alignTextCenter"
          label="Align text center"
          disabled={!hasBlock}
          pressed={block?.style.textAlign === "center"}
          onClick={() =>
            block && updateBlock(block.id, { style: { textAlign: "center" } }, { history: true })
          }
        />
        <IconBtn
          icon="alignTextRight"
          label="Align text right"
          disabled={!hasBlock}
          pressed={block?.style.textAlign === "right"}
          onClick={() =>
            block && updateBlock(block.id, { style: { textAlign: "right" } }, { history: true })
          }
        />
      </div>
      <Sep />
      <div class="ribbon-group__actions" role="group" aria-label="Review">
        <IconBtn
          icon="comment"
          label="Add comment"
          disabled={!hasBlock}
          onClick={() => {
            const body = window.prompt("Comment text");
            if (body) addComment(body);
          }}
        />
        <IconBtn
          icon="messages"
          label="Toggle comments panel"
          pressed={inspectorTab.value === "comments"}
          onClick={() => {
            inspectorTab.value =
              inspectorTab.value === "comments" ? "props" : "comments";
          }}
        />
      </div>
      <Sep />
      <div class="ribbon-group__actions" role="group" aria-label="View">
        <span class="ribbon-pop__anchor">
          <IconBtn
            icon="grid"
            label="Grid options"
            pressed={p.showGrid || gridMenu}
            onClick={() => setGridMenu((v) => !v)}
          />
          {gridMenu && (
            <div class="ribbon-pop" role="menu" aria-label="Grid settings">
              <label class="ribbon-pop__row">
                <span>Cell size</span>
                <input
                  type="number"
                  min={4}
                  max={64}
                  step={2}
                  value={gridSize}
                  onChange={(e) =>
                    updatePrefs({
                      gridSize: Math.max(
                        4,
                        Math.min(64, Number(e.currentTarget.value) || 16),
                      ),
                    })
                  }
                />
              </label>
              <label class="ribbon-pop__row">
                <span>Style</span>
                <select
                  value={p.gridStyle ?? "lines"}
                  onChange={(e) =>
                    updatePrefs({
                      gridStyle: e.currentTarget.value === "dots" ? "dots" : "lines",
                    })
                  }
                >
                  <option value="lines">Lines</option>
                  <option value="dots">Dots</option>
                </select>
              </label>
              <label class="ribbon-pop__row ribbon-pop__row--check">
                <input
                  type="checkbox"
                  checked={p.gridLock === true}
                  onChange={(e) => updatePrefs({ gridLock: e.currentTarget.checked })}
                />
                <span>Lock to grid (magnet)</span>
              </label>
              <label class="ribbon-pop__row ribbon-pop__row--check">
                <input
                  type="checkbox"
                  checked={p.showMarginGuides !== false}
                  onChange={(e) =>
                    updatePrefs({ showMarginGuides: e.currentTarget.checked })
                  }
                />
                <span>Margin guides</span>
              </label>
            </div>
          )}
        </span>
        <IconBtn
          icon="magnet"
          label="Lock to grid"
          pressed={p.gridLock === true}
          onClick={() => updatePrefs({ gridLock: p.gridLock !== true })}
        />
        <IconBtn
          icon="crosshair"
          label="Toggle snap"
          pressed={p.snap}
          onClick={() => updatePrefs({ snap: !p.snap })}
        />
        <IconBtn
          icon="ruler"
          label="Toggle rulers"
          pressed={prefs.value.showRulers !== false}
          onClick={() =>
            updatePrefs({ showRulers: prefs.value.showRulers === false })
          }
        />
        <IconBtn
          icon="users"
          label="Show comment markers"
          pressed={prefs.value.showComments !== false}
          onClick={() =>
            updatePrefs({
              showComments: prefs.value.showComments === false,
            })
          }
        />
      </div>
    </div>
  );
}
