import { Icon, type IconName } from "../../ui/icons";
import {
  alignSelected,
  canRedo,
  canUndo,
  clipboardBlock,
  copySelected,
  cutSelected,
  duplicateSelected,
  groupSelection,
  nudgeZOrder,
  pasteClipboard,
  prefs,
  redoEdit,
  saveSelectionAsCustomObject,
  selectedBlock,
  selectedIds,
  toggleLockSelected,
  undoEdit,
  ungroupSelection,
  updateBlock,
  updatePrefs,
  addComment,
  inspectorTab,
} from "../../state/store";

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

  return (
    <div
      class="edit-ribbon edit-ribbon--icons"
      data-tour="ribbon"
      role="toolbar"
      aria-label="Edit ribbon"
    >
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
        <IconBtn
          icon="grid"
          label="Toggle grid"
          pressed={prefs.value.showGrid}
          onClick={() => updatePrefs({ showGrid: !prefs.value.showGrid })}
        />
        <IconBtn
          icon="crosshair"
          label="Toggle snap"
          pressed={prefs.value.snap}
          onClick={() => updatePrefs({ snap: !prefs.value.snap })}
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
