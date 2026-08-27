//! HTTP `/v1` router shared by CLI serve (ADR 0016).

use crate::api::handlers::{
    handle_data_parse, handle_import_pdf, handle_render, handle_render_batch,
    handle_template_resolve, handle_workflow_run, runtime_info, ImportPdfRequest, RenderBatchHttpRequest,
    RenderRequest, TemplateResolveRequest, WorkflowRunRequest,
};
use crate::catalog_store::CatalogStore;
use crate::data_sources::{
    apply_rows_to_dataset, find_dataset, ingest_secret_ok, load_source_rows, parse_payload,
    persist_project_document, read_data_file, run_sqlite_query, set_dataset_error, SqlQueryRequest,
};
use crate::render_batch::{render_batch, RenderBatchRequest};
use crate::api::handlers::resolve_output;
use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, HeaderMap, Request, StatusCode},
    middleware::{from_fn_with_state, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct ApiState {
    pub catalog: Option<Arc<dyn CatalogStore>>,
    /// When set, required for non-loopback (and always if `force_auth`).
    pub api_key: Option<String>,
    pub force_auth: bool,
    pub bind_is_loopback: bool,
}

pub fn build_router(state: ApiState) -> Router {
    let cors = if state.bind_is_loopback && !state.force_auth {
        CorsLayer::permissive()
    } else {
        CorsLayer::new()
            .allow_methods(Any)
            .allow_headers(Any)
            .allow_origin(Any)
    };

    let public = Router::new()
        .route("/health", get(health))
        .route("/v1/health", get(health))
        .route("/v1/runtime", get(get_runtime));

    let protected = Router::new()
        .route("/v1/data/parse", post(data_parse))
        .route("/v1/data/sql", post(data_sql))
        .route("/v1/data/read-file", post(data_read_file))
        .route(
            "/v1/data/sources/{dataset_id}/ingest",
            post(dataset_ingest),
        )
        .route(
            "/v1/data/sources/{dataset_id}/refresh",
            post(dataset_refresh),
        )
        .route("/v1/triggers/run", post(triggers_run))
        .route("/v1/template/resolve", post(template_resolve))
        .route("/v1/workflow/run", post(workflow_run))
        .route("/v1/render", post(render))
        .route("/v1/render-batch", post(render_batch_route))
        .route("/v1/import-pdf", post(import_pdf))
        .route("/v1/catalog/projects", get(list_projects).post(save_project))
        .route("/v1/catalog/projects/active", get(get_active_project))
        .route(
            "/v1/catalog/projects/{id}",
            get(get_project).delete(delete_project).put(set_active),
        )
        .route("/v1/catalog/path", get(catalog_path))
        .layer(from_fn_with_state(state.clone(), auth_middleware));

    public.merge(protected).layer(cors).with_state(state)
}

async fn health() -> &'static str {
    "ok"
}

async fn get_runtime() -> Json<Value> {
    Json(runtime_info())
}

