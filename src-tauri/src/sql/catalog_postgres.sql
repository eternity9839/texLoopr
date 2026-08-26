-- Postgres catalog schema (ADR 0016). Apply before enabling TEXLOOPER_CATALOG=postgres.

CREATE TABLE IF NOT EXISTS filesystems (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  root_path TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  filesystem_id TEXT REFERENCES filesystems(id),
  relative_path TEXT,
  document_json JSONB NOT NULL,
  meta_json JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id TEXT
);

CREATE INDEX IF NOT EXISTS projects_tenant_idx ON projects (tenant_id);
CREATE INDEX IF NOT EXISTS projects_active_idx ON projects (is_active) WHERE is_active;

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_text TEXT,
  mime TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, path)
);

CREATE TABLE IF NOT EXISTS variables (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json JSONB NOT NULL,
  UNIQUE (scope, project_id, key)
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL
);
