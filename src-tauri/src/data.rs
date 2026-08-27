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

    if text.starts_with('<') {
        return parse_xml_input(text, None);
    }

    let rows = parse_csv(text);
    let columns = columns_from_rows(&rows);
    Ok(ParseResult {
        rows,
        columns,
        format: "csv".into(),
    })
}

/// Parse XML into row objects. `row_path` is slash-separated (e.g. `catalog/book`).
pub fn parse_xml_input(raw: &str, row_path: Option<&str>) -> Result<ParseResult, DataError> {
    let text = raw.trim();
    if text.is_empty() {
        return Ok(ParseResult {
            rows: vec![],
            columns: vec![],
            format: "xml".into(),
        });
    }
    let root = parse_xml_document(text)?;
    let elements = if let Some(path) = row_path.map(str::trim).filter(|p| !p.is_empty()) {
        select_by_path(&root, path)
    } else {
        auto_repeat_elements(&root)
    };
    let rows: Vec<Value> = elements.iter().map(element_to_row).collect();
    let columns = columns_from_rows(&rows);
    Ok(ParseResult {
        rows,
        columns,
        format: "xml".into(),
    })
}

#[derive(Clone)]
struct XmlNode {
    tag: String,
    attrs: Vec<(String, String)>,
    children: Vec<XmlNode>,
    text: String,
}

fn parse_xml_document(raw: &str) -> Result<XmlNode, DataError> {
    let cleaned = regex::Regex::new(r"(?i)<\?xml[^?]*\?>")
        .unwrap()
        .replace(raw, "")
        .trim()
        .to_string();
    let tokens = tokenize_xml(&cleaned);
    if tokens.is_empty() {
        return Err(DataError::Msg("Invalid XML".into()));
    }
    let (node, _) = parse_xml_element(&tokens, 0)?;
    Ok(node)
}

enum XmlToken {
    Open {
        tag: String,
        attrs: Vec<(String, String)>,
        self_closing: bool,
    },
    Close {
        tag: String,
    },
    Text(String),
}

fn tokenize_xml(xml: &str) -> Vec<XmlToken> {
    let mut tokens = Vec::new();
    let re = regex::Regex::new(r"</?([A-Za-z_][\w:.-]*)([^>]*?)/?>|([^<]+)").unwrap();
    for caps in re.captures_iter(xml) {
        if let Some(tag) = caps.get(1) {
            let full = caps.get(0).unwrap().as_str();
            if full.starts_with("</") {
                tokens.push(XmlToken::Close {
                    tag: tag.as_str().to_string(),
                });
            } else {
                let attrs = parse_xml_attrs(caps.get(2).map(|m| m.as_str()).unwrap_or(""));
                let self_closing = full.trim_end().ends_with("/>");
                tokens.push(XmlToken::Open {
                    tag: tag.as_str().to_string(),
                    attrs,
                    self_closing,
                });
            }
        } else if let Some(text) = caps.get(3) {
            tokens.push(XmlToken::Text(decode_xml_entities(text.as_str())));
        }
    }
    tokens
}

