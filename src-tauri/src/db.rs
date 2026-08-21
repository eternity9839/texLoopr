use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("sqlite: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Msg(String),
}

impl serde::Serialize for DbError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub struct CatalogDb {
    pub conn: Mutex<Connection>,
    pub path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesystemRow {
    pub id: String,
    pub alias: String,
    pub root_path: String,
    pub kind: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    pub filesystem_id: Option<String>,
    pub relative_path: Option<String>,
    pub meta: Value,
    pub is_active: bool,
    pub updated_at: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRecord {
    #[serde(flatten)]
    pub summary: ProjectSummary,
    pub document: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRow {
    pub id: String,
    pub project_id: String,
    pub path: String,
    pub kind: String,
    pub mime: Option<String>,
    pub content_text: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariableRow {
    pub id: String,
    pub scope: String,
    pub project_id: Option<String>,
    pub key: String,
    pub value: Value,
}

fn now() -> String {
    // RFC3339-ish UTC without chrono dependency
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}")
}

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

impl CatalogDb {
    pub fn open(path: &Path) -> Result<Self, DbError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            ",
        )?;
        let db = Self {
            conn: Mutex::new(conn),
            path: path.to_path_buf(),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS filesystems (
              id TEXT PRIMARY KEY NOT NULL,
              alias TEXT NOT NULL UNIQUE,
              root_path TEXT NOT NULL,
              kind TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS projects (
              id TEXT PRIMARY KEY NOT NULL,
              name TEXT NOT NULL,
              filesystem_id TEXT REFERENCES filesystems(id) ON DELETE SET NULL,
              relative_path TEXT,
              meta_json TEXT NOT NULL DEFAULT '{}',
              document_json TEXT NOT NULL DEFAULT '{}',
              is_active INTEGER NOT NULL DEFAULT 0,
              updated_at TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS files (
              id TEXT PRIMARY KEY NOT NULL,
              project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
              path TEXT NOT NULL,
              kind TEXT NOT NULL,
              mime TEXT,
              content_text TEXT,
              content_blob BLOB,
              updated_at TEXT NOT NULL,
              UNIQUE(project_id, path)
            );

            CREATE TABLE IF NOT EXISTS variables (
              id TEXT PRIMARY KEY NOT NULL,
              scope TEXT NOT NULL CHECK(scope IN ('global','project')),
              project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
              key TEXT NOT NULL,
              value_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_state (
              key TEXT PRIMARY KEY NOT NULL,
              value_json TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active);
            CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
            CREATE INDEX IF NOT EXISTS idx_variables_scope ON variables(scope, project_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_variables_unique
              ON variables(scope, ifnull(project_id, ''), key);
            "#,
        )?;
        Ok(())
    }

    pub fn list_filesystems(&self) -> Result<Vec<FilesystemRow>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, alias, root_path, kind, created_at FROM filesystems ORDER BY alias",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(FilesystemRow {
                    id: row.get(0)?,
                    alias: row.get(1)?,
                    root_path: row.get(2)?,
                    kind: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn upsert_filesystem(
        &self,
        alias: &str,
        root_path: &str,
        kind: &str,
    ) -> Result<FilesystemRow, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM filesystems WHERE alias = ?1",
                params![alias],
                |r| r.get(0),
            )
            .optional()?;
        let id = existing.unwrap_or_else(new_id);
        let created = now();
        conn.execute(
            "INSERT INTO filesystems (id, alias, root_path, kind, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET alias=excluded.alias, root_path=excluded.root_path, kind=excluded.kind",
            params![id, alias, root_path, kind, created],
        )?;
        Ok(FilesystemRow {
            id,
            alias: alias.to_string(),
            root_path: root_path.to_string(),
            kind: kind.to_string(),
            created_at: created,
        })
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectSummary>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, name, filesystem_id, relative_path, meta_json, is_active, updated_at, created_at
             FROM projects ORDER BY updated_at DESC",
        )?;
        let rows = stmt
            .query_map([], |row| {
                let meta_str: String = row.get(4)?;
                let meta: Value = serde_json::from_str(&meta_str).unwrap_or(Value::Object(Default::default()));
                Ok(ProjectSummary {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    filesystem_id: row.get(2)?,
                    relative_path: row.get(3)?,
                    meta,
                    is_active: row.get::<_, i64>(5)? != 0,
                    updated_at: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn get_project(&self, id: &str) -> Result<Option<ProjectRecord>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let row = conn
            .query_row(
                "SELECT id, name, filesystem_id, relative_path, meta_json, document_json, is_active, updated_at, created_at
                 FROM projects WHERE id = ?1",
                params![id],
                |row| {
                    let meta_str: String = row.get(4)?;
                    let doc_str: String = row.get(5)?;
                    Ok((
                        ProjectSummary {
                            id: row.get(0)?,
                            name: row.get(1)?,
                            filesystem_id: row.get(2)?,
                            relative_path: row.get(3)?,
                            meta: serde_json::from_str(&meta_str)
                                .unwrap_or(Value::Object(Default::default())),
                            is_active: row.get::<_, i64>(6)? != 0,
                            updated_at: row.get(7)?,
                            created_at: row.get(8)?,
                        },
                        serde_json::from_str(&doc_str).unwrap_or(Value::Object(Default::default())),
                    ))
                },
            )
            .optional()?;
        Ok(row.map(|(summary, document)| ProjectRecord { summary, document }))
    }

    pub fn save_project(
        &self,
        id: Option<String>,
        name: &str,
        document: Value,
        meta: Value,
        filesystem_id: Option<String>,
        relative_path: Option<String>,
        activate: bool,
    ) -> Result<ProjectRecord, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let id = id.unwrap_or_else(new_id);
        let ts = now();
        if activate {
            conn.execute("UPDATE projects SET is_active = 0", [])?;
        }
        let existing: Option<String> = conn
            .query_row(
                "SELECT created_at FROM projects WHERE id = ?1",
                params![id],
                |r| r.get(0),
            )
            .optional()?;
        let created = existing.unwrap_or_else(now);
        let meta_json = serde_json::to_string(&meta)?;
        let document_json = serde_json::to_string(&document)?;
        conn.execute(
            "INSERT INTO projects (id, name, filesystem_id, relative_path, meta_json, document_json, is_active, updated_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name,
               filesystem_id=excluded.filesystem_id,
               relative_path=excluded.relative_path,
               meta_json=excluded.meta_json,
               document_json=excluded.document_json,
               is_active=excluded.is_active,
               updated_at=excluded.updated_at",
            params![
                id,
                name,
                filesystem_id,
                relative_path,
                meta_json,
                document_json,
                if activate { 1 } else { 0 },
                ts,
                created
            ],
        )?;
        drop(conn);
        self.get_project(&id)?
            .ok_or_else(|| DbError::Msg("project missing after save".into()))
    }

    pub fn set_active_project(&self, id: &str) -> Result<ProjectRecord, DbError> {
        {
            let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
            conn.execute("UPDATE projects SET is_active = 0", [])?;
            let n = conn.execute(
                "UPDATE projects SET is_active = 1, updated_at = ?1 WHERE id = ?2",
                params![now(), id],
            )?;
            if n == 0 {
                return Err(DbError::Msg(format!("project not found: {id}")));
            }
        }
        self.get_project(id)?
            .ok_or_else(|| DbError::Msg("project missing".into()))
    }

    pub fn get_active_project(&self) -> Result<Option<ProjectRecord>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let id: Option<String> = conn
            .query_row(
                "SELECT id FROM projects WHERE is_active = 1 LIMIT 1",
                [],
                |r| r.get(0),
            )
            .optional()?;
        drop(conn);
        match id {
            Some(id) => self.get_project(&id),
            None => Ok(None),
        }
    }

    pub fn delete_project(&self, id: &str) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn list_files(&self, project_id: &str) -> Result<Vec<FileRow>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, path, kind, mime, content_text, updated_at
             FROM files WHERE project_id = ?1 ORDER BY path",
        )?;
        let rows = stmt
            .query_map(params![project_id], |row| {
                Ok(FileRow {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    path: row.get(2)?,
                    kind: row.get(3)?,
                    mime: row.get(4)?,
                    content_text: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn upsert_file(
        &self,
        project_id: &str,
        path: &str,
        kind: &str,
        content_text: Option<String>,
        mime: Option<String>,
    ) -> Result<FileRow, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM files WHERE project_id = ?1 AND path = ?2",
                params![project_id, path],
                |r| r.get(0),
            )
            .optional()?;
        let id = existing.unwrap_or_else(new_id);
        let ts = now();
        conn.execute(
            "INSERT INTO files (id, project_id, path, kind, mime, content_text, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(project_id, path) DO UPDATE SET
               kind=excluded.kind,
               mime=excluded.mime,
               content_text=excluded.content_text,
               updated_at=excluded.updated_at",
            params![id, project_id, path, kind, mime, content_text, ts],
        )?;
        Ok(FileRow {
            id,
            project_id: project_id.to_string(),
            path: path.to_string(),
            kind: kind.to_string(),
            mime,
            content_text,
            updated_at: ts,
        })
    }

    pub fn list_variables(
        &self,
        scope: &str,
        project_id: Option<&str>,
    ) -> Result<Vec<VariableRow>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let mut rows = Vec::new();
        if scope == "global" {
            let mut stmt = conn.prepare(
                "SELECT id, scope, project_id, key, value_json FROM variables
                 WHERE scope = 'global' ORDER BY key",
            )?;
            for row in stmt.query_map([], |row| {
                let value_str: String = row.get(4)?;
                Ok(VariableRow {
                    id: row.get(0)?,
                    scope: row.get(1)?,
                    project_id: row.get(2)?,
                    key: row.get(3)?,
                    value: serde_json::from_str(&value_str).unwrap_or(Value::Null),
                })
            })? {
                rows.push(row?);
            }
        } else if let Some(pid) = project_id {
            let mut stmt = conn.prepare(
                "SELECT id, scope, project_id, key, value_json FROM variables
                 WHERE scope = 'project' AND project_id = ?1 ORDER BY key",
            )?;
            for row in stmt.query_map(params![pid], |row| {
                let value_str: String = row.get(4)?;
                Ok(VariableRow {
                    id: row.get(0)?,
                    scope: row.get(1)?,
                    project_id: row.get(2)?,
                    key: row.get(3)?,
                    value: serde_json::from_str(&value_str).unwrap_or(Value::Null),
                })
            })? {
                rows.push(row?);
            }
        }
        Ok(rows)
    }

    pub fn set_variable(
        &self,
        scope: &str,
        project_id: Option<&str>,
        key: &str,
        value: Value,
    ) -> Result<VariableRow, DbError> {
        if scope == "project" && project_id.is_none() {
            return Err(DbError::Msg("project_id required for project scope".into()));
        }
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let id = new_id();
        let value_json = serde_json::to_string(&value)?;
        // Delete then insert for portable upsert across NULL project_id
        if scope == "global" {
            conn.execute(
                "DELETE FROM variables WHERE scope = 'global' AND key = ?1 AND project_id IS NULL",
                params![key],
            )?;
            conn.execute(
                "INSERT INTO variables (id, scope, project_id, key, value_json)
                 VALUES (?1, 'global', NULL, ?2, ?3)",
                params![id, key, value_json],
            )?;
        } else {
            conn.execute(
                "DELETE FROM variables WHERE scope = 'project' AND project_id = ?1 AND key = ?2",
                params![project_id, key],
            )?;
            conn.execute(
                "INSERT INTO variables (id, scope, project_id, key, value_json)
                 VALUES (?1, 'project', ?2, ?3, ?4)",
                params![id, project_id, key, value_json],
            )?;
        }
        Ok(VariableRow {
            id,
            scope: scope.to_string(),
            project_id: project_id.map(|s| s.to_string()),
            key: key.to_string(),
            value,
        })
    }

    pub fn get_app_state(&self, key: &str) -> Result<Option<Value>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let value: Option<String> = conn
            .query_row(
                "SELECT value_json FROM app_state WHERE key = ?1",
                params![key],
                |r| r.get(0),
            )
            .optional()?;
        Ok(value
            .map(|s| serde_json::from_str(&s).unwrap_or(Value::Null)))
    }

    pub fn set_app_state(&self, key: &str, value: Value) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Msg(e.to_string()))?;
        let value_json = serde_json::to_string(&value)?;
        conn.execute(
            "INSERT INTO app_state (key, value_json) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json",
            params![key, value_json],
        )?;
        Ok(())
    }

    pub fn db_path(&self) -> String {
        self.path.display().to_string()
    }
}
