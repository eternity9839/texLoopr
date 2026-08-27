import { useState } from "preact/hooks";
import type { ProjectDataset } from "../../model/document";
import {
  defaultSourceForKind,
  type DataSourceConfig,
  type DataSourceKind,
  type DataSourceRefresh,
} from "../../model/dataSources";
import {
  refreshDataset,
  updateDatasetSource,
} from "../../state/store";
import { getApiBaseUrl } from "../../runtimeConfig";
import { t } from "../../i18n";

const KINDS: { value: DataSourceKind; labelKey: Parameters<typeof t>[0] }[] = [
  { value: "none", labelKey: "dataSourceNone" },
  { value: "csv", labelKey: "dataSourceCsv" },
  { value: "json", labelKey: "dataSourceJson" },
  { value: "xml", labelKey: "dataSourceXml" },
  { value: "http", labelKey: "dataSourceHttp" },
  { value: "sql", labelKey: "dataSourceSql" },
  { value: "inbound", labelKey: "dataSourceInbound" },
];

export function DatasetSourcePanel({
  dataset,
  catalogProjectId,
}: {
  dataset: ProjectDataset;
  catalogProjectId: string | null;
}) {
  const source = dataset.source ?? { kind: "none" as const };
  const refresh: DataSourceRefresh = dataset.refresh ?? { mode: "manual" };
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const setSource = (next: DataSourceConfig) => {
    updateDatasetSource(dataset.id, { source: next });
  };

  const setRefresh = (next: DataSourceRefresh) => {
    updateDatasetSource(dataset.id, { refresh: next });
  };

  const onRefresh = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await refreshDataset(dataset.id);
      setMsg(t("dataSourceRefreshOk"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const ingestUrl = (() => {
    const base = getApiBaseUrl()?.replace(/\/$/, "");
    if (!base || source.kind !== "inbound") return null;
    const q = catalogProjectId
      ? `?projectId=${encodeURIComponent(catalogProjectId)}`
      : "";
    return `${base}/v1/data/sources/${encodeURIComponent(dataset.id)}/ingest${q}`;
  })();

  return (
    <div class="data-source-panel" data-testid="dataset-source-panel">
      <div class="prop-grid prop-grid--2">
        <label class="field">
          <span class="field__label">{t("dataSourceKind")}</span>
          <select
            value={source.kind}
            onChange={(e) => {
              const kind = e.currentTarget.value as DataSourceKind;
              setSource(defaultSourceForKind(kind));
              if (kind === "inbound") {
                setRefresh({ mode: "inbound" });
              } else if (refresh.mode === "inbound") {
                setRefresh({ mode: "manual" });
              }
            }}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {t(k.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label class="field">
          <span class="field__label">{t("dataSourceRefreshMode")}</span>
          <select
            value={refresh.mode}
            onChange={(e) => {
              const mode = e.currentTarget.value as DataSourceRefresh["mode"];
              setRefresh({
                mode,
                intervalMs:
                  mode === "interval"
                    ? Math.max(5000, refresh.intervalMs ?? 60_000)
                    : refresh.intervalMs,
              });
            }}
          >
            <option value="manual">{t("dataSourceRefreshManual")}</option>
            <option value="interval">{t("dataSourceRefreshInterval")}</option>
            <option value="inbound">{t("dataSourceRefreshInbound")}</option>
          </select>
        </label>
      </div>

      {refresh.mode === "interval" && (
        <label class="field">
          <span class="field__label">{t("dataSourceIntervalMs")}</span>
          <input
            type="number"
            min={5000}
            step={1000}
            value={refresh.intervalMs ?? 60_000}
            onInput={(e) =>
              setRefresh({
                mode: "interval",
                intervalMs: Math.max(5000, Number(e.currentTarget.value) || 5000),
              })
            }
          />
          <p class="muted small">{t("dataSourceIntervalHint")}</p>
        </label>
      )}

      {(source.kind === "csv" ||
        source.kind === "json" ||
        source.kind === "xml") && (
        <>
          <label class="field">
            <span class="field__label">{t("dataSourceInline")}</span>
            <textarea
              rows={4}
              value={source.inline ?? ""}
              onInput={(e) =>
                setSource({ ...source, inline: e.currentTarget.value })
              }
              placeholder={
                source.kind === "xml"
                  ? "<root><item name=\"Ada\"/></root>"
                  : source.kind === "json"
                    ? '[{"name":"Ada"}]'
                    : "name,role\nAda,Math"
              }
            />
          </label>
          <label class="field">
            <span class="field__label">{t("dataSourcePath")}</span>
            <input
              value={source.path ?? ""}
              onInput={(e) =>
                setSource({
                  ...source,
                  path: e.currentTarget.value || undefined,
                })
              }
              placeholder="/path/to/file"
            />
          </label>
          {source.kind === "xml" && (
            <label class="field">
              <span class="field__label">{t("dataSourceRowPath")}</span>
              <input
                value={source.rowPath ?? ""}
                onInput={(e) =>
                  setSource({
                    ...source,
                    rowPath: e.currentTarget.value || undefined,
                  })
                }
                placeholder="catalog/book"
              />
            </label>
          )}
        </>
      )}

      {source.kind === "http" && (
        <>
          <label class="field">
            <span class="field__label">URL</span>
            <input
              value={source.url}
              onInput={(e) =>
                setSource({ ...source, url: e.currentTarget.value })
              }
              placeholder="https://…"
            />
          </label>
          <div class="prop-grid prop-grid--2">
            <label class="field">
              <span class="field__label">Method</span>
              <select
                value={source.method ?? "GET"}
                onChange={(e) =>
                  setSource({
                    ...source,
                    method: e.currentTarget.value as "GET" | "POST",
                  })
                }
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">{t("dataSourceFormat")}</span>
              <select
                value={source.responseFormat}
                onChange={(e) =>
                  setSource({
                    ...source,
                    responseFormat: e.currentTarget.value as
                      | "json"
                      | "xml"
                      | "csv",
                  })
                }
              >
                <option value="json">JSON</option>
                <option value="xml">XML</option>
                <option value="csv">CSV</option>
              </select>
            </label>
          </div>
          {source.responseFormat === "xml" && (
            <label class="field">
              <span class="field__label">{t("dataSourceRowPath")}</span>
              <input
                value={source.rowPath ?? ""}
                onInput={(e) =>
                  setSource({
                    ...source,
                    rowPath: e.currentTarget.value || undefined,
                  })
                }
              />
            </label>
          )}
          {source.method === "POST" && (
            <label class="field">
              <span class="field__label">Body</span>
              <textarea
                rows={3}
                value={source.body ?? ""}
                onInput={(e) =>
                  setSource({ ...source, body: e.currentTarget.value })
                }
              />
            </label>
          )}
        </>
      )}

      {source.kind === "sql" && (
        <>
          <div class="prop-grid prop-grid--2">
            <label class="field">
              <span class="field__label">Driver</span>
              <select
                value={source.driver}
                onChange={(e) =>
                  setSource({
                    ...source,
                    driver: e.currentTarget.value as "sqlite" | "postgres",
                  })
                }
              >
                <option value="sqlite">SQLite</option>
                <option value="postgres">Postgres (stub)</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">{t("dataSourceConnection")}</span>
              <input
                value={source.connection}
                onInput={(e) =>
                  setSource({ ...source, connection: e.currentTarget.value })
                }
                placeholder="/path/to.db"
              />
            </label>
          </div>
          <label class="field">
            <span class="field__label">SQL</span>
            <textarea
              rows={3}
              value={source.query}
              onInput={(e) =>
                setSource({ ...source, query: e.currentTarget.value })
              }
            />
          </label>
        </>
      )}

      {source.kind === "inbound" && (
        <>
          <label class="field">
            <span class="field__label">{t("dataSourceIngestSecret")}</span>
            <input
              value={source.secret ?? ""}
              onInput={(e) =>
                setSource({
                  ...source,
                  secret: e.currentTarget.value || undefined,
                })
              }
              placeholder="optional"
            />
          </label>
          <label class="field">
            <span class="field__label">{t("dataSourceFormat")}</span>
            <select
              value={source.responseFormat ?? "json"}
              onChange={(e) =>
                setSource({
                  ...source,
                  responseFormat: e.currentTarget.value as
                    | "json"
                    | "xml"
                    | "csv",
                })
              }
            >
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          {ingestUrl && (
            <p class="muted small">
              {t("dataSourceIngestUrl")}:{" "}
              <code class="data-source-panel__url">{ingestUrl}</code>
              <button
                type="button"
                class="btn btn--ghost btn--small"
                style={{ marginLeft: "0.35rem" }}
                onClick={() => void navigator.clipboard?.writeText(ingestUrl)}
              >
                {t("dataSourceCopyUrl")}
              </button>
            </p>
          )}
          {!ingestUrl && (
            <p class="muted small">{t("dataSourceIngestHint")}</p>
          )}
        </>
      )}

      <div class="prop-row prop-row--actions" style={{ marginTop: "0.5rem" }}>
        <button
          type="button"
          class="btn btn--ghost btn--small"
          disabled={busy || source.kind === "none"}
          onClick={() => void onRefresh()}
        >
          {busy ? "…" : t("dataSourceRefreshNow")}
        </button>
      </div>

      {dataset.lastLoadedAt && (
        <p class="muted small">
          {t("dataSourceLastLoaded")}: {dataset.lastLoadedAt}
        </p>
      )}
      {(dataset.lastError || msg) && (
        <p class="small" style={{ color: dataset.lastError ? "#b45309" : undefined }}>
          {dataset.lastError || msg}
        </p>
      )}
      {source.kind === "none" && rowsEmpty(dataset) && (
        <p class="muted small">{t("dataSourceEmptyHint")}</p>
      )}
    </div>
  );
}

function rowsEmpty(ds: ProjectDataset): boolean {
  return !ds.rows?.length;
}
