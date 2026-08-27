//! Shared engine handlers (ADR 0016) — Tauri and HTTP call the same functions.

use crate::data::{parse_data_input, ParseResult};
use crate::pdf_import::{import_pdf_from_base64, import_pdf_structure, PdfImportResult};
use crate::render_batch::{render_batch, RenderBatchRequest, RenderBatchResult};
use crate::render_pdf::render_project_pdf;
use crate::template::{resolve_template, RuntimeContext};
use crate::workflow::{run_workflow, WorkflowResult};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

pub fn runtime_info() -> Value {
    let mut info = serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "backbone": "rust",
        "engines": [
            "catalog",
            "data_parse",
            "data_sources",
            "template_resolve",
            "workflow_run",
            "pdf_import_structure",
            "render_project_pdf",
            "render_batch"
        ],
    });
    if let Value::Object(ref mut map) = info {
        if let Value::Object(extra) = crate::build_info::json() {
            map.extend(extra);
        }
    }
    info
}

pub fn handle_data_parse(text: &str) -> Result<ParseResult, String> {
    parse_data_input(text).map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateResolveRequest {
    pub template: String,
    pub row: Value,
    #[serde(default)]
    pub ctx: Option<Value>,
    #[serde(default)]
    pub missing_as_empty: Option<bool>,
}

pub fn handle_template_resolve(req: &TemplateResolveRequest) -> String {
    let missing = req.missing_as_empty.unwrap_or(true);
    let runtime = req.ctx.as_ref().map(ctx_from_value);
    resolve_template(&req.template, &req.row, runtime.as_ref(), missing)
}

pub fn ctx_from_value(v: &Value) -> RuntimeContext {
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRunRequest {
    pub project: Value,
    pub row: Value,
    pub output: Value,
    #[serde(default)]
    pub vars: Option<Value>,
    #[serde(default)]
    pub preview: Option<bool>,
}

pub fn handle_workflow_run(req: &WorkflowRunRequest) -> WorkflowResult {
    run_workflow(
        &req.project,
        &req.row,
        &req.output,
        req.vars.as_ref(),
        req.preview.unwrap_or(false),
    )
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderRequest {
    pub project: Value,
    /// Single-row data (alias: `data` or `row`)
    #[serde(default)]
    pub data: Option<Value>,
    #[serde(default)]
    pub row: Option<Value>,
    #[serde(default)]
    pub output: Option<Value>,
    #[serde(default)]
    pub output_id: Option<String>,
}

pub fn resolve_output(
    project: &Value,
    output_id: Option<&str>,
    explicit: Option<Value>,
) -> Option<Value> {
    if let Some(o) = explicit {
        return Some(o);
    }
    let outs = project.get("outputs")?.as_array()?;
    if let Some(id) = output_id {
        return outs
            .iter()
            .find(|o| o.get("id").and_then(|v| v.as_str()) == Some(id))
            .cloned();
    }
    outs.iter()
        .find(|o| o.get("kind").and_then(|k| k.as_str()) == Some("pdf"))
        .cloned()
        .or_else(|| outs.first().cloned())
}

pub fn handle_render(req: &RenderRequest) -> Result<Vec<u8>, String> {
    let row = req
        .row
        .clone()
        .or_else(|| req.data.clone())
        .ok_or_else(|| "row or data required".to_string())?;
    let out = resolve_output(&req.project, req.output_id.as_deref(), req.output.clone());
    render_project_pdf(&req.project, &row, out.as_ref()).map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderBatchHttpRequest {
    pub project: Value,
    pub rows: Vec<Value>,
    #[serde(default)]
    pub output: Option<Value>,
    #[serde(default)]
    pub output_id: Option<String>,
    #[serde(default)]
    pub include_zip: Option<bool>,
}

pub fn handle_render_batch(req: &RenderBatchHttpRequest) -> Result<RenderBatchResult, String> {
    let output = resolve_output(&req.project, req.output_id.as_deref(), req.output.clone());
    let batch = RenderBatchRequest {
        project: req.project.clone(),
        rows: req.rows.clone(),
        output,
        include_zip: req.include_zip.unwrap_or(true),
    };
    render_batch(&batch).map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPdfRequest {
    #[serde(default)]
    pub bytes_base64: Option<String>,
}

pub fn handle_import_pdf(req: &ImportPdfRequest) -> Result<PdfImportResult, String> {
    let b64 = req
        .bytes_base64
        .as_deref()
        .ok_or_else(|| "bytesBase64 required".to_string())?;
    import_pdf_from_base64(b64, None).map_err(|e| e.to_string())
}

pub fn handle_import_pdf_bytes(bytes: &[u8]) -> Result<PdfImportResult, String> {
    import_pdf_structure(bytes, None).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiErrorBody {
    pub error: String,
}

pub fn json_map_error(err: impl ToString) -> Value {
    let mut m = Map::new();
    m.insert("error".into(), Value::String(err.to_string()));
    Value::Object(m)
}
