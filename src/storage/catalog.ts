import type { CatalogApi, ProjectRecord } from "./types";
import { createWebCatalog } from "./webCatalog";
import { createHttpCatalog } from "./httpCatalog";
import { resolveBackendTransport } from "../runtimeConfig";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

function createTauriCatalog(): CatalogApi {
  return {
    backend: "tauri",
    dbPath: () => invoke<string>("catalog_db_path"),
    listFilesystems: () => invoke("catalog_list_filesystems"),
    upsertFilesystem: (alias, rootPath, kind = "local") =>
      invoke("catalog_upsert_filesystem", {
        alias,
        root_path: rootPath,
        kind,
      }),
    listProjects: () => invoke("catalog_list_projects"),
    getProject: (id) => invoke("catalog_get_project", { id }),
    getActiveProject: () => invoke("catalog_get_active_project"),
    saveProject: (input) =>
      invoke("catalog_save_project", {
        id: input.id ?? null,
        name: input.name,
        document: input.document,
        meta: input.meta ?? {},
        filesystem_id: input.filesystemId ?? null,
        relative_path: input.relativePath ?? null,
        activate: input.activate !== false,
      }),
    setActiveProject: (id) => invoke("catalog_set_active_project", { id }),
    deleteProject: (id) => invoke("catalog_delete_project", { id }),
    listFiles: (projectId) =>
      invoke("catalog_list_files", { project_id: projectId }),
    upsertFile: (input) =>
      invoke("catalog_upsert_file", {
        project_id: input.projectId,
        path: input.path,
        kind: input.kind,
        content_text: input.contentText ?? null,
        mime: input.mime ?? null,
      }),
    listVariables: (scope, projectId) =>
      invoke("catalog_list_variables", {
        scope,
        project_id: projectId ?? null,
      }),
    setVariable: (scope, key, value, projectId) =>
      invoke("catalog_set_variable", {
        scope,
        project_id: projectId ?? null,
        key,
        value,
      }),
    getAppState: (key) => invoke("catalog_get_app_state", { key }),
    setAppState: (key, value) =>
      invoke("catalog_set_app_state", { key, value }),
  };
}

let catalogPromise: Promise<CatalogApi> | null = null;

export function getCatalog(): Promise<CatalogApi> {
  if (!catalogPromise) {
    catalogPromise = Promise.resolve(
      (() => {
        const transport = resolveBackendTransport();
        if (transport === "tauri-local" || isTauri()) return createTauriCatalog();
        if (transport === "http-remote") return createHttpCatalog();
        return createWebCatalog();
      })(),
    );
  }
  return catalogPromise;
}

/** Reset cached catalog (tests / config hot-swap). */
export function resetCatalogCache(): void {
  catalogPromise = null;
}

export async function persistActiveProject(input: {
  id?: string | null;
  name: string;
  document: unknown;
  meta?: Record<string, unknown>;
}): Promise<ProjectRecord> {
  const catalog = await getCatalog();
  return catalog.saveProject({
    ...input,
    activate: true,
  });
}

export type { ProjectSummary } from "./types";
