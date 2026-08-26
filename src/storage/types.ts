export interface FilesystemRow {
  id: string;
  alias: string;
  rootPath: string;
  kind: string;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  filesystemId: string | null;
  relativePath: string | null;
  meta: Record<string, unknown>;
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface ProjectRecord {
  summary: ProjectSummary;
  document: unknown;
}

export interface FileRow {
  id: string;
  projectId: string;
  path: string;
  kind: string;
  mime: string | null;
  contentText: string | null;
  updatedAt: string;
}

export interface VariableRow {
  id: string;
  scope: "global" | "project" | string;
  projectId: string | null;
  key: string;
  value: unknown;
}

export interface CatalogApi {
  backend: "tauri" | "web" | "http";
  dbPath(): Promise<string>;
  listFilesystems(): Promise<FilesystemRow[]>;
  upsertFilesystem(
    alias: string,
    rootPath: string,
    kind?: string,
  ): Promise<FilesystemRow>;
  listProjects(): Promise<ProjectSummary[]>;
  getProject(id: string): Promise<ProjectRecord | null>;
  getActiveProject(): Promise<ProjectRecord | null>;
  saveProject(input: {
    id?: string | null;
    name: string;
    document: unknown;
    meta?: Record<string, unknown>;
    filesystemId?: string | null;
    relativePath?: string | null;
    activate?: boolean;
  }): Promise<ProjectRecord>;
  setActiveProject(id: string): Promise<ProjectRecord>;
  deleteProject(id: string): Promise<void>;
  listFiles(projectId: string): Promise<FileRow[]>;
  upsertFile(input: {
    projectId: string;
    path: string;
    kind: string;
    contentText?: string | null;
    mime?: string | null;
  }): Promise<FileRow>;
  listVariables(
    scope: "global" | "project",
    projectId?: string | null,
  ): Promise<VariableRow[]>;
  setVariable(
    scope: "global" | "project",
    key: string,
    value: unknown,
    projectId?: string | null,
  ): Promise<VariableRow>;
  getAppState(key: string): Promise<unknown | null>;
  setAppState(key: string, value: unknown): Promise<void>;
}
