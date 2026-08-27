//! Data source loaders (HTTP pull, SQL, file, XML) for serve + Tauri.

use crate::data::{parse_data_input, parse_xml_input, ParseResult};
use crate::db::ProjectRecord;
use crate::catalog_store::CatalogStore;
use rusqlite::types::ValueRef;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlQueryRequest {
    pub driver: String,
    pub connection: String,
    pub query: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlQueryResult {
    pub rows: Vec<Value>,
}

pub fn run_sqlite_query(connection: &str, query: &str) -> Result<Vec<Value>, String> {
    let trimmed = query.trim();
    let upper = trimmed.to_uppercase();
    if !(upper.starts_with("SELECT") || upper.starts_with("WITH")) {
        return Err("Only SELECT/WITH queries are allowed".into());
    }
    let conn = rusqlite::Connection::open(connection).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(trimmed).map_err(|e| e.to_string())?;
    let col_names: Vec<String> = stmt.column_names().iter().map(|s| (*s).to_string()).collect();
    let mut rows_out = Vec::new();
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let mut map = Map::new();
        for (i, name) in col_names.iter().enumerate() {
            let v = row.get_ref(i).map_err(|e| e.to_string())?;
            map.insert(name.clone(), sqlite_value_to_json(v));
        }
        rows_out.push(Value::Object(map));
    }
    Ok(rows_out)
}

fn sqlite_value_to_json(v: ValueRef<'_>) -> Value {
    match v {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(i) => json!(i),
        ValueRef::Real(f) => json!(f),
        ValueRef::Text(t) => Value::String(String::from_utf8_lossy(t).into_owned()),
        ValueRef::Blob(b) => Value::String(format!("blob:{}b", b.len())),
    }
}

pub fn read_data_file(path: &str) -> Result<String, String> {
    fs::read_to_string(Path::new(path)).map_err(|e| e.to_string())
}

pub fn parse_payload(
    text: &str,
    format: Option<&str>,
    row_path: Option<&str>,
) -> Result<ParseResult, String> {
    let fmt = format.unwrap_or("").to_ascii_lowercase();
    match fmt.as_str() {
        "xml" => parse_xml_input(text, row_path).map_err(|e| e.to_string()),
        "json" | "csv" | "" => {
            if fmt == "xml" || text.trim_start().starts_with('<') {
                parse_xml_input(text, row_path).map_err(|e| e.to_string())
            } else {
                parse_data_input(text).map_err(|e| e.to_string())
            }
        }
        other => Err(format!("Unsupported format: {other}")),
    }
}

/// Apply rows onto a project document's dataset; returns updated document + row count.
pub fn apply_rows_to_dataset(
    mut document: Value,
    dataset_id: &str,
    rows: Vec<Value>,
) -> Result<(Value, usize), String> {
    let datasets = document
        .get_mut("datasets")
        .and_then(|v| v.as_array_mut())
        .ok_or_else(|| "Project has no datasets".to_string())?;
    let ds = datasets
        .iter_mut()
        .find(|d| d.get("id").and_then(|v| v.as_str()) == Some(dataset_id))
        .ok_or_else(|| format!("Dataset {dataset_id} not found"))?;
    let count = rows.len();
    ds.as_object_mut()
        .ok_or_else(|| "Dataset is not an object".to_string())?
        .insert("rows".into(), Value::Array(rows));
    ds.as_object_mut().unwrap().insert(
        "lastLoadedAt".into(),
        Value::String(chrono_like_now()),
    );
    ds.as_object_mut().unwrap().remove("lastError");
    Ok((document, count))
}

fn chrono_like_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{ms}")
}

pub fn set_dataset_error(mut document: Value, dataset_id: &str, err: &str) -> Value {
    if let Some(datasets) = document.get_mut("datasets").and_then(|v| v.as_array_mut()) {
        if let Some(ds) = datasets
            .iter_mut()
            .find(|d| d.get("id").and_then(|v| v.as_str()) == Some(dataset_id))
        {
            if let Some(obj) = ds.as_object_mut() {
                obj.insert("lastError".into(), Value::String(err.to_string()));
            }
        }
    }
    document
}

