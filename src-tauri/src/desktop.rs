//! Tauri desktop shell — not built for headless `texlooper-cli` / Docker API.

use crate::api::handlers::{
    handle_data_parse, handle_render, handle_render_batch, handle_template_resolve,
    handle_workflow_run, runtime_info, RenderBatchHttpRequest, TemplateResolveRequest,
    WorkflowRunRequest,
};
use crate::db::CatalogDb;
use crate::data::ParseResult;
use crate::db::DbError;
use crate::pdf_import::{
    import_pdf_from_base64, import_pdf_from_path, PdfImportProgress, PdfImportResult, ProgressFn,
};
use crate::render_batch::RenderBatchResult;
use crate::db;
use serde_json::Value;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri::path::BaseDirectory;

struct DbState(Arc<CatalogDb>);

/// Push host logical window size into the outer desktop host (iframe scales).
fn inject_window_size(window: &tauri::WebviewWindow) {
    if let Ok(size) = window.inner_size() {
        let scale = window.scale_factor().unwrap_or(1.0);
        let scale = if scale.is_finite() && (0.25..=8.0).contains(&scale) {
            scale
        } else {
            1.0
        };
        let logical_w = (size.width as f64 / scale).round().max(320.0);
        let logical_h = (size.height as f64 / scale).round().max(320.0);
        let script = format!(
            r#"(function(){{
  var logicalW={logical_w}, logicalH={logical_h};
  var t=window.__TEXLOOPER__=window.__TEXLOOPER__||{{}};
  t.profile='desktop';
  t.windowSize={{w:logicalW,h:logicalH}};
  window.dispatchEvent(new Event('texlooper-window-size'));
  try{{
    var frame=document.getElementById('frame');
    var win=frame&&frame.contentWindow;
    if(win){{
      if(window.__TAURI_INTERNALS__) win.__TAURI_INTERNALS__=window.__TAURI_INTERNALS__;
      if(window.__TAURI__) win.__TAURI__=window.__TAURI__;
      win.__TEXLOOPER__=Object.assign({{}},win.__TEXLOOPER__||{{}},{{
        profile:'desktop',
        embeddedInDesktopHost:true,
        transport:'tauri-local',
        windowSize:t.windowSize,
        cssWindowSize:t.cssWindowSize,
        hostScale:t.hostScale
      }});
      win.dispatchEvent(new Event('texlooper-window-size'));
    }}
  }}catch(e){{}}
  try{{
    fetch('/__texlooper__/layout-dump',{{
      method:'POST',
      headers:{{'Content-Type':'application/json'}},
      body:JSON.stringify({{
        tag:'host-inject',
        at:Date.now(),
        dpr:devicePixelRatio,
        inner:[innerWidth,innerHeight],
        windowSize:t.windowSize,
        hostScale:t.hostScale||null,
        hasFrame:!!document.getElementById('frame'),
        hasTauri:!!(window.__TAURI_INTERNALS__||window.__TAURI__)
      }}),
      keepalive:true
    }}).catch(function(){{}});
  }}catch(e){{}}
}})();"#
        );
        let _ = window.eval(&script);
    }
}

#[tauri::command]
fn desktop_set_zoom(window: tauri::WebviewWindow, factor: f64) -> Result<(), String> {
    // Kept for compatibility; desktop host uses iframe CSS scale instead.
    let z = if factor.is_finite() && (0.05..=192.0).contains(&factor) {
        factor
    } else {
        1.0
    };
    window.set_zoom(z).map_err(|e| e.to_string())
}

fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("texlooper.db"))
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_runtime_info() -> Value {
    runtime_info()
}

#[tauri::command]
fn data_parse(text: String) -> Result<ParseResult, String> {
    handle_data_parse(&text)
}

#[tauri::command]
fn dataset_sql_query(connection: String, query: String) -> Result<Vec<Value>, String> {
    crate::data_sources::run_sqlite_query(&connection, &query)
}

#[tauri::command]
fn dataset_read_file(path: String) -> Result<String, String> {
    crate::data_sources::read_data_file(&path)
}

