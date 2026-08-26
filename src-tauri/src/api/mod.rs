//! Shared API surface for Tauri + HTTP (ADR 0016).

pub mod handlers;
pub mod http;

pub use handlers::*;
pub use http::{build_router, serve_addr_is_loopback, ApiState};
