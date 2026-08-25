import type {
  CatalogApi,
  FileRow,
  FilesystemRow,
  ProjectRecord,
  VariableRow,
} from "./types";
import { createId } from "../model/document";
import { isEphemeral } from "../runtimeConfig";

const KEY = "texlooper.catalog.v1";

interface WebCatalog {
  filesystems: FilesystemRow[];
  projects: ProjectRecord[];
  files: FileRow[];
  variables: VariableRow[];
  appState: Record<string, unknown>;
}

function empty(): WebCatalog {
  return {
    filesystems: [],
    projects: [],
    files: [],
    variables: [],
    appState: {},
  };
}

function load(): WebCatalog {
  try {
    const raw =
      localStorage.getItem(KEY) ??
      localStorage.getItem("texloopr.catalog.v1");
    if (!raw) return empty();
    return { ...empty(), ...(JSON.parse(raw) as WebCatalog) };
  } catch {
    return empty();
  }
}

function save(data: WebCatalog): void {
  if (isEphemeral()) return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

function id(): string {
  return createId();
}

function now(): string {
  return String(Math.floor(Date.now() / 1000));
}

export function createWebCatalog(): CatalogApi {
  return {
    backend: "web",
    async dbPath() {
      return "localStorage:texlooper.catalog.v1";
    },
    async listFilesystems() {
      return load().filesystems;
    },
    async upsertFilesystem(alias, rootPath, kind = "local") {
      const data = load();
      const existing = data.filesystems.find((f) => f.alias === alias);
      const row: FilesystemRow = existing
        ? { ...existing, rootPath, kind }
        : {
            id: id(),
            alias,
            rootPath,
            kind,
            createdAt: now(),
          };
      data.filesystems = [
        ...data.filesystems.filter((f) => f.alias !== alias),
        row,
      ];
      save(data);
      return row;
    },
    async listProjects() {
      return load().projects.map((p) => p.summary);
    },
    async getProject(projectId) {
      return load().projects.find((p) => p.summary.id === projectId) ?? null;
    },
    async getActiveProject() {
      return load().projects.find((p) => p.summary.isActive) ?? null;
    },
    async saveProject(input) {
      const data = load();
      const projectId = input.id ?? id();
      const ts = now();
      if (input.activate !== false) {
        data.projects = data.projects.map((p) => ({
          ...p,
          summary: { ...p.summary, isActive: false },
        }));
      }
      const prev = data.projects.find((p) => p.summary.id === projectId);
      const record: ProjectRecord = {
        summary: {
          id: projectId,
          name: input.name,
          filesystemId: input.filesystemId ?? null,
          relativePath: input.relativePath ?? null,
          meta: input.meta ?? {},
          isActive: input.activate !== false,
          updatedAt: ts,
          createdAt: prev?.summary.createdAt ?? ts,
        },
        document: input.document,
      };
      data.projects = [
        ...data.projects.filter((p) => p.summary.id !== projectId),
        record,
      ];
      save(data);
      return record;
    },
    async setActiveProject(projectId) {
      const data = load();
      const found = data.projects.find((p) => p.summary.id === projectId);
      if (!found) throw new Error(`project not found: ${projectId}`);
      data.projects = data.projects.map((p) => ({
        ...p,
        summary: {
          ...p.summary,
          isActive: p.summary.id === projectId,
          updatedAt: p.summary.id === projectId ? now() : p.summary.updatedAt,
        },
      }));
      save(data);
      return data.projects.find((p) => p.summary.id === projectId)!;
    },
    async deleteProject(projectId) {
      const data = load();
      data.projects = data.projects.filter((p) => p.summary.id !== projectId);
      data.files = data.files.filter((f) => f.projectId !== projectId);
      data.variables = data.variables.filter(
        (v) => v.projectId !== projectId,
      );
      save(data);
    },
    async listFiles(projectId) {
      return load().files.filter((f) => f.projectId === projectId);
    },
    async upsertFile(input) {
      const data = load();
      const existing = data.files.find(
        (f) => f.projectId === input.projectId && f.path === input.path,
      );
      const row: FileRow = {
        id: existing?.id ?? id(),
        projectId: input.projectId,
        path: input.path,
        kind: input.kind,
        mime: input.mime ?? null,
        contentText: input.contentText ?? null,
        updatedAt: now(),
      };
      data.files = [
        ...data.files.filter(
          (f) => !(f.projectId === input.projectId && f.path === input.path),
        ),
        row,
      ];
      save(data);
      return row;
    },
    async listVariables(scope, projectId) {
      return load().variables.filter((v) => {
        if (v.scope !== scope) return false;
        if (scope === "global") return v.projectId == null;
        return v.projectId === projectId;
      });
    },
    async setVariable(scope, key, value, projectId) {
      const data = load();
      data.variables = data.variables.filter((v) => {
        if (v.key !== key || v.scope !== scope) return true;
        if (scope === "global") return v.projectId != null;
        return v.projectId !== projectId;
      });
      const row: VariableRow = {
        id: id(),
        scope,
        projectId: scope === "project" ? (projectId ?? null) : null,
        key,
        value,
      };
      data.variables.push(row);
      save(data);
      return row;
    },
    async getAppState(key) {
      const data = load();
      return key in data.appState ? data.appState[key] : null;
    },
    async setAppState(key, value) {
      const data = load();
      data.appState[key] = value;
      save(data);
    },
  };
}