#[tauri::command]
fn template_resolve(
    template: String,
    row: Value,
    ctx: Option<Value>,
    missing_as_empty: Option<bool>,
) -> String {
    handle_template_resolve(&TemplateResolveRequest {
        template,
        row,
        ctx,
        missing_as_empty,
    })
}

#[tauri::command]
fn workflow_run(
    project: Value,
    row: Value,
    output: Value,
    vars: Option<Value>,
    preview: Option<bool>,
) -> crate::workflow::WorkflowResult {
    handle_workflow_run(&WorkflowRunRequest {
        project,
        row,
        output,
        vars,
        preview,
    })
}

#[tauri::command]
fn pdf_import_structure(
    app: AppHandle,
    path: Option<String>,
    bytes_base64: Option<String>,
) -> Result<PdfImportResult, String> {
    let app_for_progress = app.clone();
    let progress: ProgressFn = Box::new(move |p: PdfImportProgress| {
        let _ = app_for_progress.emit("pdf-import-progress", &p);
    });
    if let Some(p) = path {
        import_pdf_from_path(PathBuf::from(p).as_path(), Some(&progress)).map_err(|e| e.to_string())
    } else if let Some(b64) = bytes_base64 {
        import_pdf_from_base64(&b64, Some(&progress)).map_err(|e| e.to_string())
    } else {
        Err("Provide path or bytesBase64".into())
    }
}

#[tauri::command]
fn render_project_pdf_cmd(
    project: Value,
    row: Value,
    output: Option<Value>,
) -> Result<Vec<u8>, String> {
    handle_render(&crate::api::handlers::RenderRequest {
        project,
        data: None,
        row: Some(row),
        output,
        output_id: None,
    })
}

#[tauri::command]
fn render_batch_cmd(
    project: Value,
    rows: Vec<Value>,
    output: Option<Value>,
    include_zip: Option<bool>,
) -> Result<RenderBatchResult, String> {
    handle_render_batch(&RenderBatchHttpRequest {
        project,
        rows,
        output,
        output_id: None,
        include_zip,
    })
}

/// Write bytes to the user Downloads folder and return the absolute path.
/// Native `<a download>` / rfd dialogs are unreliable in the desktop WebKit iframe
/// (especially on Wayland), so we always persist to disk and open the file.
#[tauri::command]
fn save_bytes_cmd(default_name: String, bytes_base64: String) -> Result<String, String> {
    use base64::Engine as _;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(bytes_base64.trim())
        .map_err(|e| format!("invalid base64: {e}"))?;

    let name = sanitize_download_name(&default_name);
    let dir = download_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create Downloads: {e}"))?;

    let mut path = dir.join(&name);
    if path.exists() {
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("file");
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .map(|e| format!(".{e}"))
            .unwrap_or_default();
        for n in 2..1000 {
            let candidate = dir.join(format!("{stem}-{n}{ext}"));
            if !candidate.exists() {
                path = candidate;
                break;
            }
        }
    }

    std::fs::write(&path, &bytes).map_err(|e| format!("write {}: {e}", path.display()))?;

    // Best-effort open so the user sees the file immediately.
    let _ = std::process::Command::new("xdg-open").arg(&path).spawn();

    Ok(path.to_string_lossy().into_owned())
}

fn download_dir() -> Result<PathBuf, String> {
    if let Ok(xdg) = std::env::var("XDG_DOWNLOAD_DIR") {
        let p = PathBuf::from(xdg.trim());
        if !p.as_os_str().is_empty() {
            return Ok(p);
        }
    }
    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| "HOME is unset".to_string())?;
    Ok(home.join("Downloads"))
}