fn parse_xml_attrs(raw: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let re = regex::Regex::new(r#"([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')"#).unwrap();
    for caps in re.captures_iter(raw) {
        let key = caps.get(1).unwrap().as_str().to_string();
        let val = caps
            .get(3)
            .or_else(|| caps.get(4))
            .map(|m| decode_xml_entities(m.as_str()))
            .unwrap_or_default();
        out.push((key, val));
    }
    out
}

fn decode_xml_entities(s: &str) -> String {
    s.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
}

fn parse_xml_element(tokens: &[XmlToken], i: usize) -> Result<(XmlNode, usize), DataError> {
    let Some(XmlToken::Open {
        tag,
        attrs,
        self_closing,
    }) = tokens.get(i)
    else {
        return Err(DataError::Msg("Expected XML open tag".into()));
    };
    if *self_closing {
        return Ok((
            XmlNode {
                tag: tag.clone(),
                attrs: attrs.clone(),
                children: vec![],
                text: String::new(),
            },
            i + 1,
        ));
    }
    let mut children = Vec::new();
    let mut text = String::new();
    let mut j = i + 1;
    while j < tokens.len() {
        match &tokens[j] {
            XmlToken::Close { tag: close } => {
                if close != tag {
                    return Err(DataError::Msg(format!(
                        "XML mismatch: expected </{tag}>, got </{close}>"
                    )));
                }
                return Ok((
                    XmlNode {
                        tag: tag.clone(),
                        attrs: attrs.clone(),
                        children,
                        text: text.trim().to_string(),
                    },
                    j + 1,
                ));
            }
            XmlToken::Text(t) => {
                text.push_str(t);
                j += 1;
            }
            XmlToken::Open { .. } => {
                let (child, next) = parse_xml_element(tokens, j)?;
                children.push(child);
                j = next;
            }
        }
    }
    Err(DataError::Msg(format!("XML unclosed <{tag}>")))
}

fn select_by_path(root: &XmlNode, path: &str) -> Vec<XmlNode> {
    let mut parts: Vec<&str> = path.split('/').map(str::trim).filter(|p| !p.is_empty()).collect();
    let mut nodes = vec![root.clone()];
    if parts.first().copied() == Some(root.tag.as_str()) {
        parts.remove(0);
    }
    for part in parts {
        let mut next = Vec::new();
        for n in &nodes {
            for c in &n.children {
                if c.tag == part {
                    next.push(c.clone());
                }
            }
        }
        nodes = next;
        if nodes.is_empty() {
            return vec![];
        }
    }
    nodes
}

fn auto_repeat_elements(root: &XmlNode) -> Vec<XmlNode> {
    use std::collections::HashMap;
    let mut counts: HashMap<&str, Vec<XmlNode>> = HashMap::new();
    for c in &root.children {
        counts.entry(c.tag.as_str()).or_default().push(c.clone());
    }
    let mut best: Vec<XmlNode> = vec![];
    for list in counts.values() {
        if list.len() > best.len() {
            best = list.clone();
        }
    }
    if best.len() >= 2 {
        return best;
    }
    if root.children.len() == 1 && !root.children[0].children.is_empty() {
        return auto_repeat_elements(&root.children[0]);
    }
    if best.len() == 1 {
        return best;
    }
    if !root.children.is_empty() {
        root.children.clone()
    } else {
        vec![root.clone()]
    }
}

fn element_to_row(el: &XmlNode) -> Value {
    let mut map = serde_json::Map::new();
    for (k, v) in &el.attrs {
        map.insert(k.clone(), Value::String(v.clone()));
    }
    if el.children.is_empty() {
        if !el.text.is_empty() {
            map.insert("value".into(), Value::String(el.text.clone()));
        }
        return Value::Object(map);
    }
    use std::collections::HashMap;
    let mut by_tag: HashMap<&str, Vec<&XmlNode>> = HashMap::new();
    for c in &el.children {
        by_tag.entry(c.tag.as_str()).or_default().push(c);
    }
    for (tag, list) in by_tag {
        if list.len() == 1 {
            map.insert(tag.to_string(), child_value(list[0]));
        } else {
            map.insert(
                tag.to_string(),
                Value::Array(list.iter().map(|c| child_value(c)).collect()),
            );
        }
    }
    if map.is_empty() && !el.text.is_empty() {
        map.insert("value".into(), Value::String(el.text.clone()));
    }
    Value::Object(map)
}

fn child_value(c: &XmlNode) -> Value {
    if c.children.is_empty() && c.attrs.is_empty() {
        return Value::String(c.text.clone());
    }
    element_to_row(c)
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

    #[test]
    fn parses_xml_rows() {
        let r = parse_xml_input(
            r#"<catalog><book id="1"><title>Ada</title></book><book id="2"><title>Grace</title></book></catalog>"#,
            Some("catalog/book"),
        )
        .unwrap();
        assert_eq!(r.format, "xml");
        assert_eq!(r.rows.len(), 2);
        assert_eq!(r.rows[0]["id"], "1");
        assert_eq!(r.rows[0]["title"], "Ada");
    }
}
