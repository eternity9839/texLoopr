//! texlooper-cli — headless import + render + local API (ADR 0014).

use axum::{
    body::Body,
    extract::Json,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use clap::{Parser, Subcommand};
use serde::Deserialize;
use serde_json::Value;
use std::net::SocketAddr;
use std::path::PathBuf;
use texlooper_lib::pdf_import::{import_pdf_from_path, import_pdf_structure};
use texlooper_lib::render_pdf::render_project_pdf;
use tower_http::cors::CorsLayer;

#[derive(Parser)]
#[command(name = "texlooper-cli", about = "Headless texLooper import/render")]
struct Cli {
    #[command(subcommand)]
    cmd: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Import a PDF into Project JSON (structure pass, ADR 0012)
    ImportPdf {
        #[arg(long)]
        input: PathBuf,
        #[arg(long)]
        output: PathBuf,
    },
    /// Render project + data row to PDF
    Render {
        #[arg(long)]
        project: PathBuf,
        #[arg(long)]
        data: PathBuf,
        #[arg(long)]
        output: PathBuf,
        #[arg(long)]
        output_id: Option<String>,
    },
    /// Local HTTP API on 127.0.0.1 (no auth)
    Serve {
        #[arg(long, default_value = "127.0.0.1:8787")]
        bind: String,
    },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenderBody {
    project: Value,
    data: Value,
    #[serde(default)]
    output: Option<Value>,
    #[serde(default)]
    output_id: Option<String>,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    match cli.cmd {
        Commands::ImportPdf { input, output } => {
            let result = import_pdf_from_path(&input, None).unwrap_or_else(|e| {
                eprintln!("import failed: {e}");
                std::process::exit(1);
            });
            for w in &result.warnings {
                eprintln!("warning: {w}");
            }
            let json = serde_json::to_vec_pretty(&result.project).expect("serialize");
            std::fs::write(&output, json).expect("write project");
            println!("wrote {}", output.display());
        }
        Commands::Render {
            project,
            data,
            output,
            output_id,
        } => {
            let project: Value =
                serde_json::from_slice(&std::fs::read(&project).expect("read project"))
                    .expect("parse project");
            let data: Value = serde_json::from_slice(&std::fs::read(&data).expect("read data"))
                .expect("parse data");
            let out_profile = resolve_output(&project, output_id.as_deref(), None);
            let bytes = render_project_pdf(&project, &data, out_profile.as_ref()).unwrap_or_else(
                |e| {
                    eprintln!("render failed: {e}");
                    std::process::exit(1);
                },
            );
            std::fs::write(&output, &bytes).expect("write pdf");
            println!("wrote {} ({} bytes)", output.display(), bytes.len());
        }
        Commands::Serve { bind } => {
            let addr: SocketAddr = bind.parse().expect("bind address");
            if !addr.ip().is_loopback() {
                eprintln!("refusing non-loopback bind in v1 (use 127.0.0.1)");
                std::process::exit(1);
            }
            let app = Router::new()
                .route("/health", get(|| async { "ok" }))
                .route("/v1/render", post(handle_render))
                .route("/v1/import-pdf", post(handle_import))
                .layer(CorsLayer::permissive());
            println!("texlooper-cli listening on http://{addr} (local only)");
            let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
            axum::serve(listener, app).await.expect("serve");
        }
    }
}

fn resolve_output(
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

async fn handle_render(Json(body): Json<RenderBody>) -> Response {
    let out = resolve_output(&body.project, body.output_id.as_deref(), body.output);
    match render_project_pdf(&body.project, &body.data, out.as_ref()) {
        Ok(bytes) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "application/pdf")
            .body(Body::from(bytes))
            .unwrap(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

#[derive(Deserialize)]
struct ImportBody {
    /// Raw PDF as base64
    #[serde(default)]
    bytes_base64: Option<String>,
}

async fn handle_import(Json(body): Json<ImportBody>) -> Response {
    use base64::Engine;
    let Some(b64) = body.bytes_base64 else {
        return (StatusCode::BAD_REQUEST, "bytesBase64 required").into_response();
    };
    let bytes = match base64::engine::general_purpose::STANDARD.decode(b64.trim()) {
        Ok(b) => b,
        Err(e) => return (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    };
    match import_pdf_structure(&bytes, None) {
        Ok(result) => Json(result).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}