/// Load/pull a dataset source and return new rows (does not persist).
pub async fn load_source_rows(dataset: &Value) -> Result<Vec<Value>, String> {
    let source = dataset.get("source").cloned().unwrap_or(json!({ "kind": "none" }));
    let kind = source
        .get("kind")
        .and_then(|v| v.as_str())
        .unwrap_or("none");
    match kind {
        "none" => Ok(dataset
            .get("rows")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()),
        "inbound" => Ok(dataset
            .get("rows")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()),
        "csv" | "json" | "xml" => {
            let mut text = source
                .get("inline")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if text.trim().is_empty() {
                if let Some(path) = source.get("path").and_then(|v| v.as_str()) {
                    text = read_data_file(path)?;
                }
            }
            let row_path = source.get("rowPath").and_then(|v| v.as_str());
            let parsed = if kind == "xml" || text.trim_start().starts_with('<') {
                parse_xml_input(&text, row_path).map_err(|e| e.to_string())?
            } else {
                parse_data_input(&text).map_err(|e| e.to_string())?
            };
            Ok(parsed.rows)
        }
        "http" => {
            let url = source
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "HTTP source missing url".to_string())?;
            let method = source
                .get("method")
                .and_then(|v| v.as_str())
                .unwrap_or("GET");
            let format = source
                .get("responseFormat")
                .and_then(|v| v.as_str())
                .unwrap_or("json");
            let row_path = source.get("rowPath").and_then(|v| v.as_str());
            let client = reqwest_client()?;
            let mut req = if method.eq_ignore_ascii_case("POST") {
                client.post(url)
            } else {
                client.get(url)
            };
            if let Some(Value::Object(headers)) = source.get("headers") {
                for (k, v) in headers {
                    if let Some(s) = v.as_str() {
                        req = req.header(k, s);
                    }
                }
            }
            if method.eq_ignore_ascii_case("POST") {
                if let Some(body) = source.get("body").and_then(|v| v.as_str()) {
                    req = req.body(body.to_string());
                }
            }
            let res = req.send().await.map_err(|e| e.to_string())?;
            if !res.status().is_success() {
                let status = res.status();
                let body = res.text().await.unwrap_or_default();
                return Err(format!("HTTP {status}: {body}"));
            }
            let text = res.text().await.map_err(|e| e.to_string())?;
            Ok(parse_payload(&text, Some(format), row_path)?.rows)
        }
        "sql" => {
            let driver = source
                .get("driver")
                .and_then(|v| v.as_str())
                .unwrap_or("sqlite");
            if driver == "postgres" {
                return Err("Postgres data sources are not implemented yet".into());
            }
            let connection = source
                .get("connection")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "SQL source missing connection".to_string())?;
            let query = source
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "SQL source missing query".to_string())?;
            run_sqlite_query(connection, query)
        }
        other => Err(format!("Unknown data source kind: {other}")),
    }
}

fn reqwest_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())
}

pub fn find_dataset<'a>(document: &'a Value, dataset_id: &str) -> Option<&'a Value> {
    document
        .get("datasets")?
        .as_array()?
        .iter()
        .find(|d| d.get("id").and_then(|v| v.as_str()) == Some(dataset_id))
}

pub fn ingest_secret_ok(dataset: &Value, provided: Option<&str>) -> bool {
    let Some(source) = dataset.get("source") else {
        return true;
    };
    let secret = source.get("secret").and_then(|v| v.as_str()).unwrap_or("");
    if secret.is_empty() {
        return true;
    }
    provided == Some(secret)
}

pub fn persist_project_document(
    catalog: &Arc<dyn CatalogStore>,
    record: &ProjectRecord,
    document: Value,
) -> Result<(), String> {
    catalog
        .save_project(
            Some(record.summary.id.clone()),
            &record.summary.name,
            document,
            record.summary.meta.clone(),
            record.summary.filesystem_id.clone(),
            record.summary.relative_path.clone(),
            false,
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Scan catalog projects and spawn interval refresh tasks.
pub fn spawn_interval_refreshers(catalog: Arc<dyn CatalogStore>) {
    tokio::spawn(async move {
        loop {
            if let Err(e) = tick_interval_sources(&catalog).await {
                eprintln!("data-source interval tick: {e}");
            }
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });
}

async fn tick_interval_sources(catalog: &Arc<dyn CatalogStore>) -> Result<(), String> {
    let list = catalog.list_projects().map_err(|e| e.to_string())?;
    for summary in list {
        let Some(record) = catalog
            .get_project(&summary.id)
            .map_err(|e| e.to_string())?
        else {
            continue;
        };
        let Some(datasets) = record.document.get("datasets").and_then(|v| v.as_array()) else {
            continue;
        };
        for ds in datasets {
            let mode = ds
                .get("refresh")
                .and_then(|r| r.get("mode"))
                .and_then(|v| v.as_str())
                .unwrap_or("manual");
            if mode != "interval" {
                continue;
            }
            let interval_ms = ds
                .get("refresh")
                .and_then(|r| r.get("intervalMs"))
                .and_then(|v| v.as_u64())
                .unwrap_or(60_000)
                .max(5_000);
            // Simple cadence: refresh when lastLoadedAt age exceeds interval.
            // lastLoadedAt may be ISO or epoch seconds from apply_rows_to_dataset.
            let due = should_refresh(ds, interval_ms);
            if !due {
                continue;
            }
            let dataset_id = ds
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if dataset_id.is_empty() {
                continue;
            }
            match load_source_rows(ds).await {
                Ok(rows) => {
                    match apply_rows_to_dataset(record.document.clone(), &dataset_id, rows) {
                        Ok((doc, _)) => {
                            if let Err(e) = persist_project_document(catalog, &record, doc) {
                                eprintln!("interval persist {}: {e}", summary.id);
                            }
                        }
                        Err(e) => eprintln!("interval apply {}: {e}", dataset_id),
                    }
                }
                Err(e) => {
                    let doc = set_dataset_error(record.document.clone(), &dataset_id, &e);
                    let _ = persist_project_document(catalog, &record, doc);
                    eprintln!("interval load {}: {e}", dataset_id);
                }
            }
        }
    }
    Ok(())
}

fn should_refresh(ds: &Value, interval_ms: u64) -> bool {
    let Some(last) = ds.get("lastLoadedAt").and_then(|v| v.as_str()) else {
        return true;
    };
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    if let Ok(ms) = last.parse::<u64>() {
        // Support both epoch-ms (new) and epoch-seconds (legacy short values).
        let last_ms = if ms < 10_000_000_000 { ms * 1000 } else { ms };
        return now.saturating_sub(last_ms) >= interval_ms;
    }
    true
}
