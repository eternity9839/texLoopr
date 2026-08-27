//! Compile-time build identity (git commit, channel, profile, target).

use serde_json::{json, Value};

pub fn channel() -> &'static str {
    option_env!("TEXLOOPER_CHANNEL").unwrap_or("alpha")
}

pub fn git_commit() -> &'static str {
    option_env!("TEXLOOPER_GIT_COMMIT").unwrap_or("unknown")
}

pub fn built_at_unix() -> i64 {
    option_env!("TEXLOOPER_BUILD_UNIX")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0)
}

pub fn profile() -> &'static str {
    if cfg!(debug_assertions) {
        "debug"
    } else {
        "release"
    }
}

pub fn target_triple() -> &'static str {
    option_env!("TEXLOOPER_TARGET").unwrap_or("unknown")
}

pub fn git_tag() -> &'static str {
    option_env!("TEXLOOPER_GIT_TAG").unwrap_or("unknown")
}

pub fn json() -> Value {
    json!({
        "channel": channel(),
        "gitCommit": git_commit(),
        "gitTag": git_tag(),
        "builtAtUnix": built_at_unix(),
        "profile": profile(),
        "target": target_triple(),
    })
}
