//! texlooper-cli — headless import + render + HTTP API (ADR 0014 / 0016).

use clap::{Parser, Subcommand};
use serde_json::Value;
use std::net::SocketAddr;
use std::path::PathBuf;
use texlooper_lib::api::handlers::resolve_output;
use texlooper_lib::api::{build_router, serve_addr_is_loopback, ApiState};
use texlooper_lib::catalog_store::open_catalog_from_env;
use texlooper_lib::pdf_import::import_pdf_from_path;
use texlooper_lib::render_pdf::render_project_pdf;

#[derive(Parser)]
#[command(name = "texlooper-cli", about = "Headless texLooper import/render/API")]
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
    /// HTTP API (engines + catalog). Loopback open; non-loopback needs TEXLOOPER_API_KEY
    /// unless TEXLOOPER_TRUST_EDGE=1 (auth at reverse proxy — Docker/Traefik only).
    Serve {
        #[arg(long, default_value = "127.0.0.1:8787")]
        bind: String,
        /// Force API key even on loopback
        #[arg(long)]
        require_auth: bool,
        /// Disable catalog routes
        #[arg(long)]
        no_catalog: bool,
    },
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
        Commands::Serve {
            bind,
            require_auth,
            no_catalog,
        } => {
            let addr: SocketAddr = bind.parse().expect("bind address");
            let loopback = serve_addr_is_loopback(addr);
            let trust_edge = std::env::var("TEXLOOPER_TRUST_EDGE")
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(false);
            let api_key = std::env::var("TEXLOOPER_API_KEY").ok().filter(|s| !s.is_empty());
            if !loopback && !trust_edge && api_key.is_none() {
                eprintln!("non-loopback bind requires TEXLOOPER_API_KEY (or TEXLOOPER_TRUST_EDGE=1)");
                std::process::exit(1);
            }
            let catalog = if no_catalog {
                None
            } else {
                let dir = std::env::var("TEXLOOPER_DATA_DIR")
                    .map(PathBuf::from)
                    .unwrap_or_else(|_| {
                        dirs_fallback()
                    });
                match open_catalog_from_env(&dir) {
                    Ok(c) => {
                        println!("catalog: {} ({})", c.backend_name(), c.db_path_display());
                        Some(c)
                    }
                    Err(e) => {
                        eprintln!("catalog unavailable: {e}");
                        None
                    }
                }
            };
            // Edge trust: Traefik/auth already gate access; do not require client API keys.
            let open_for_edge = trust_edge && !require_auth;
            let state = ApiState {
                catalog,
                api_key,
                force_auth: require_auth,
                bind_is_loopback: loopback || open_for_edge,
            };
            let app = build_router(state);
            if trust_edge {
                println!("texlooper-cli edge-trust enabled (no client API key)");
            }
            println!("texlooper-cli listening on http://{addr}");
            let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
            axum::serve(listener, app).await.expect("serve");
        }
    }
}

fn dirs_fallback() -> PathBuf {
    std::env::temp_dir().join("texlooper-api")
}
