//! Template + expression helpers for the Rust runtime backbone.

use regex::Regex;
use serde_json::{Map, Value};
use std::sync::OnceLock;

fn civil_from_days(z: i64) -> (i32, u32, u32) {
    // Howard Hinnant civil_from_days — days since Unix epoch → Y-M-D (UTC).
    let z = z + 719_468;
    let era = (if z >= 0 { z } else { z - 146_096 }).div_euclid(146_097);
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m as u32, d as u32)
}

fn re_slot() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\{\{\s*([^}#/][^}|]*?)(?:\|([^}]+))?\s*\}\}").unwrap())
}

fn re_if() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{/if\}\}")
            .unwrap()
    })
}

#[derive(Clone, Default)]
pub struct RuntimeContext {
    pub data: Map<String, Value>,
    pub output: Map<String, Value>,
    pub device: Map<String, Value>,
    pub vars: Map<String, Value>,
    pub env: Map<String, Value>,
}

impl RuntimeContext {
    pub fn from_row(row: &Value, output: &Value, preview: bool) -> Self {
        Self::from_row_with_language(row, output, preview, None)
    }

    /// Build context and seed `vars.language` / `env.language` (ADR 0015).
    pub fn from_row_with_language(
        row: &Value,
        output: &Value,
        preview: bool,
        project_language: Option<&str>,
    ) -> Self {
        let data = match row {
            Value::Object(m) => m.clone(),
            _ => Map::new(),
        };
        let output_map = match output {
            Value::Object(m) => m.clone(),
            _ => Map::new(),
        };
        let device = match output_map.get("device") {
            Some(Value::Object(m)) => m.clone(),
            _ => Map::new(),
        };
        let mut env = Map::new();
        env.insert("preview".into(), Value::Bool(preview));
        let now = std::time::SystemTime::now();
        let millis = now
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        env.insert(
            "timestamp".into(),
            Value::Number(serde_json::Number::from(millis)),
        );
        // Local calendar date YYYY-MM-DD (best-effort via UTC offset unavailable — use UTC date).
        let secs = (millis / 1000) as i64;
        let days = secs.div_euclid(86_400);
        let (y, m, d) = civil_from_days(days);
        let today = format!("{:04}-{:02}-{:02}", y, m, d);
        env.insert("today".into(), Value::String(today.clone()));
        env.insert(
            "now".into(),
            Value::String(format!(
                "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
                y,
                m,
                d,
                (secs.rem_euclid(86_400) / 3600),
                (secs.rem_euclid(3600) / 60),
                secs.rem_euclid(60),
                millis % 1000
            )),
        );
        let language = resolve_document_language(row, project_language);
        let mut vars = Map::new();
        vars.insert("language".into(), Value::String(language.clone()));
        env.insert("language".into(), Value::String(language));
        Self {
            data,
            output: output_map,
            device,
            vars,
            env,
        }
    }

    pub fn to_json(&self) -> Value {
        let mut m = Map::new();
        m.insert("data".into(), Value::Object(self.data.clone()));
        m.insert("output".into(), Value::Object(self.output.clone()));
        m.insert("device".into(), Value::Object(self.device.clone()));
        m.insert("vars".into(), Value::Object(self.vars.clone()));
        m.insert("env".into(), Value::Object(self.env.clone()));
        Value::Object(m)
    }
}

/// Resolve document language: row `language`/`lang` → project → `"en"`.
pub fn resolve_document_language(row: &Value, project_language: Option<&str>) -> String {
    for key in ["language", "lang"] {
        if let Some(v) = row.get(key).and_then(|x| x.as_str()) {
            let t = v.trim().to_lowercase();
            if !t.is_empty() {
                return t;
            }
        }
    }
    if let Some(p) = project_language {
        let t = p.trim().to_lowercase();
        if !t.is_empty() {
            return t;
        }
    }
    "en".into()
}

pub fn resolve_template(
    template: &str,
    row: &Value,
    ctx: Option<&RuntimeContext>,
    missing_as_empty: bool,
) -> String {
    let owned;
    let runtime = match ctx {
        Some(c) => c,
        None => {
            owned = RuntimeContext::from_row(row, &Value::Object(Map::new()), false);
            &owned
        }
    };
    let with_cond = expand_conditionals(template, runtime);
    re_slot()
        .replace_all(&with_cond, |caps: &regex::Captures| {
            let path = caps.get(1).map(|m| m.as_str().trim()).unwrap_or("");
            if path.is_empty() || path.starts_with('#') || path == "else" {
                return String::new();
            }
            let filter_raw = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            let filters: Vec<&str> = filter_raw
                .split('|')
                .map(|f| f.trim())
                .filter(|f| !f.is_empty())
                .collect();

            let looked = lookup_value(path, row, runtime);
            let mut value = match &looked {
                Some(v) if !v.is_null() => value_to_string(v),
                _ if missing_as_empty || !filters.is_empty() => String::new(),
                _ => return format!("{{{{{path}}}}}"),
            };
            value = apply_filters(&value, &filters);
            value
        })
        .into_owned()
}