async fn auth_middleware(
    State(state): State<ApiState>,
    headers: HeaderMap,
    request: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let need_auth = state.force_auth || !state.bind_is_loopback;
    if !need_auth {
        return Ok(next.run(request).await);
    }
    let Some(expected) = state.api_key.as_deref() else {
        return Err(StatusCode::UNAUTHORIZED);
    };
    let provided = headers
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .or_else(|| {
            headers
                .get(header::AUTHORIZATION)
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.strip_prefix("Bearer ").map(|t| t.to_string()))
        });
    match provided {
        Some(p) if p == expected => Ok(next.run(request).await),
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

async fn data_parse(Json(body): Json<Value>) -> Response {
    let text = body
        .get("text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    match handle_data_parse(&text) {
        Ok(r) => Json(r).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

async fn data_sql(Json(body): Json<SqlQueryRequest>) -> Response {
    if body.driver != "sqlite" {
        return (
            StatusCode::BAD_REQUEST,
            "Postgres data sources are not implemented yet",
        )
            .into_response();
    }
    match run_sqlite_query(&body.connection, &body.query) {
        Ok(rows) => Json(json!({ "rows": rows })).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

#[derive(Deserialize)]
struct ReadFileBody {
    path: String,
}

async fn data_read_file(Json(body): Json<ReadFileBody>) -> Response {
    match read_data_file(&body.path) {
        Ok(text) => Json(json!({ "text": text })).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

fn project_id_from(headers: &HeaderMap, body: &Value) -> Option<String> {
    headers
        .get("x-project-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .or_else(|| {
            body.get("projectId")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
}

async fn dataset_ingest(
    State(state): State<ApiState>,
    Path(dataset_id): Path<String>,
    headers: HeaderMap,
    body: String,
) -> Response {
    let Ok(c) = catalog(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    let parsed_json: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
    let Some(project_id) = project_id_from(&headers, &parsed_json) else {
        return (
            StatusCode::BAD_REQUEST,
            "projectId required (body or X-Project-Id)",
        )
            .into_response();
    };
    let record = match c.get_project(&project_id) {
        Ok(Some(p)) => p,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };
    let Some(ds) = find_dataset(&record.document, &dataset_id) else {
        return (StatusCode::NOT_FOUND, "dataset not found").into_response();
    };
    let secret = headers
        .get("x-texlooper-ingest-secret")
        .and_then(|v| v.to_str().ok());
    if !ingest_secret_ok(ds, secret) {
        return StatusCode::UNAUTHORIZED.into_response();
    }
    let format = ds
        .get("source")
        .and_then(|s| s.get("responseFormat"))
        .and_then(|v| v.as_str())
        .or_else(|| {
            headers
                .get(header::CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .and_then(|ct| {
                    if ct.contains("xml") {
                        Some("xml")
                    } else if ct.contains("csv") || ct.contains("text/plain") {
                        Some("csv")
                    } else {
                        Some("json")
                    }
                })
        });
    let rows = if let Some(arr) = parsed_json.get("rows").and_then(|v| v.as_array()) {
        arr.clone()
    } else {
        match parse_payload(&body, format, None) {
            Ok(r) => r.rows,
            Err(e) => return (StatusCode::BAD_REQUEST, e).into_response(),
        }
    };
    match apply_rows_to_dataset(record.document.clone(), &dataset_id, rows) {
        Ok((doc, count)) => match persist_project_document(c, &record, doc) {
            Ok(()) => Json(json!({ "rowCount": count })).into_response(),
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
        },
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DatasetRefreshBody {
    project_id: String,
}

async fn dataset_refresh(
    State(state): State<ApiState>,
    Path(dataset_id): Path<String>,
    Json(body): Json<DatasetRefreshBody>,
) -> Response {
    let Ok(c) = catalog(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    let record = match c.get_project(&body.project_id) {
        Ok(Some(p)) => p,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };
    let Some(ds) = find_dataset(&record.document, &dataset_id).cloned() else {
        return (StatusCode::NOT_FOUND, "dataset not found").into_response();
    };
    match load_source_rows(&ds).await {
        Ok(rows) => match apply_rows_to_dataset(record.document.clone(), &dataset_id, rows) {
            Ok((doc, count)) => match persist_project_document(c, &record, doc) {
                Ok(()) => Json(json!({ "rowCount": count })).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
            },
            Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
        },
        Err(e) => {
            let doc = set_dataset_error(record.document.clone(), &dataset_id, &e);
            let _ = persist_project_document(c, &record, doc);
            (StatusCode::BAD_REQUEST, e).into_response()
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TriggersRunBody {
    project_id: String,
    dataset_id: Option<String>,
    output_id: Option<String>,
    #[serde(default)]
    render: bool,
}

async fn triggers_run(
    State(state): State<ApiState>,
    Json(body): Json<TriggersRunBody>,
) -> Response {
    let Ok(c) = catalog(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    let mut record = match c.get_project(&body.project_id) {
        Ok(Some(p)) => p,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };
    if let Some(dataset_id) = body.dataset_id.as_deref() {
        let Some(ds) = find_dataset(&record.document, dataset_id).cloned() else {
            return (StatusCode::NOT_FOUND, "dataset not found").into_response();
        };
        match load_source_rows(&ds).await {
            Ok(rows) => match apply_rows_to_dataset(record.document.clone(), dataset_id, rows) {
                Ok((doc, _)) => {
                    if let Err(e) = persist_project_document(c, &record, doc.clone()) {
                        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
                    }
                    record.document = doc;
                }
                Err(e) => return (StatusCode::BAD_REQUEST, e).into_response(),
            },
            Err(e) => return (StatusCode::BAD_REQUEST, e).into_response(),
        }
    }
    if !body.render {
        return Json(json!({ "ok": true, "rendered": false })).into_response();
    }
    let primary_id = record
        .document
        .get("primaryDatasetId")
        .and_then(|v| v.as_str());
    let rows = record
        .document
        .get("datasets")
        .and_then(|v| v.as_array())
        .and_then(|arr| {
            arr.iter()
                .find(|d| d.get("id").and_then(|v| v.as_str()) == primary_id)
                .or_else(|| arr.first())
                .and_then(|d| d.get("rows"))
                .and_then(|v| v.as_array())
                .cloned()
        })
        .unwrap_or_else(|| vec![json!({})]);
    let output = resolve_output(&record.document, body.output_id.as_deref(), None);
    let req = RenderBatchRequest {
        project: record.document.clone(),
        rows,
        output,
        include_zip: false,
    };
    match render_batch(&req) {
        Ok(r) => Json(json!({ "ok": true, "rendered": true, "batch": r })).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

async fn template_resolve(Json(body): Json<TemplateResolveRequest>) -> Response {
    Json(serde_json::json!({ "text": handle_template_resolve(&body) })).into_response()
}

async fn workflow_run(Json(body): Json<WorkflowRunRequest>) -> Response {
    Json(handle_workflow_run(&body)).into_response()
}

async fn render(Json(body): Json<RenderRequest>) -> Response {
    match handle_render(&body) {
        Ok(bytes) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "application/pdf")
            .body(Body::from(bytes))
            .unwrap(),
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

async fn render_batch_route(Json(body): Json<RenderBatchHttpRequest>) -> Response {
    match handle_render_batch(&body) {
        Ok(r) => Json(r).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

async fn import_pdf(Json(body): Json<ImportPdfRequest>) -> Response {
    match handle_import_pdf(&body) {
        Ok(r) => Json(r).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

fn catalog(state: &ApiState) -> Result<&Arc<dyn CatalogStore>, StatusCode> {
    state.catalog.as_ref().ok_or(StatusCode::SERVICE_UNAVAILABLE)
}

async fn catalog_path(State(state): State<ApiState>) -> Response {
    match catalog(&state) {
        Ok(c) => Json(serde_json::json!({
            "backend": c.backend_name(),
            "path": c.db_path_display(),
        }))
        .into_response(),
        Err(s) => s.into_response(),
    }
}

async fn list_projects(State(state): State<ApiState>) -> Response {
    let Ok(c) = catalog(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    match c.list_projects() {
        Ok(rows) => Json(rows).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_project(State(state): State<ApiState>, Path(id): Path<String>) -> Response {
    let Ok(c) = catalog(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    match c.get_project(&id) {
        Ok(Some(p)) => Json(p).into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_active_project(State(state): State<ApiState>) -> Response {
    let Ok(c) = catalog(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    match c.get_active_project() {
        Ok(Some(p)) => Json(p).into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveProjectBody {
    id: Option<String>,
    name: String,
    document: Value,
    #[serde(default)]
    meta: Value,
    filesystem_id: Option<String>,
    relative_path: Option<String>,
    #[serde(default)]
    activate: bool,
}

async fn save_project(State(state): State<ApiState>, Json(body): Json<SaveProjectBody>) -> Response {
    let Ok(c) = catalog(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    match c.save_project(
        body.id,
        &body.name,
        body.document,
        body.meta,
        body.filesystem_id,
        body.relative_path,
        body.activate,
    ) {
        Ok(p) => Json(p).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

async fn delete_project(State(state): State<ApiState>, Path(id): Path<String>) -> Response {
    let Ok(c) = catalog(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    match c.delete_project(&id) {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

async fn set_active(State(state): State<ApiState>, Path(id): Path<String>) -> Response {
    let Ok(c) = catalog(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    match c.set_active_project(&id) {
        Ok(p) => Json(p).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

pub fn serve_addr_is_loopback(addr: SocketAddr) -> bool {
    addr.ip().is_loopback()
}
