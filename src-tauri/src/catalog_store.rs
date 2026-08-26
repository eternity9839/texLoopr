//! Pluggable catalog persistence (ADR 0016).

use crate::db::{
    CatalogDb, DbError, FileRow, FilesystemRow, ProjectRecord, ProjectSummary, VariableRow,
};
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// Abstract catalog used by HTTP and (via Arc) Tauri.
pub trait CatalogStore: Send + Sync {
    fn backend_name(&self) -> &'static str;
    fn db_path_display(&self) -> String;
    fn list_filesystems(&self) -> Result<Vec<FilesystemRow>, DbError>;
    fn upsert_filesystem(
        &self,
        alias: &str,
        root_path: &str,
        kind: &str,
    ) -> Result<FilesystemRow, DbError>;
    fn list_projects(&self) -> Result<Vec<ProjectSummary>, DbError>;
    fn get_project(&self, id: &str) -> Result<Option<ProjectRecord>, DbError>;
    fn get_active_project(&self) -> Result<Option<ProjectRecord>, DbError>;
    fn save_project(
        &self,
        id: Option<String>,
        name: &str,
        document: Value,
        meta: Value,
        filesystem_id: Option<String>,
        relative_path: Option<String>,
        activate: bool,
    ) -> Result<ProjectRecord, DbError>;
    fn set_active_project(&self, id: &str) -> Result<ProjectRecord, DbError>;
    fn delete_project(&self, id: &str) -> Result<(), DbError>;
    fn list_files(&self, project_id: &str) -> Result<Vec<FileRow>, DbError>;
    fn upsert_file(
        &self,
        project_id: &str,
        path: &str,
        kind: &str,
        content_text: Option<String>,
        mime: Option<String>,
    ) -> Result<FileRow, DbError>;
    fn list_variables(
        &self,
        scope: &str,
        project_id: Option<&str>,
    ) -> Result<Vec<VariableRow>, DbError>;
    fn set_variable(
        &self,
        scope: &str,
        project_id: Option<&str>,
        key: &str,
        value: Value,
    ) -> Result<VariableRow, DbError>;
    fn get_app_state(&self, key: &str) -> Result<Option<Value>, DbError>;
    fn set_app_state(&self, key: &str, value: Value) -> Result<(), DbError>;
}

pub struct SqliteCatalog {
    inner: CatalogDb,
}

impl SqliteCatalog {
    pub fn open(path: &Path) -> Result<Self, DbError> {
        Ok(Self {
            inner: CatalogDb::open(path)?,
        })
    }

    pub fn open_default(dir: &Path) -> Result<Self, DbError> {
        std::fs::create_dir_all(dir).map_err(|e| DbError::Msg(e.to_string()))?;
        Self::open(&dir.join("texlooper.db"))
    }
}

impl CatalogStore for SqliteCatalog {
    fn backend_name(&self) -> &'static str {
        "sqlite"
    }
    fn db_path_display(&self) -> String {
        self.inner.db_path()
    }
    fn list_filesystems(&self) -> Result<Vec<FilesystemRow>, DbError> {
        self.inner.list_filesystems()
    }
    fn upsert_filesystem(
        &self,
        alias: &str,
        root_path: &str,
        kind: &str,
    ) -> Result<FilesystemRow, DbError> {
        self.inner.upsert_filesystem(alias, root_path, kind)
    }
    fn list_projects(&self) -> Result<Vec<ProjectSummary>, DbError> {
        self.inner.list_projects()
    }
    fn get_project(&self, id: &str) -> Result<Option<ProjectRecord>, DbError> {
        self.inner.get_project(id)
    }
    fn get_active_project(&self) -> Result<Option<ProjectRecord>, DbError> {
        self.inner.get_active_project()
    }
    fn save_project(
        &self,
        id: Option<String>,
        name: &str,
        document: Value,
        meta: Value,
        filesystem_id: Option<String>,
        relative_path: Option<String>,
        activate: bool,
    ) -> Result<ProjectRecord, DbError> {
        self.inner.save_project(
            id,
            name,
            document,
            meta,
            filesystem_id,
            relative_path,
            activate,
        )
    }
    fn set_active_project(&self, id: &str) -> Result<ProjectRecord, DbError> {
        self.inner.set_active_project(id)
    }
    fn delete_project(&self, id: &str) -> Result<(), DbError> {
        self.inner.delete_project(id)
    }
    fn list_files(&self, project_id: &str) -> Result<Vec<FileRow>, DbError> {
        self.inner.list_files(project_id)
    }
    fn upsert_file(
        &self,
        project_id: &str,
        path: &str,
        kind: &str,
        content_text: Option<String>,
        mime: Option<String>,
    ) -> Result<FileRow, DbError> {
        self.inner
            .upsert_file(project_id, path, kind, content_text, mime)
    }
    fn list_variables(
        &self,
        scope: &str,
        project_id: Option<&str>,
    ) -> Result<Vec<VariableRow>, DbError> {
        self.inner.list_variables(scope, project_id)
    }
    fn set_variable(
        &self,
        scope: &str,
        project_id: Option<&str>,
        key: &str,
        value: Value,
    ) -> Result<VariableRow, DbError> {
        self.inner.set_variable(scope, project_id, key, value)
    }
    fn get_app_state(&self, key: &str) -> Result<Option<Value>, DbError> {
        self.inner.get_app_state(key)
    }
    fn set_app_state(&self, key: &str, value: Value) -> Result<(), DbError> {
        self.inner.set_app_state(key, value)
    }
}