fn expand_conditionals(template: &str, ctx: &RuntimeContext) -> String {
    let mut out = template.to_string();
    for _ in 0..32 {
        let next = re_if()
            .replace_all(&out, |caps: &regex::Captures| {
                let expr = caps.get(1).map(|m| m.as_str().trim()).unwrap_or("");
                let then_part = caps.get(2).map(|m| m.as_str()).unwrap_or("");
                let else_part = caps.get(3).map(|m| m.as_str()).unwrap_or("");
                let ok = evaluate_condition(expr, &Value::Object(ctx.data.clone()), Some(ctx));
                if ok {
                    then_part.to_string()
                } else {
                    else_part.to_string()
                }
            })
            .into_owned();
        if next == out {
            break;
        }
        out = next;
    }
    out
}

pub fn evaluate_condition(condition: &str, row: &Value, ctx: Option<&RuntimeContext>) -> bool {
    let trimmed = condition.trim();
    if trimmed.is_empty() {
        return true;
    }
    if trimmed == "false" || trimmed == "0" {
        return false;
    }

    // Legacy presence: field / !field
    let legacy = Regex::new(r"^!?([\w.-]+)$").unwrap();
    if let Some(caps) = legacy.captures(trimmed) {
        if !trimmed.contains(' ') {
            let key = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let field = key.strip_prefix("data.").unwrap_or(key);
            let present = lookup_value(field, row, ctx.unwrap_or(&RuntimeContext::default()))
                .map(|v| truthy(&v))
                .unwrap_or(false);
            return if trimmed.starts_with('!') {
                !present
            } else {
                present
            };
        }
    }

    let owned;
    let runtime = match ctx {
        Some(c) => c,
        None => {
            owned = RuntimeContext::from_row(row, &Value::Object(Map::new()), false);
            &owned
        }
    };
    evaluate_expr_bool(trimmed, runtime)
}

fn evaluate_expr_bool(source: &str, ctx: &RuntimeContext) -> bool {
    // Minimal expression evaluator for common authoring cases.
    let s = source.trim();
    if let Some(v) = lookup_value(s, &Value::Object(ctx.data.clone()), ctx) {
        return truthy(&v);
    }
    // Comparisons: a == b, a != b
    for op in ["==", "!=", ">=", "<=", ">", "<"] {
        if let Some((left, right)) = split_once_op(s, op) {
            let lv = resolve_atom(left.trim(), ctx);
            let rv = resolve_atom(right.trim(), ctx);
            return match op {
                "==" => values_eq(&lv, &rv),
                "!=" => !values_eq(&lv, &rv),
                ">" => cmp_num(&lv, &rv).map(|c| c > 0).unwrap_or(false),
                "<" => cmp_num(&lv, &rv).map(|c| c < 0).unwrap_or(false),
                ">=" => cmp_num(&lv, &rv).map(|c| c >= 0).unwrap_or(false),
                "<=" => cmp_num(&lv, &rv).map(|c| c <= 0).unwrap_or(false),
                _ => false,
            };
        }
    }
    if let Some(rest) = s.strip_prefix('!') {
        return !evaluate_expr_bool(rest.trim(), ctx);
    }
    if let Some((a, b)) = s.split_once("&&") {
        return evaluate_expr_bool(a.trim(), ctx) && evaluate_expr_bool(b.trim(), ctx);
    }
    if let Some((a, b)) = s.split_once("||") {
        return evaluate_expr_bool(a.trim(), ctx) || evaluate_expr_bool(b.trim(), ctx);
    }
    true // fail open for authoring
}

fn split_once_op<'a>(s: &'a str, op: &str) -> Option<(&'a str, &'a str)> {
    s.find(op).map(|i| (&s[..i], &s[i + op.len()..]))
}

fn resolve_atom(atom: &str, ctx: &RuntimeContext) -> Value {
    if (atom.starts_with('"') && atom.ends_with('"'))
        || (atom.starts_with('\'') && atom.ends_with('\''))
    {
        return Value::String(atom[1..atom.len() - 1].to_string());
    }
    if atom == "true" {
        return Value::Bool(true);
    }
    if atom == "false" {
        return Value::Bool(false);
    }
    if let Ok(n) = atom.parse::<f64>() {
        return Value::Number(serde_json::Number::from_f64(n).unwrap_or_else(|| 0.into()));
    }
    lookup_value(atom, &Value::Object(ctx.data.clone()), ctx).unwrap_or(Value::Null)
}

fn values_eq(a: &Value, b: &Value) -> bool {
    value_to_string(a) == value_to_string(b)
}

fn cmp_num(a: &Value, b: &Value) -> Option<i32> {
    let an = value_to_string(a).parse::<f64>().ok()?;
    let bn = value_to_string(b).parse::<f64>().ok()?;
    Some(an.partial_cmp(&bn).map(|o| o as i8 as i32).unwrap_or(0))
}

