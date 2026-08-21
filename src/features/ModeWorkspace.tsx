import { useEffect } from "preact/hooks";
import {
  studioView,
  previewMode,
  setPreviewMode,
  overlay,
} from "../state/store";
import { AppShell } from "../ui/AppShell";
import { EditStudio } from "./studio/EditStudio";
import { DataStudio } from "./studio/DataStudio";
import { StudioOverlay } from "./overlays/StudioOverlay";
import { EditionTour } from "./tour/EditionTour";

export function ModeWorkspace() {
  const view = studioView.value;
  const body = view === "data" ? <DataStudio /> : <EditStudio />;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== ".") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (overlay.value) return;
      if (studioView.value !== "edit") return;
      e.preventDefault();
      setPreviewMode(!previewMode.value);
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