fn sanitize_download_name(raw: &str) -> String {
    let trimmed = raw.trim();
    let base = if trimmed.is_empty() { "texlooper-export" } else { trimmed };
    let cleaned: String = base
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect();
    let cleaned = cleaned.trim_matches('.').trim();
    if cleaned.is_empty() {
        "texlooper-export".into()
    } else {
        cleaned.chars().take(180).collect()
    }
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
    // WebKitGTK under Wayland (esp. fractional scale) reports corrupt
    // devicePixelRatio (≈±1/96) and lays out a blank UI. Prefer X11 unless
    // the user explicitly overrides.
    match std::env::var("TEXLOOPER_GDK_BACKEND") {
        Ok(v) if !v.is_empty() => std::env::set_var("GDK_BACKEND", v),
        _ if std::env::var_os("GDK_BACKEND").is_none() => {
            std::env::set_var("GDK_BACKEND", "x11");
        }
        _ => {}
    }

    #[cfg(not(debug_assertions))]
    crate::frontend_server::spawn_loopback_frontend();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if let Ok(assets) = app.path().resolve("assets", BaseDirectory::Resource) {
                if assets.is_dir() {
                    std::env::set_var("TEXLOOPER_ASSETS", &assets);
                }
            }
            let path = db_path(app.handle())?;
            let catalog = CatalogDb::open(&path).map_err(|e| e.to_string())?;
            app.manage(DbState(Arc::new(catalog)));
            #[cfg(not(debug_assertions))]
            if let Some(window) = app.get_webview_window("main") {
                use tauri::Url;
                let url = crate::frontend_server::loopback_url();
                window
                    .navigate(Url::parse(&url).map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
            }
            if let Some(window) = app.get_webview_window("main") {
                inject_window_size(&window);
                let win_for_resize = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Resized(_) = event {
                        inject_window_size(&win_for_resize);
                    }
                });
                // Re-inject after the SPA loads in the host iframe.
                let win_delayed = window.clone();
                std::thread::spawn(move || {
                    for delay_ms in [200u64, 600, 1500, 3000] {
                        std::thread::sleep(std::time::Duration::from_millis(delay_ms));
                        inject_window_size(&win_delayed);
                        let _ = win_delayed.eval(
                            r#"(function(){
  try{
    var frame=document.getElementById('frame');
    var doc=frame&&frame.contentDocument;
    var win=frame&&frame.contentWindow;
    var root=doc&&doc.getElementById('root');
    var studio=doc&&doc.querySelector('.studio-layout');
    var page=doc&&doc.querySelector('.editor-page--active');
    var payload={
      tag:'host-probe',
      at:Date.now(),
      where:'host',
      dpr:devicePixelRatio,
      inner:[innerWidth,innerHeight],
      hostScale:(window.__TEXLOOPER__&&window.__TEXLOOPER__.hostScale)||null,
      windowSize:(window.__TEXLOOPER__&&window.__TEXLOOPER__.windowSize)||null,
      frameInner:win?[win.innerWidth,win.innerHeight,win.devicePixelRatio]:null,
      rootHTML:root&&root.innerHTML?root.innerHTML.length:0,
      rootClient:root?{w:root.clientWidth,h:root.clientHeight}:null,
      rootRect:root?(function(b){return{w:b.width,h:b.height};})(root.getBoundingClientRect()):null,
      studio:!!studio,
      studioCols:studio?getComputedStyle(studio).gridTemplateColumns:null,
      page:!!page,
      layout:win&&win.__TEXLOOPER_LAYOUT__&&win.__TEXLOOPER_LAYOUT__.last||null
    };
    fetch('/__texlooper__/layout-dump',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(function(){});
  }catch(e){
    fetch('/__texlooper__/layout-dump',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag:'host-probe-error',at:Date.now(),message:String(e)}),keepalive:true}).catch(function(){});
  }
})();"#,
                        );
                    }
                });
                #[cfg(debug_assertions)]
                window.open_devtools();
                if std::env::var_os("TEXLOOPER_DEVTOOLS").is_some() {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_runtime_info,
            desktop_set_zoom,
            data_parse,
            dataset_sql_query,
            dataset_read_file,
            template_resolve,
            workflow_run,
            pdf_import_structure,
            render_project_pdf_cmd,
            render_batch_cmd,
            save_bytes_cmd,
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