pub fn evaluate_expr(source: &str, ctx: &RuntimeContext) -> Value {
    let s = source.trim();
    if s.is_empty() {
        return Value::Bool(true);
    }
    // Template-style scripts often just return a path or string expression
    if let Some(v) = lookup_value(s, &Value::Object(ctx.data.clone()), ctx) {
        return v;
    }
    if evaluate_expr_bool(s, ctx) && looks_like_bool_expr(s) {
        return Value::Bool(true);
    }
    if !evaluate_expr_bool(s, ctx) && looks_like_bool_expr(s) {
        return Value::Bool(false);
    }
    Value::String(s.to_string())
}

fn looks_like_bool_expr(s: &str) -> bool {
    s.contains("==")
        || s.contains("!=")
        || s.contains("&&")
        || s.contains("||")
        || s.contains('>')
        || s.contains('<')
        || s.starts_with('!')
}

pub fn lookup_value(path: &str, row: &Value, ctx: &RuntimeContext) -> Option<Value> {
    let roots = ["data", "output", "device", "vars", "env"];
    if roots.iter().any(|r| path == *r || path.starts_with(&format!("{r}."))) {
        let mut parts = path.split('.');
        let root = parts.next()?;
        let mut cur = match root {
            "data" => Value::Object(ctx.data.clone()),
            "output" => Value::Object(ctx.output.clone()),
            "device" => Value::Object(ctx.device.clone()),
            "vars" => Value::Object(ctx.vars.clone()),
            "env" => Value::Object(ctx.env.clone()),
            _ => return None,
        };
        for p in parts {
            cur = get_at(&cur, p)?;
        }
        return Some(cur);
    }
    if let Value::Object(map) = row {
        if let Some(v) = map.get(path) {
            return Some(v.clone());
        }
    }
    get_path(row, path).or_else(|| get_path(&Value::Object(ctx.data.clone()), path))
}

fn get_path(root: &Value, path: &str) -> Option<Value> {
    let mut cur = root.clone();
    for p in path.split('.') {
        cur = get_at(&cur, p)?;
    }
    Some(cur)
}

fn get_at(cur: &Value, key: &str) -> Option<Value> {
    match cur {
        Value::Object(m) => m.get(key).cloned(),
        Value::Array(arr) => {
            let idx: usize = key.parse().ok()?;
            arr.get(idx).cloned()
        }
        _ => None,
    }
}

fn value_to_string(v: &Value) -> String {
    match v {
        Value::Null => String::new(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

fn truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().unwrap_or(0.0) != 0.0,
        Value::String(s) => !s.is_empty(),
        Value::Array(a) => !a.is_empty(),
        Value::Object(m) => !m.is_empty(),
    }
}

fn apply_filters(value: &str, filters: &[&str]) -> String {
    let mut out = value.to_string();
    for raw in filters {
        let mut parts = raw.splitn(2, ':');
        let name = parts.next().unwrap_or("");
        let arg = parts.next().unwrap_or("");
        match name {
            "upper" => out = out.to_uppercase(),
            "lower" => out = out.to_lowercase(),
            "trim" => out = out.trim().to_string(),
            "default" if out.is_empty() => out = arg.to_string(),
            "slice" => {
                let args: Vec<&str> = arg.split(':').collect();
                let start: usize = args.first().and_then(|s| s.parse().ok()).unwrap_or(0);
                let end = args.get(1).and_then(|s| s.parse::<usize>().ok());
                out = match end {
                    Some(e) => out.chars().take(e).skip(start).collect(),
                    None => out.chars().skip(start).collect(),
                };
            }
            _ => {}
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn resolves_simple() {
        let row = json!({"name": "Ada"});
        let out = resolve_template("Hi {{name|upper}}", &row, None, true);
        assert_eq!(out, "Hi ADA");
    }

    #[test]
    fn resolves_document_language_priority() {
        let row = json!({ "lang": "FR", "name": "Ada" });
        assert_eq!(resolve_document_language(&row, Some("en")), "fr");
        let row2 = json!({ "name": "Ada" });
        assert_eq!(resolve_document_language(&row2, Some("NL")), "nl");
        assert_eq!(resolve_document_language(&row2, None), "en");
    }

    #[test]
    fn seeds_vars_language_in_context() {
        let row = json!({ "language": "de" });
        let output = json!({ "kind": "pdf" });
        let ctx = RuntimeContext::from_row_with_language(&row, &output, false, Some("en"));
        assert_eq!(
            ctx.vars.get("language").and_then(|v| v.as_str()),
            Some("de")
        );
        assert_eq!(
            ctx.env.get("language").and_then(|v| v.as_str()),
            Some("de")
        );
        assert!(evaluate_condition(
            "vars.language == 'de'",
            &row,
            Some(&ctx)
        ));
    }
}
