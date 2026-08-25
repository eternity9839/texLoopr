//! CSV / JSON dataset parsing — shared by desktop, CLI, and web fallbacks.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DataError {
    #[error("{0}")]
    Msg(String),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
}

impl serde::Serialize for DataError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseResult {
    pub rows: Vec<Value>,
    pub columns: Vec<String>,
    pub format: String,
}

pub fn parse_data_input(raw: &str) -> Result<ParseResult, DataError> {
    let text = raw.trim();
    if text.is_empty() {
        return Ok(ParseResult {
            rows: vec![],
            columns: vec![],
            format: "empty".into(),
        });
    }

    if text.starts_with('[') || text.starts_with('{') {
        let parsed: Value = serde_json::from_str(text)?;
        let rows = match parsed {
            Value::Array(arr) => arr
                .into_iter()
                .map(normalize_row)
                .collect::<Vec<_>>(),
            Value::Object(_) => vec![normalize_row(parsed)],
            _ => {
                return Err(DataError::Msg(
                    "JSON must be an object or array of objects".into(),
                ))
            }
        };
        let columns = columns_from_rows(&rows);
        return Ok(ParseResult {
            rows,
            columns,
            format: "json".into(),
        });
    }

    let rows = parse_csv(text);
    let columns = columns_from_rows(&rows);
    Ok(ParseResult {
        rows,
        columns,
        format: "csv".into(),
    })
}

fn normalize_row(row: Value) -> Value {
    match row {
        Value::Object(map) => {
            let mut out = serde_json::Map::new();
            for (k, v) in map {
                out.insert(k, to_expr_value(v));
            }
            Value::Object(out)
        }
        other => {
            let mut out = serde_json::Map::new();
            out.insert("value".into(), to_expr_value(other));
            Value::Object(out)
        }
    }
}

fn to_expr_value(v: Value) -> Value {
    match v {
        Value::Null => Value::String(String::new()),
        Value::Bool(_) | Value::Number(_) | Value::String(_) => v,
        Value::Array(arr) => Value::Array(arr.into_iter().map(to_expr_value).collect()),
        Value::Object(map) => {
            let mut out = serde_json::Map::new();
            for (k, val) in map {
                out.insert(k, to_expr_value(val));
            }
            Value::Object(out)
        }
    }
}

fn parse_csv(text: &str) -> Vec<Value> {
    let lines: Vec<&str> = text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();
    if lines.len() < 2 {
        return vec![];
    }
    let headers = split_csv_line(lines[0]);
    lines[1..]
        .iter()
        .map(|line| {
            let cols = split_csv_line(line);
            let mut map = serde_json::Map::new();
            for (i, h) in headers.iter().enumerate() {
                map.insert(
                    h.clone(),
                    Value::String(cols.get(i).cloned().unwrap_or_default()),
                );
            }
            Value::Object(map)
        })
        .collect()
}

fn split_csv_line(line: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        if ch == '"' {
            if in_quotes && i + 1 < chars.len() && chars[i + 1] == '"' {
                current.push('"');
                i += 1;
            } else {
                in_quotes = !in_quotes;
            }
        } else if ch == ',' && !in_quotes {
            result.push(current.trim().to_string());
            current.clear();
        } else {
            current.push(ch);
        }
        i += 1;
    }
    result.push(current.trim().to_string());
    result
}

fn columns_from_rows(rows: &[Value]) -> Vec<String> {
    let mut keys = std::collections::BTreeSet::new();
    for row in rows.iter().take(20) {
        if let Value::Object(map) = row {
            for k in map.keys() {
                keys.insert(k.clone());
            }
        }
    }
    keys.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_csv() {
        let r = parse_data_input("name,role\nAda,Math\n").unwrap();
        assert_eq!(r.format, "csv");
        assert_eq!(r.rows.len(), 1);
        assert_eq!(r.rows[0]["name"], "Ada");
    }

    #[test]
    fn parses_json_array() {
        let r = parse_data_input(r#"[{"name":"Ada"}]"#).unwrap();
        assert_eq!(r.format, "json");
        assert_eq!(r.rows.len(), 1);
    }
}
