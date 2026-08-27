//! Batch project render + optional ZIP archive (ADR 0014).

use crate::render_pdf::{render_project_pdf, RenderError};
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::Write;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderBatchRequest {
    pub project: Value,
    pub rows: Vec<Value>,
    pub output: Option<Value>,
    #[serde(default)]
    pub include_zip: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderBatchFile {
    pub name: String,
    pub bytes_base64: String,
    pub row_index: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderBatchResult {
    pub files: Vec<RenderBatchFile>,
    pub zip_base64: Option<String>,
    pub errors: Vec<String>,
}

fn safe_segment(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return "row".into();
    }
    trimmed
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

fn output_ext(output: Option<&Value>) -> &'static str {
    let kind = output
        .and_then(|o| o.get("kind"))
        .and_then(|k| k.as_str())
        .unwrap_or("pdf");
    match kind {
        "pdf" | "print" => "pdf",
        "image" => "png",
        _ => "pdf",
    }
}

fn file_name(
    project: &Value,
    output: Option<&Value>,
    row_index: usize,
    ext: &str,
    single: bool,
) -> String {
    let project_name = project
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("document");
    let output_name = output
        .and_then(|o| o.get("name"))
        .and_then(|n| n.as_str())
        .unwrap_or("output");
    if single {
        return format!(
            "{}-{}.{}",
            safe_segment(project_name),
            safe_segment(output_name),
            ext
        );
    }
    format!(
        "{}-{}-{:03}.{}",
        safe_segment(project_name),
        safe_segment(output_name),
        row_index + 1,
        ext
    )
}

fn zip_entries(files: &[RenderBatchFile]) -> Result<Vec<u8>, String> {
    let mut buf = Vec::new();
    {
        let mut writer = ZipWriter::new(std::io::Cursor::new(&mut buf));
        let opts = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        for file in files {
            let bytes = B64
                .decode(&file.bytes_base64)
                .map_err(|e| format!("zip decode {}: {e}", file.name))?;
            writer
                .start_file(&file.name, opts)
                .map_err(|e| format!("zip start {}: {e}", file.name))?;
            writer
                .write_all(&bytes)
                .map_err(|e| format!("zip write {}: {e}", file.name))?;
        }
        writer
            .finish()
            .map_err(|e| format!("zip finish: {e}"))?;
    }
    Ok(buf)
}

pub fn render_batch(req: &RenderBatchRequest) -> Result<RenderBatchResult, RenderError> {
    let rows: Vec<Value> = if req.rows.is_empty() {
        vec![Value::Object(Default::default())]
    } else {
        req.rows.clone()
    };

    let ext = output_ext(req.output.as_ref());
    let mut files = Vec::new();
    let mut errors = Vec::new();
    let single = rows.len() == 1;

    for (row_index, row) in rows.iter().enumerate() {
        match render_project_pdf(&req.project, row, req.output.as_ref()) {
            Ok(bytes) => {
                files.push(RenderBatchFile {
                    name: file_name(
                        &req.project,
                        req.output.as_ref(),
                        row_index,
                        ext,
                        single,
                    ),
                    bytes_base64: B64.encode(&bytes),
                    row_index,
                });
            }
            Err(e) => errors.push(format!("row {}: {e}", row_index + 1)),
        }
    }

    if files.is_empty() {
        return Err(RenderError::Msg(format!(
            "render produced no files: {}",
            errors.join("; ")
        )));
    }

    let zip_base64 = if req.include_zip && files.len() > 0 {
        Some(
            B64.encode(
                zip_entries(&files).map_err(|e| RenderError::Msg(e))?,
            ),
        )
    } else {
        None
    };

    Ok(RenderBatchResult {
        files,
        zip_base64,
        errors,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn batch_renders_two_rows_and_zip() {
        let project = json!({
            "name": "Batch Test",
            "artboard": { "w": 400, "h": 300 },
            "pages": [{
                "id": "p1",
                "blocks": [{
                    "id": "b1",
                    "type": "text",
                    "x": 20, "y": 20, "w": 200, "h": 40,
                    "content": { "text": "Hi {{name}}" },
                    "style": { "fontSize": 12 }
                }]
            }],
            "outputs": [{ "id": "out-pdf", "name": "PDF", "kind": "pdf" }]
        });
        let req = RenderBatchRequest {
            project,
            rows: vec![json!({ "name": "Ada" }), json!({ "name": "Bob" })],
            output: None,
            include_zip: true,
        };
        let result = render_batch(&req).expect("batch");
        assert_eq!(result.files.len(), 2);
        assert!(result.zip_base64.is_some());
        assert!(result.errors.is_empty());
    }
}
