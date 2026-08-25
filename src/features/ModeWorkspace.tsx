import { useEffect } from "preact/hooks";
import {
  studioView,
  previewMode,
  setPreviewMode,
  overlay,
  cyclePreviewRow,
  cycleActiveOutput,
} from "../state/store";
import { handleEditStudioKeydown } from "./editor/editorShortcuts";
import { AppShell } from "../ui/AppShell";
import { EditStudio } from "./studio/EditStudio";
import { DataStudio } from "./studio/DataStudio";
import { StudioOverlay } from "./overlays/StudioOverlay";
import { EditionTour } from "./tour/EditionTour";

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT" ||
    t.isContentEditable
  );
}

export function ModeWorkspace() {
  const view = studioView.value;
  const body = view === "data" ? <DataStudio /> : <EditStudio />;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        handleEditStudioKeydown(e, {
          preview: previewMode.value,
          overlayOpen: Boolean(overlay.value),
          studioView: studioView.value,
        })
      ) {
        return;
      }
      if (overlay.value) return;
      if (studioView.value !== "edit") return;
      if (isTypingTarget(e.target)) return;

      // Ctrl/⌘ + . — toggle preview
      if ((e.ctrlKey || e.metaKey) && e.key === ".") {
        e.preventDefault();
        setPreviewMode(!previewMode.value);
        return;
      }

      if (!previewMode.value) return;

      // Preview navigation (only while Preview is on).
      // Use e.code so Shift+[ still matches BracketLeft (e.key becomes "{").
      if (e.code === "BracketLeft" || e.code === "BracketRight") {
        e.preventDefault();
        const back = e.code === "BracketLeft";
        if (e.shiftKey) cycleActiveOutput(back ? -1 : 1);
        else cyclePreviewRow(back ? -1 : 1);
        return;
      }
      if (
        e.altKey &&
        (e.code === "ArrowLeft" || e.code === "ArrowRight")
      ) {
        e.preventDefault();
        const back = e.code === "ArrowLeft";
        if (e.shiftKey) cycleActiveOutput(back ? -1 : 1);
        else cyclePreviewRow(back ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AppShell>
      {body}
      <StudioOverlay />
      <EditionTour />
    </AppShell>
  );
}
