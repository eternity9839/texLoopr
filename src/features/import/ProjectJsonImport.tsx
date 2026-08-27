import { useRef, useState } from "preact/hooks";
import type { Project } from "../../model/document";
import { ensureProjectAutomation } from "../../model/document";
import { loadImportedProject } from "../../state/store";

function isProjectJson(raw: unknown): raw is Project {
  if (!raw || typeof raw !== "object") return false;
  const doc = raw as Project;
  return Array.isArray(doc.pages) && doc.pages.length > 0;
}

export function useProjectJsonImport(onDone?: () => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isProjectJson(parsed)) {
        setError("Invalid project JSON — expected a document with pages.");
        return;
      }
      loadImportedProject(ensureProjectAutomation(parsed));
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".json,application/json"
      hidden
      onChange={(e) => void onFile(e.currentTarget.files?.[0])}
    />
  );

  const modal = error ? (
    <div class="pdf-import-modal" role="alertdialog">
      <div class="pdf-import-modal__card">
        <p class="pdf-import-modal__title">Could not open project</p>
        <p class="pdf-import-modal__error">{error}</p>
        <button type="button" class="btn btn--small" onClick={() => setError(null)}>
          Close
        </button>
      </div>
    </div>
  ) : null;

  return { openPicker, fileInput, modal, error };
}

/** Load a bundled project from `./projects/*.json` (hosted demo, dev server, or Tauri). */
export async function loadBundledProjectJson(path: string): Promise<void> {
  const rel = path.startsWith("/")
    ? path.slice(1)
    : path.startsWith("projects/")
      ? path
      : `projects/${path}`;
  const url = `./${rel}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not load ${url} (${res.status})`);
  }
  const parsed: unknown = await res.json();
  if (!isProjectJson(parsed)) {
    throw new Error("Invalid project JSON — expected a document with pages.");
  }
  loadImportedProject(ensureProjectAutomation(parsed));
}
