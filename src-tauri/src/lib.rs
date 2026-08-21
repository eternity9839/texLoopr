mod data;
mod db;
mod template;
mod workflow;

use data::{parse_data_input, DataError, ParseResult};
use db::{CatalogDb, DbError};
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use template::{resolve_template, RuntimeContext};
use workflow::{run_workflow, WorkflowResult};

struct DbState(Arc<CatalogDb>);

fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("texloopr.db"))
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_runtime_info() -> Value {
    serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "backbone": "rust",
        "engines": ["catalog", "data_parse", "template_resolve", "workflow_run"],
    })
}

#[tauri::command]
fn data_parse(text: String) -> Result<ParseResult, DataError> {
    parse_data_input(&text)
}

#[tauri::command]
fn template_resolve(
    template: String,
    row: Value,
    ctx: Option<Value>,
    missing_as_empty: Option<bool>,
) -> String {
    let missing = missing_as_empty.unwrap_or(true);
    let runtime = ctx.as_ref().map(ctx_from_value);
    resolve_template(&template, &row, runtime.as_ref(), missing)
}

fn ctx_from_value(v: &Value) -> RuntimeContext {
    let mut ctx = RuntimeContext::default();
    if let Value::Object(m) = v {
        if let Some(Value::Object(d)) = m.get("data") {
            ctx.data = d.clone();
        }
        if let Some(Value::Object(o)) = m.get("output") {
            ctx.output = o.clone();
        }
        if let Some(Value::Object(d)) = m.get("device") {
            ctx.device = d.clone();
        }
        if let Some(Value::Object(vars)) = m.get("vars") {
            ctx.vars = vars.clone();
        }
        if let Some(Value::Object(env)) = m.get("env") {
            ctx.env = env.clone();
        }
    }
    ctx
}

#[tauri::command]
fn workflow_run(
    project: Value,
    row: Value,
    output: Value,
    vars: Option<Value>,
    preview: Option<bool>,
) -> WorkflowResult {
    run_workflow(
        &project,
        &row,
        &output,
        vars.as_ref(),
        preview.unwrap_or(false),
    )
}

#[tauri::command]
fn catalog_db_path(db: State<'_, DbState>) -> String {
    db.0.db_path()
}

#[tauri::command]
fn catalog_list_filesystems(db: State<'_, DbState>) -> Result<Vec<db::FilesystemRow>, DbError> {
    db.0.list_filesystems()
}

#[tauri::command]
fn catalog_upsert_filesystem(
    db: State<'_, DbState>,
    alias: String,
    root_path: String,
    kind: String,
) -> Result<db::FilesystemRow, DbError> {
    db.0.upsert_filesystem(&alias, &root_path, &kind)
}

#[tauri::command]
fn catalog_list_projects(db: State<'_, DbState>) -> Result<Vec<db::ProjectSummary>, DbError> {
    db.0.list_projects()
}

#[tauri::command]
fn catalog_get_project(
    db: State<'_, DbState>,
    id: String,
) -> Result<Option<db::ProjectRecord>, DbError> {
    db.0.get_project(&id)
}

#[tauri::command]
fn catalog_get_active_project(
    db: State<'_, DbState>,
) -> Result<Option<db::ProjectRecord>, DbError> {
    db.0.get_active_project()
}

#[tauri::command]
fn catalog_save_project(
    db: State<'_, DbState>,
    id: Option<String>,
    name: String,
    document: Value,
    meta: Value,
    filesystem_id: Option<String>,
    relative_path: Option<String>,
    activate: bool,
) -> Result<db::ProjectRecord, DbError> {
    db.0.save_project(
        id,
        &name,
        document,
        meta,
        filesystem_id,
        relative_path,
        activate,
    )
}

#[tauri::command]
fn catalog_set_active_project(
    db: State<'_, DbState>,
    id: String,
) -> Result<db::ProjectRecord, DbError> {
    db.0.set_active_project(&id)
}

#[tauri::command]
fn catalog_delete_project(db: State<'_, DbState>, id: String) -> Result<(), DbError> {
    db.0.delete_project(&id)
}

#[tauri::command]
fn catalog_list_files(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<Vec<db::FileRow>, DbError> {
    db.0.list_files(&project_id)
}

#[tauri::command]
fn catalog_upsert_file(
    db: State<'_, DbState>,
    project_id: String,
    path: String,
    kind: String,
    content_text: Option<String>,
    mime: Option<String>,
) -> Result<db::FileRow, DbError> {
    db.0.upsert_file(&project_id, &path, &kind, content_text, mime)
}

#[tauri::command]
fn catalog_list_variables(
    db: State<'_, DbState>,
    scope: String,
    project_id: Option<String>,
) -> Result<Vec<db::VariableRow>, DbError> {
    db.0.list_variables(&scope, project_id.as_deref())
}

#[tauri::command]
fn catalog_set_variable(
    db: State<'_, DbState>,
    scope: String,
    project_id: Option<String>,
    key: String,
    value: Value,
) -> Result<db::VariableRow, DbError> {
    db.0.set_variable(&scope, project_id.as_deref(), &key, value)
}

#[tauri::command]
fn catalog_get_app_state(db: State<'_, DbState>, key: String) -> Result<Option<Value>, DbError> {
    db.0.get_app_state(&key)
}

#[tauri::command]
fn catalog_set_app_state(
    db: State<'_, DbState>,
    key: String,
    value: Value,
) -> Result<(), DbError> {
    db.0.set_app_state(&key, value)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let path = db_path(app.handle())?;
            let catalog = CatalogDb::open(&path).map_err(|e| e.to_string())?;
            app.manage(DbState(Arc::new(catalog)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_runtime_info,
            data_parse,
            template_resolve,
            workflow_run,
            catalog_db_path,
            catalog_list_filesystems,
            catalog_upsert_filesystem,
            catalog_list_projects,
            catalog_get_project,
            catalog_get_active_project,
            catalog_save_project,
            catalog_set_active_project,
            catalog_delete_project,
            catalog_list_files,
            catalog_upsert_file,
            catalog_list_variables,
            catalog_set_variable,
            catalog_get_app_state,
            catalog_set_app_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
