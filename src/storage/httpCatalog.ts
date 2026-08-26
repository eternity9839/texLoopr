/** Remote catalog via Rust HTTP API (ADR 0016). Project CRUD only for now. */

import { getApiBaseUrl, getApiKey } from "../runtimeConfig";
import type {
  CatalogApi,
  FileRow,
  FilesystemRow,
  ProjectRecord,
  VariableRow,
} from "./types";

async function http<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new Error("apiBaseUrl not configured");
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const key = getApiKey();
  if (key) headers.set("X-Api-Key", key);
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function unsupported(feature: string): never {
  throw new Error(
    `Catalog ${feature} is not available over HTTP yet; use project CRUD or desktop.`,
  );
}

export function createHttpCatalog(): CatalogApi {
  return {
    backend: "http",
    dbPath: async () => {
      const r = await http<{ path?: string; backend?: string }>("/v1/catalog/path");
      return r.path ?? r.backend ?? "remote";
    },
    listFilesystems: async () => [] as FilesystemRow[],
    upsertFilesystem: () => unsupported("filesystems"),
    listProjects: () => http("/v1/catalog/projects"),
    getProject: async (id) => {
      try {
        return await http<ProjectRecord>(
          `/v1/catalog/projects/${encodeURIComponent(id)}`,
        );
      } catch {
        return null;
      }
    },
    getActiveProject: async () => {
      try {
        return await http<ProjectRecord>("/v1/catalog/projects/active");
      } catch {
        return null;
      }
    },
    saveProject: (input) =>
      http("/v1/catalog/projects", {
        method: "POST",
        body: JSON.stringify({
          id: input.id ?? null,
          name: input.name,
          document: input.document,
          meta: input.meta ?? {},
          filesystemId: input.filesystemId ?? null,
          relativePath: input.relativePath ?? null,
          activate: input.activate !== false,
        }),
      }),
    setActiveProject: (id) =>
      http(`/v1/catalog/projects/${encodeURIComponent(id)}`, {
        method: "PUT",
      }),
    deleteProject: async (id) => {
      await http(`/v1/catalog/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    listFiles: async () => [] as FileRow[],
    upsertFile: () => unsupported("files"),
    listVariables: async () => [] as VariableRow[],
    setVariable: () => unsupported("variables"),
    getAppState: async () => null,
    setAppState: async () => {
      /* no-op over HTTP until /v1/catalog/app-state exists */
    },
  };
}
