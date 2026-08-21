import { useState } from "preact/hooks";
import {
  dataRows,
  previewRowIndex,
  setDataFromText,
  setPreviewRowIndex,
} from "../../state/store";
import { SAMPLE_CSV } from "../../model/bindings";
import { StudioLayout } from "../../ui/StudioLayout";
import { Navigator } from "../tree/DocumentTree";

export function DataStudio() {
  const rows = dataRows.value;
  const active = previewRowIndex.value;
  const [raw, setRaw] = useState(SAMPLE_CSV);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    try {
      await setDataFromText(raw);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid data");
    }
  };

  const headers = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <StudioLayout
      variant="aux"
      navigator={<Navigator />}
      main={
        <div data-tour="data-studio">
          <div class="view-toolbar">
            <span class="muted">
              Paste JSON or CSV. Use <code>{"{{field}}"}</code> in Edit; use
              Preview on the Edit view to resolve the selected row.
            </span>
          </div>
          <div class="view-body">
            <div class="field">
              <label for="data-raw">Dataset</label>
              <textarea
                id="data-raw"
                style={{
                  minHeight: "10rem",
                  fontFamily: "ui-monospace, monospace",
                }}
                value={raw}
                onInput={(e) => setRaw(e.currentTarget.value)}
              />
            </div>
            {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1rem",
                flexWrap: "wrap",
              }}
            >
              <button type="button" class="btn" onClick={() => void apply()}>
                Apply data
              </button>
              <button
                type="button"
                class="btn btn--ghost"
                onClick={() => {
                  void (async () => {
                    setRaw(SAMPLE_CSV);
                    await setDataFromText(SAMPLE_CSV);
                    setError(null);
                  })();
                }}
              >
                Load sample CSV
              </button>
            </div>
            {rows.length > 0 ? (
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      aria-selected={i === active}
                      onClick={() => setPreviewRowIndex(i)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{i + 1}</td>
                      {headers.map((h) => (
                        <td key={h}>{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p class="empty-hint">No rows loaded.</p>
            )}
          </div>
        </div>
      }
    />
  );
}
