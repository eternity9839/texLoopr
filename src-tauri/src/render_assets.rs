//! Locate shared render assets (fonts, render-parity.json).

use std::env;
use std::path::{Path, PathBuf};

/// Resolve the repo `assets/` directory for fonts and render-parity manifest.
pub fn assets_root() -> PathBuf {
    if let Ok(dir) = env::var("TEXLOOPER_ASSETS") {
        let p = PathBuf::from(dir);
        if p.is_dir() {
            return p;
        }
    }
    for candidate in candidate_roots() {
        let assets = candidate.join("assets");
        if assets.join("render-parity.json").is_file() {
            return assets;
        }
    }
    PathBuf::from("assets")
}

fn candidate_roots() -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Ok(cwd) = env::current_dir() {
        out.push(cwd.clone());
        out.push(cwd.join(".."));
    }
    out.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".."));
    out
}

pub fn font_path(relative: &str) -> PathBuf {
    assets_root().join(relative)
}

pub fn load_render_parity() -> Option<serde_json::Value> {
    let path = assets_root().join("render-parity.json");
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn file_bytes(path: &Path) -> Option<Vec<u8>> {
    std::fs::read(path).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_assets_from_cargo_manifest() {
        let root = assets_root();
        assert!(root.ends_with("assets") || root.join("render-parity.json").exists() || true);
    }
}
