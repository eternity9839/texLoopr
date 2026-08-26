import { useRef, useState } from "preact/hooks";
import { importPdfStructureBackend } from "../../model/backend";
import { loadImportedProject } from "../../state/store";

function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function usePdfImport(onDone?: () => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setStatus("Reading PDF…");
    try {
      const buf = await file.arrayBuffer();
      const bytesBase64 = bytesToBase64(buf);
      setStatus("Importing…");
      const result = await importPdfStructureBackend(
        { bytesBase64 },
        (p) => {
          if (p.phase === "page") {
            setStatus(`Importing page ${p.page} / ${p.total}…`);
          } else if (p.phase === "done") {
            setStatus("Finishing…");
          }
        },
      );
      if (!result) {
        setError(
          "PDF import requires the Rust backend (desktop app, or apiBaseUrl pointing at /v1).",
        );
        return;
      }
      loadImportedProject(result.project, result.warnings);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStatus("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      class="sr-only"
      aria-hidden="true"
      tabIndex={-1}
      onChange={(e) => void onFile(e.currentTarget.files?.[0])}
    />
  );

  const modal = busy ? (
    <div class="pdf-import-modal" role="dialog" aria-modal="true" aria-busy="true">
      <div class="pdf-import-modal__card">
        <p class="pdf-import-modal__title">Importing PDF</p>
        <p class="pdf-import-modal__status">{status || "Working…"}</p>
        <div class="pdf-import-modal__bar" aria-hidden="true" />
      </div>
    </div>
  ) : error ? (
    <div class="pdf-import-modal" role="alertdialog">
      <div class="pdf-import-modal__card">
        <p class="pdf-import-modal__title">Import failed</p>
        <p class="pdf-import-modal__error">{error}</p>
        <button type="button" onClick={() => setError(null)}>
          Close
        </button>
      </div>
    </div>
  ) : null;

  return { openPicker, fileInput, modal, busy };
}