/// Postgres-backed catalog (multi-user). Requires `DATABASE_URL` and schema apply.
/// Until the driver is wired, methods return a clear configuration error.
pub struct PostgresCatalog {
    pub database_url: String,
}

impl PostgresCatalog {
    pub fn from_env() -> Result<Self, DbError> {
        let url = std::env::var("DATABASE_URL").map_err(|_| {
            DbError::Msg("DATABASE_URL not set for postgres catalog".into())
        })?;
        Ok(Self { database_url: url })
    }

    pub fn schema_sql() -> &'static str {
        include_str!("sql/catalog_postgres.sql")
    }
}

fn pg_stub<T>() -> Result<T, DbError> {
    Err(DbError::Msg(
        "postgres catalog: apply src-tauri/src/sql/catalog_postgres.sql then enable full driver (ADR 0016 P2)".into(),
    ))
}

impl CatalogStore for PostgresCatalog {
    fn backend_name(&self) -> &'static str {
        "postgres"
    }
    fn db_path_display(&self) -> String {
        // redact password
        if let Some(at) = self.database_url.find('@') {
            format!("postgres://***{}", &self.database_url[at..])
        } else {
            "postgres://***".into()
        }
    }
    fn list_filesystems(&self) -> Result<Vec<FilesystemRow>, DbError> {
        pg_stub()
    }
    fn upsert_filesystem(
        &self,
        _alias: &str,
        _root_path: &str,
        _kind: &str,
    ) -> Result<FilesystemRow, DbError> {
        pg_stub()
    }
    fn list_projects(&self) -> Result<Vec<ProjectSummary>, DbError> {
        pg_stub()
    }
    fn get_project(&self, _id: &str) -> Result<Option<ProjectRecord>, DbError> {
        pg_stub()
    }
    fn get_active_project(&self) -> Result<Option<ProjectRecord>, DbError> {
        pg_stub()
    }
    fn save_project(
        &self,
        _id: Option<String>,
        _name: &str,
        _document: Value,
        _meta: Value,
        _filesystem_id: Option<String>,
        _relative_path: Option<String>,
        _activate: bool,
    ) -> Result<ProjectRecord, DbError> {
        pg_stub()
    }
    fn set_active_project(&self, _id: &str) -> Result<ProjectRecord, DbError> {
        pg_stub()
    }
    fn delete_project(&self, _id: &str) -> Result<(), DbError> {
        pg_stub()
    }
    fn list_files(&self, _project_id: &str) -> Result<Vec<FileRow>, DbError> {
        pg_stub()
    }
    fn upsert_file(
        &self,
        _project_id: &str,
        _path: &str,
        _kind: &str,
        _content_text: Option<String>,
        _mime: Option<String>,
    ) -> Result<FileRow, DbError> {
        pg_stub()
    }
    fn list_variables(
        &self,
        _scope: &str,
        _project_id: Option<&str>,
    ) -> Result<Vec<VariableRow>, DbError> {
        pg_stub()
    }
    fn set_variable(
        &self,
        _scope: &str,
        _project_id: Option<&str>,
        _key: &str,
        _value: Value,
    ) -> Result<VariableRow, DbError> {
        pg_stub()
    }
    fn get_app_state(&self, _key: &str) -> Result<Option<Value>, DbError> {
        pg_stub()
    }
    fn set_app_state(&self, _key: &str, _value: Value) -> Result<(), DbError> {
        pg_stub()
    }
}

pub fn open_catalog_from_env(default_sqlite_dir: &Path) -> Result<Arc<dyn CatalogStore>, DbError> {
    let driver = std::env::var("TEXLOOPER_CATALOG")
        .unwrap_or_else(|_| "sqlite".into())
        .to_lowercase();
    match driver.as_str() {
        "postgres" | "pg" => Ok(Arc::new(PostgresCatalog::from_env()?)),
        _ => {
            let path = std::env::var("TEXLOOPER_DB_PATH")
                .map(PathBuf::from)
                .unwrap_or_else(|_| default_sqlite_dir.join("texlooper.db"));
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| DbError::Msg(e.to_string()))?;
            }
            Ok(Arc::new(SqliteCatalog::open(&path)?))
        }
    }
}
