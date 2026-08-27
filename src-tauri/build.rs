fn main() {
    emit_build_metadata();

    #[cfg(feature = "desktop")]
    {
        let commands = &[
            "get_app_version",
            "get_runtime_info",
            "desktop_set_zoom",
            "data_parse",
            "template_resolve",
            "workflow_run",
            "pdf_import_structure",
            "render_project_pdf_cmd",
            "render_batch_cmd",
            "catalog_db_path",
            "catalog_list_filesystems",
            "catalog_upsert_filesystem",
            "catalog_list_projects",
            "catalog_get_project",
            "catalog_get_active_project",
            "catalog_save_project",
            "catalog_set_active_project",
            "catalog_delete_project",
            "catalog_list_files",
            "catalog_upsert_file",
            "catalog_list_variables",
            "catalog_set_variable",
            "catalog_get_app_state",
            "catalog_set_app_state",
        ];
        tauri_build::try_build(
            tauri_build::Attributes::new()
                .app_manifest(tauri_build::AppManifest::new().commands(commands)),
        )
        .expect("failed to run tauri-build");
    }
}

fn emit_build_metadata() {
    // Keep in sync with scripts/version-channel.mjs (RELEASE_CHANNEL).
    println!("cargo:rustc-env=TEXLOOPER_CHANNEL=alpha");
    println!("cargo:rustc-env=TEXLOOPER_GIT_COMMIT={}", resolve_git_commit());
    println!("cargo:rustc-env=TEXLOOPER_GIT_TAG={}", resolve_git_tag());
    println!(
        "cargo:rustc-env=TEXLOOPER_BUILD_UNIX={}",
        resolve_build_unix()
    );
    if let Ok(target) = std::env::var("TARGET") {
        println!("cargo:rustc-env=TEXLOOPER_TARGET={target}");
    }
    println!("cargo:rerun-if-changed=../scripts/version-channel.mjs");
    println!("cargo:rerun-if-env-changed=GITHUB_SHA");
    println!("cargo:rerun-if-env-changed=TEXLOOPER_GIT_COMMIT");
    println!("cargo:rerun-if-env-changed=TEXLOOPER_GIT_TAG");
    println!("cargo:rerun-if-env-changed=SOURCE_DATE_EPOCH");
}

fn resolve_git_commit() -> String {
    for key in ["TEXLOOPER_GIT_COMMIT", "GITHUB_SHA"] {
        if let Ok(sha) = std::env::var(key) {
            let short: String = sha.chars().take(7).collect();
            if !short.is_empty() {
                return short;
            }
        }
    }
    if let Ok(out) = std::process::Command::new("git")
        .args(["rev-parse", "--short=7", "HEAD"])
        .output()
    {
        if out.status.success() {
            let sha = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !sha.is_empty() {
                return sha;
            }
        }
    }
    "dev".into()
}

fn resolve_git_tag() -> String {
    if let Ok(tag) = std::env::var("TEXLOOPER_GIT_TAG") {
        let tag = tag.trim().to_string();
        if !tag.is_empty() {
            return tag;
        }
    }
    if let Ok(out) = std::process::Command::new("git")
        .args(["describe", "--tags", "--always"])
        .output()
    {
        if out.status.success() {
            let tag = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !tag.is_empty() {
                return tag;
            }
        }
    }
    "unknown".into()
}

fn resolve_build_unix() -> u64 {
    if let Ok(raw) = std::env::var("SOURCE_DATE_EPOCH") {
        if let Ok(epoch) = raw.parse::<u64>() {
            return epoch;
        }
    }
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}
