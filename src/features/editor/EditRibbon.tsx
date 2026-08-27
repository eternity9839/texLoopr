import { Icon, type IconName } from "../../ui/icons";
import {
  alignSelected,
  canRedo,
  canUndo,
  clipboardBlocks,
  copySelected,
  cutSelected,
  duplicateSelected,
  groupSelection,
  nudgeZOrder,
  pasteClipboard,
  redoEdit,
  saveSelectionAsCustomObject,
  selectedBlock,
  selectedIds,
  toggleLockSelected,
  undoEdit,
  ungroupSelection,
  addComment,
  inspectorTab,
} from "../../state/store";
import { InlineFormatToolbar } from "./InlineFormatToolbar";
import { textEditSession } from "./textEditSession";

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

/** Contextual selection bar — clipboard, arrange, review. No insert/typography. */
export function EditRibbon() {
  const block = selectedBlock.value;
  const hasBlock = Boolean(block);
  const hasClip = clipboardBlocks.value.length > 0;
  const locked = Boolean(block?.locked);
  const multi = selectedIds.value.length;
  const canGroup = multi >= 1 || hasBlock;
  const isGroup = block?.type === "group" || block?.type === "repeat";
  const textEditing = Boolean(textEditSession.value);

  if (!hasBlock && !hasClip && !textEditing) return null;

  return (
    <div
      class="edit-ribbon edit-ribbon--icons edit-ribbon--context"
      data-tour="ribbon"
      role="toolbar"
      aria-label="Selection actions"
    >
      <div class="ribbon-group__actions" role="group" aria-label="Clipboard">
        <IconBtn icon="cut" label="Cut (Ctrl+X)" disabled={!hasBlock} onClick={cutSelected} />
        <IconBtn icon="copy" label="Copy (Ctrl+C)" disabled={!hasBlock} onClick={copySelected} />
        <IconBtn icon="paste" label="Paste (Ctrl+V)" disabled={!hasClip} onClick={pasteClipboard} />
        <IconBtn icon="duplicate" label="Duplicate (Ctrl+D)" disabled={!hasBlock} onClick={duplicateSelected} />
        <IconBtn icon="undo" label="Undo (Ctrl+Z)" disabled={!canUndo()} onClick={undoEdit} />
        <IconBtn icon="redo" label="Redo (Ctrl+Shift+Z)" disabled={!canRedo()} onClick={redoEdit} />
      </div>
      {textEditing && (
        <>
          <Sep />
          <InlineFormatToolbar />
        </>
      )}
      {hasBlock && (
        <>
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
            <IconBtn icon="alignLeft" label="Align left" onClick={() => alignSelected("left")} />
            <IconBtn icon="alignCenter" label="Align center" onClick={() => alignSelected("center-x")} />
            <IconBtn icon="alignRight" label="Align right" onClick={() => alignSelected("right")} />
            <IconBtn icon="alignTop" label="Align top" onClick={() => alignSelected("top")} />
            <IconBtn icon="alignMiddle" label="Align middle" onClick={() => alignSelected("middle")} />
            <IconBtn icon="alignBottom" label="Align bottom" onClick={() => alignSelected("bottom")} />
            <IconBtn icon="bringToFront" label="Bring to front" onClick={() => nudgeZOrder("front")} />
            <IconBtn icon="bringForward" label="Bring forward" onClick={() => nudgeZOrder("forward")} />
            <IconBtn icon="sendBackward" label="Send backward" onClick={() => nudgeZOrder("backward")} />
            <IconBtn icon="sendToBack" label="Send to back" onClick={() => nudgeZOrder("back")} />
            <IconBtn
              icon={locked ? "unlock" : "lock"}
              label={locked ? "Unlock" : "Lock"}
              pressed={locked}
              onClick={toggleLockSelected}
            />
          </div>
          <Sep />
          <div class="ribbon-group__actions" role="group" aria-label="Review">
            <IconBtn
              icon="comment"
              label="Add comment"
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
                  inspectorTab.value === "comments" ? "design" : "comments";
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
