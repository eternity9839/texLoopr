import { useEffect, useState } from "preact/hooks";
import { getCatalog, type ProjectSummary } from "../../storage/catalog";
import {
  catalogBackend,
  catalogProjectId,
  openCatalogProject,
  persistActiveToCatalog,
  project,
} from "../../state/store";

export function CatalogPanel() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [dbPath, setDbPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fsAlias, setFsAlias] = useState("workspace");
  const [fsRoot, setFsRoot] = useState("");
  const activeId = catalogProjectId.value;

  const refresh = async () => {
    try {
      const catalog = await getCatalog();
      setProjects(await catalog.listProjects());
      setDbPath(await catalog.dbPath());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void refresh();
  }, [activeId, catalogBackend.value]);

  return (
    <div class="panel-pad">
      <p class="muted" style={{ fontSize: "var(--text-xs)", marginTop: 0 }}>
        Backend: {catalogBackend.value ?? "…"} · Only the active project stays in
        memory / temp; others live in the database.
      </p>
      <p class="muted" style={{ fontSize: "var(--text-xs)", wordBreak: "break-all" }}>
        {dbPath}
      </p>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <button
          type="button"
          class="btn btn--small"
          onClick={() => void persistActiveToCatalog().then(refresh)}
        >
          Save active to DB
        </button>
        <button type="button" class="btn btn--ghost btn--small" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      <ul class="tree">
        {projects.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-current={p.id === activeId}
              onClick={() => void openCatalogProject(p.id).then(refresh)}
            >
              {p.name}
              {p.isActive || p.id === activeId ? " · active" : ""}
            </button>
          </li>
        ))}
      </ul>
      {projects.length === 0 && (
        <p class="empty-hint">No stored projects yet. Save the active one.</p>
      )}

      <h2 class="panel-title" style={{ marginTop: "1.25rem" }}>
        Filesystem root
      </h2>
      <div class="field">
        <label for="fs-alias">Alias</label>
        <input
          id="fs-alias"
          value={fsAlias}
          onInput={(e) => setFsAlias(e.currentTarget.value)}
        />
      </div>
      <div class="field">
        <label for="fs-root">Absolute path</label>
        <input
          id="fs-root"
          value={fsRoot}
          placeholder="/path/to/workspace"
          onInput={(e) => setFsRoot(e.currentTarget.value)}
        />
      </div>
      <button
        type="button"
        class="btn btn--ghost btn--small"
        onClick={() => {
          void (async () => {
            const catalog = await getCatalog();
            await catalog.upsertFilesystem(fsAlias, fsRoot, "local");
            await catalog.setVariable("global", "defaultFilesystem", fsAlias);
            await refresh();
          })();
        }}
      >
        Register filesystem
      </button>
      <p class="muted" style={{ fontSize: "var(--text-xs)", marginTop: "0.75rem" }}>
        Active in memory: {project.value.name}
      </p>
    </div>
  );
}
