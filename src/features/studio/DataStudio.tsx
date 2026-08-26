import { useEffect, useRef, useState } from "preact/hooks";
import {
  dataRows,
  dataStudioFocus,
  previewRowIndex,
  project,
  setActiveOutputId,
  setDataFromText,
  setPreviewRowIndex,
  updateProject,
} from "../../state/store";
import {
  clearStickyIssues,
  openIssuesPanel,
  reportStickyIssue,
} from "../../state/issueLog";
import { createId, ensureProjectAutomation } from "../../model/document";
import { SAMPLE_CSV, type DataRow } from "../../model/bindings";
import type { ProjectDataset } from "../../model/document";
import type { ExprValue } from "../../model/expr";
import { OUTPUT_KIND_LABEL } from "../../model/workflow";
import { t } from "../../i18n";
import {
  cellDisplaySummary,
  complexFieldKeys,
  formatCellEditor,
  isComplexValue,
  isObjectArray,
  nestedTableHeaders,
  parseCellEditor,
} from "../../model/dataCell";
import { StudioLayout } from "../../ui/StudioLayout";
import { HierarchyPanel } from "../tree/HierarchyPanel";

function ensureDatasets(draft: {
  datasets?: ProjectDataset[];
  primaryDatasetId?: string;
}): ProjectDataset[] {
  if (draft.datasets?.length) return draft.datasets;
  const id = createId();
  draft.datasets = [{ id, name: "primary", rows: [] }];
  draft.primaryDatasetId = id;
  return draft.datasets;
}

function syncRowsToPrimary(rows: DataRow[]): void {
  dataRows.value = rows;
  updateProject((draft) => {
    const list = ensureDatasets(draft);
    const primary =
      list.find((d) => d.id === draft.primaryDatasetId) ?? list[0]!;
    primary.rows = rows as ProjectDataset["rows"];
    return draft;
  });
}

function scalarInputValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return cellDisplaySummary(v);
}

function NestedJsonEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: ExprValue) => void;
}) {
  const [draft, setDraft] = useState(() => formatCellEditor(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(formatCellEditor(value));
    setError(null);
  }, [value]);

  const commit = () => {
    try {
      const next = parseCellEditor(draft, value);
      onChange(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  return (
    <div class="data-studio__nested-json">
      <textarea
        class="data-studio__nested-json-input"
        value={draft}
        spellcheck={false}
        onInput={(e) => {
          setDraft(e.currentTarget.value);
          setError(null);
        }}
        onBlur={commit}
      />
      {error && <p class="data-studio__nested-error">{error}</p>}
    </div>
  );
}

function NestedArrayTable({
  field,
  rows,
  onChange,
}: {
  field: string;
  rows: Record<string, ExprValue>[];
  onChange: (next: Record<string, ExprValue>[]) => void;
}) {
  const headers = nestedTableHeaders(rows);

  const setNestedCell = (
    ri: number,
    key: string,
    raw: string,
    previous: unknown,
  ) => {
    const next = rows.map((r, i) =>
      i === ri ? { ...r, [key]: parseCellEditor(raw, previous) } : r,
    );
    onChange(next);
  };

  const addNestedRow = () => {
    const blank: Record<string, ExprValue> = {};
    for (const h of headers.length ? headers : ["col1"]) blank[h] = "";
    onChange([...rows, blank]);
  };

  const removeNestedRow = (ri: number) => {
    onChange(rows.filter((_, i) => i !== ri));
  };

  return (
    <div class="data-studio__nested-table-wrap">
      <div class="data-studio__nested-actions">
        <button type="button" class="btn btn--small" onClick={addNestedRow}>
          Add {field} row
        </button>
      </div>
      <table class="data-studio__nested-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {headers.map((h) => {
                const cell = row[h];
                const complex = isComplexValue(cell);
                return (
                  <td key={h}>
                    {complex ? (
                      <button
                        type="button"
                        class="data-studio__complex-chip"
                        title="Edit as JSON below"
                      >
                        {cellDisplaySummary(cell)}
                      </button>
                    ) : (
                      <input
                        value={scalarInputValue(cell)}
                        onInput={(e) =>
                          setNestedCell(ri, h, e.currentTarget.value, cell)
                        }
                      />
                    )}
                  </td>
                );
              })}
              <td>
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() => removeNestedRow(ri)}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Editable empty grid + named datasets (no default Ada CSV). */
export function DataStudio() {
  const proj = ensureProjectAutomation(project.value);
  const datasets = ensureDatasetsRead(proj);
  const primaryId = proj.primaryDatasetId ?? datasets[0]?.id;
  const activeDs =
    datasets.find((d) => d.id === primaryId) ?? datasets[0]!;
  const rows = dataRows.value;
  const active = previewRowIndex.value;
  const outputs = (proj.outputs ?? []).filter((o) => o.enabled !== false);
  const activeOutputId = proj.activeOutputId ?? outputs[0]?.id ?? "";
  const [importOpen, setImportOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [newCol, setNewCol] = useState("");
  const [nestedTab, setNestedTab] = useState<string | null>(null);
  const [focusColumn, setFocusColumn] = useState<string | null>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const pendingFocus = dataStudioFocus.value;

  useEffect(() => {
    if (!pendingFocus?.column) return;
    const { column, nestedTab: focusNested } = pendingFocus;
    dataStudioFocus.value = null;
    setFocusColumn(column);
    if (focusNested) {
      setNestedTab(focusNested);
    } else {
      const row = dataRows.value[previewRowIndex.value];
      if (row && isComplexValue(row[column])) {
        setNestedTab(column);
      }
    }
    requestAnimationFrame(() => {
      const wrap = tableWrapRef.current;
      if (!wrap) return;
      const colEl = wrap.querySelector(
        `[data-column="${CSS.escape(column)}"]`,
      );
      colEl?.scrollIntoView({ block: "nearest", inline: "nearest" });
      const input = wrap.querySelector(
        `[data-column="${CSS.escape(column)}"] input`,
      );
      if (input instanceof HTMLInputElement) {
        input.focus({ preventScroll: true });
      }
    });
    const timer = window.setTimeout(() => setFocusColumn(null), 2000);
    return () => window.clearTimeout(timer);
  }, [pendingFocus?.column, pendingFocus?.nestedTab]);

  const headers =
    rows[0] && Object.keys(rows[0]).length
      ? Object.keys(rows[0])
      : activeDs.rows[0]
        ? Object.keys(activeDs.rows[0])
        : [];

  const activeRow = rows[active];
  const nestedFields = activeRow ? complexFieldKeys(activeRow) : [];

  useEffect(() => {
    if (!nestedFields.length) {
      setNestedTab(null);
      return;
    }
    if (!nestedTab || !nestedFields.includes(nestedTab)) {
      setNestedTab(nestedFields[0]!);
    }
  }, [active, nestedFields.join("|")]);

  const applyImport = async () => {
    try {
      await setDataFromText(raw);
      syncRowsToPrimary(dataRows.value);
      setError(null);
      clearStickyIssues("data");
      setImportOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid data";
      setError(message);
      reportStickyIssue({
        category: "data-parse",
        severity: "error",
        message: `Data import failed: ${message}`,
        source: "data",
      });
      openIssuesPanel(true);
    }
  };

  const addRow = () => {
    const blank: DataRow = {};
    for (const h of headers.length ? headers : ["col1"]) blank[h] = "";
    const next = [...rows, blank];
    if (!headers.length) {
      blank.col1 = "";
    }
    syncRowsToPrimary(next);
    setPreviewRowIndex(next.length - 1);
  };

  const addColumn = () => {
    const name = newCol.trim() || `col${headers.length + 1}`;
    if (headers.includes(name)) return;
    const next = rows.length
      ? rows.map((r) => ({ ...r, [name]: "" }))
      : [{ [name]: "" } as DataRow];
    syncRowsToPrimary(next);
    setNewCol("");
  };

  const setCell = (ri: number, key: string, value: string, previous: unknown) => {
    const next = rows.map((r, i) =>
      i === ri ? { ...r, [key]: parseCellEditor(value, previous) } : { ...r },
    );
    syncRowsToPrimary(next);
  };

  const setNestedField = (ri: number, key: string, value: ExprValue) => {
    const next = rows.map((r, i) => (i === ri ? { ...r, [key]: value } : r));
    syncRowsToPrimary(next);
  };

  const removeRow = (ri: number) => {
    const next = rows.filter((_, i) => i !== ri);
    syncRowsToPrimary(next);
    if (previewRowIndex.value >= next.length) {
      setPreviewRowIndex(Math.max(0, next.length - 1));
    }
  };

  const switchDataset = (id: string) => {
    updateProject((draft) => {
      const list = ensureDatasets(draft);
      const cur =
        list.find((d) => d.id === draft.primaryDatasetId) ?? list[0]!;
      cur.rows = dataRows.value as ProjectDataset["rows"];
      draft.primaryDatasetId = id;
      const next = list.find((d) => d.id === id)!;
      dataRows.value = next.rows as DataRow[];
      previewRowIndex.value = 0;
      return draft;
    });
  };

  const addDataset = () => {
    const id = createId();
    updateProject((draft) => {
      const list = ensureDatasets(draft);
      list.push({ id, name: `dataset_${(proj.datasets?.length ?? 0) + 1}`, keyField: "id", rows: [] });
      draft.primaryDatasetId = id;
      dataRows.value = [];
      previewRowIndex.value = 0;
      return draft;
    });
  };

  const setKeyField = (keyField: string) => {
    updateProject((draft) => {
      const list = ensureDatasets(draft);
      const ds = list.find((d) => d.id === draft.primaryDatasetId) ?? list[0]!;
      ds.keyField = keyField || undefined;
      return draft;
    });
  };

  const renameDataset = (name: string) => {
    updateProject((draft) => {
      const list = ensureDatasets(draft);
      const ds = list.find((d) => d.id === draft.primaryDatasetId) ?? list[0]!;
      ds.name = name.trim() || ds.name;
      return draft;
    });
  };

  const nestedValue = nestedTab && activeRow ? activeRow[nestedTab] : undefined;

  return (
    <StudioLayout
      variant="aux"
      navigator={<HierarchyPanel />}
      main={
        <div data-tour="data-studio" class="data-studio">
          <div class="view-toolbar">
            <span class="muted">
              Edit rows for merge fields. Scalars inline; arrays/objects open in
              nested tabs below. Use <code>{"{{field}}"}</code> or{" "}
              <code>{"lookup('salary', id, 'amount')"}</code> in Preview.
              {(headers.includes("language") || headers.includes("lang")) && (
                <>
                  {" "}
                  Column <code>language</code>/<code>lang</code> drives{" "}
                  <code>vars.language</code> for multi-language templates.
                </>
              )}
            </span>
          </div>
          <div class="view-body data-studio__body">
            <div class="data-studio__datasets" role="tablist" aria-label="Datasets">
              {datasets.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  role="tab"
                  class={
                    d.id === activeDs.id
                      ? "data-studio__tab data-studio__tab--on"
                      : "data-studio__tab"
                  }
                  aria-selected={d.id === activeDs.id}
                  onClick={() => switchDataset(d.id)}
                >
                  {d.name}
                </button>
              ))}
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={addDataset}
              >
                + Dataset
              </button>
            </div>

            <div class="data-studio__meta field-row">
              <label>
                Name
                <input
                  value={activeDs.name}
                  onChange={(e) => renameDataset(e.currentTarget.value)}
                />
              </label>
              <label>
                Key field
                <input
                  placeholder="id"
                  value={activeDs.keyField ?? ""}
                  onChange={(e) => setKeyField(e.currentTarget.value)}
                  title="Join key for lookup() from the primary row"
                />
              </label>
              <label>
                {t("renderOutput")}
                <select
                  value={activeOutputId}
                  onChange={(e) => setActiveOutputId(e.currentTarget.value)}
                  aria-label={t("renderOutput")}
                >
                  {outputs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({OUTPUT_KIND_LABEL[o.kind] ?? o.kind})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div class="data-studio__actions field-row">
              <button type="button" class="btn btn--small" onClick={addRow}>
                Add row
              </button>
              <input
                placeholder="New column"
                value={newCol}
                onInput={(e) => setNewCol(e.currentTarget.value)}
              />
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={addColumn}
              >
                Add column
              </button>
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() => setImportOpen((v) => !v)}
              >
                {importOpen ? "Hide import" : "Paste CSV/JSON…"}
              </button>
              <button
                type="button"
                class="btn btn--ghost btn--small"
                onClick={() => {
                  void (async () => {
                    setRaw(SAMPLE_CSV);
                    await setDataFromText(SAMPLE_CSV);
                    syncRowsToPrimary(dataRows.value);
                    setError(null);
                  })();
                }}
              >
                Load sample CSV
              </button>
            </div>

            {importOpen && (
              <div class="field">
                <label for="data-raw">Import</label>
                <textarea
                  id="data-raw"
                  class="data-studio__import"
                  value={raw}
                  placeholder="Paste CSV or JSON array…"
                  onInput={(e) => setRaw(e.currentTarget.value)}
                />
                <button
                  type="button"
                  class="btn btn--small"
                  onClick={() => void applyImport()}
                >
                  Apply import
                </button>
              </div>
            )}
            {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

            {rows.length === 0 && headers.length === 0 ? (
              <p class="muted">
                Empty dataset — add a column or row, or paste CSV/JSON.
              </p>
            ) : (
              <div class="data-studio__table-wrap" ref={tableWrapRef}>
                <table class="data-studio__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {(headers.length ? headers : ["col1"]).map((h) => (
                        <th
                          key={h}
                          data-column={h}
                          class={
                            focusColumn === h
                              ? "data-studio__col--focus"
                              : undefined
                          }
                        >
                          {h}
                        </th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr
                        key={ri}
                        class={ri === active ? "data-studio__row--on" : undefined}
                        onClick={() => setPreviewRowIndex(ri)}
                      >
                        <td>{ri + 1}</td>
                        {(headers.length ? headers : ["col1"]).map((h) => {
                          const cell = row[h];
                          const complex = isComplexValue(cell);
                          return (
                            <td
                              key={h}
                              data-column={h}
                              class={
                                focusColumn === h
                                  ? "data-studio__col--focus"
                                  : undefined
                              }
                              onClick={(e) => complex && e.stopPropagation()}
                            >
                              {complex ? (
                                <button
                                  type="button"
                                  class={
                                    ri === active && nestedTab === h
                                      ? "data-studio__complex-chip data-studio__complex-chip--on"
                                      : "data-studio__complex-chip"
                                  }
                                  onClick={() => {
                                    setPreviewRowIndex(ri);
                                    setNestedTab(h);
                                  }}
                                >
                                  {cellDisplaySummary(cell)}
                                </button>
                              ) : (
                                <input
                                  value={scalarInputValue(cell)}
                                  onInput={(e) =>
                                    setCell(ri, h, e.currentTarget.value, cell)
                                  }
                                />
                              )}
                            </td>
                          );
                        })}
                        <td>
                          <button
                            type="button"
                            class="btn btn--ghost btn--small"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRow(ri);
                            }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeRow && nestedFields.length > 0 && (
              <section class="data-studio__nested" aria-label="Nested data">
                <div class="data-studio__nested-head">
                  <span class="data-studio__nested-title">
                    Row {active + 1} — nested fields
                  </span>
                  <div class="data-studio__nested-tabs" role="tablist">
                    {nestedFields.map((field) => (
                      <button
                        type="button"
                        key={field}
                        role="tab"
                        class={
                          nestedTab === field
                            ? "data-studio__tab data-studio__tab--on"
                            : "data-studio__tab"
                        }
                        aria-selected={nestedTab === field}
                        onClick={() => setNestedTab(field)}
                      >
                        {field}
                      </button>
                    ))}
                  </div>
                </div>
                {nestedTab && nestedValue !== undefined && (
                  <div class="data-studio__nested-body">
                    {isObjectArray(nestedValue) ? (
                      <NestedArrayTable
                        field={nestedTab}
                        rows={nestedValue}
                        onChange={(next) => setNestedField(active, nestedTab, next)}
                      />
                    ) : (
                      <NestedJsonEditor
                        value={nestedValue}
                        onChange={(next) => setNestedField(active, nestedTab, next)}
                      />
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      }
    />
  );
}

function ensureDatasetsRead(proj: {
  datasets?: ProjectDataset[];
  primaryDatasetId?: string;
}): ProjectDataset[] {
  if (proj.datasets?.length) return proj.datasets;
  return [{ id: "primary", name: "primary", rows: [] }];
}
