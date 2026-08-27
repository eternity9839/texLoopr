//! Data-bound list/table resolution — mirrors `listData.ts` / `tableData.ts`.

use crate::template::{lookup_value, resolve_template, RuntimeContext};
use serde_json::Value;

#[derive(Clone, Debug)]
pub struct ListItemNode {
    pub text: String,
    pub children: Vec<ListItemNode>,
}

pub fn attach_project_datasets(project: &Value, ctx: &mut RuntimeContext, row: &Value) {
    let Some(datasets) = project.get("datasets").and_then(|v| v.as_array()) else {
        return;
    };
    let mut map = serde_json::Map::new();
    for ds in datasets {
        let Some(obj) = ds.as_object() else { continue };
        let name = obj.get("name").and_then(|v| v.as_str()).unwrap_or("");
        if name.is_empty() {
            continue;
        }
        let key_field = obj
            .get("keyField")
            .and_then(|v| v.as_str())
            .unwrap_or("id");
        let rows = obj.get("rows").cloned().unwrap_or(Value::Array(vec![]));
        map.insert(
            name.to_string(),
            serde_json::json!({ "keyField": key_field, "rows": rows }),
        );
        if let Value::Object(row_map) = row {
            if let Some(want) = row_map.get(key_field).and_then(|v| v.as_str()) {
                if !want.is_empty() {
                    if let Value::Array(arr) = &rows {
                        if let Some(hit) = arr.iter().find(|r| {
                            r.get(key_field)
                                .map(|v| v.as_str().unwrap_or("") == want)
                                .unwrap_or(false)
                        }) {
                            ctx.data.insert(name.to_string(), hit.clone());
                        }
                    }
                }
            }
        }
    }
    ctx.datasets = map;
}

pub fn resolve_items_path(path: &str, row: &Value, ctx: &RuntimeContext) -> Vec<Value> {
    let path = path.trim();
    if path.is_empty() {
        return Vec::new();
    }
    match lookup_value(path, row, ctx) {
        Some(Value::Array(arr)) => arr,
        Some(Value::String(s)) => {
            if let Ok(Value::Array(arr)) = serde_json::from_str(s.trim()) {
                arr
            } else {
                Vec::new()
            }
        }
        _ => Vec::new(),
    }
}

pub fn resolve_table_source_rows(
    content: &Value,
    row: &Value,
    ctx: &RuntimeContext,
) -> Vec<Value> {
    let dataset_name = content
        .get("datasetName")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let source_path = content
        .get("sourcePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();

    if !dataset_name.is_empty() {
        if let Some(pack) = ctx.datasets.get(dataset_name) {
            let key_field = pack
                .get("keyField")
                .and_then(|v| v.as_str())
                .unwrap_or("id");
            let rows = pack
                .get("rows")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            if let Value::Object(row_map) = row {
                if let Some(want) = row_map.get(key_field).and_then(|v| v.as_str()) {
                    if !want.is_empty() {
                        return rows
                            .into_iter()
                            .filter(|r| {
                                r.get(key_field)
                                    .map(|v| v.as_str().unwrap_or("") == want)
                                    .unwrap_or(false)
                            })
                            .collect();
                    }
                }
            }
            return rows;
        }
    }

    if !source_path.is_empty() {
        return resolve_items_path(source_path, row, ctx)
            .into_iter()
            .filter(|v| v.is_object())
            .collect();
    }
    Vec::new()
}

fn default_item_text(row: &Value) -> String {
    let Some(obj) = row.as_object() else {
        return String::new();
    };
    for key in ["label", "text", "name", "title", "item"] {
        if let Some(v) = obj.get(key) {
            let s = value_str(v);
            if !s.is_empty() {
                return s;
            }
        }
    }
    obj.values()
        .find(|v| !v.is_object() && !v.is_array() && !v.is_null())
        .map(value_str)
        .unwrap_or_default()
}

fn value_str(v: &Value) -> String {
    match v {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        _ => v.to_string(),
    }
}

fn rows_to_nodes(
    rows: &[Value],
    item_text: &str,
    children_path: &str,
    row: &Value,
    ctx: &RuntimeContext,
) -> Vec<ListItemNode> {
    rows.iter()
        .filter_map(|item| row_to_node(item, item_text, children_path, row, ctx))
        .collect()
}

fn row_to_node(
    item: &Value,
    item_text: &str,
    children_path: &str,
    row: &Value,
    ctx: &RuntimeContext,
) -> Option<ListItemNode> {
    let text = if !item_text.is_empty() {
        resolve_template(item_text, item, Some(ctx), true)
    } else if let Some(t) = item.get("text").and_then(|v| v.as_str()) {
        t.to_string()
    } else if let Some(t) = item.get("label").and_then(|v| v.as_str()) {
        t.to_string()
    } else {
        default_item_text(item)
    };
    let child_path = if children_path.is_empty() {
        "children"
    } else {
        children_path
    };
    let children = item
        .get(child_path)
        .or_else(|| item.get("items"))
        .and_then(|v| v.as_array())
        .map(|arr| rows_to_nodes(arr, item_text, child_path, row, ctx))
        .unwrap_or_default();
    Some(ListItemNode { text, children })
}

pub fn normalize_list_items(raw: &Value) -> Vec<ListItemNode> {
    let Some(items) = raw.as_array() else {
        return Vec::new();
    };
    items
        .iter()
        .filter_map(|it| match it {
            Value::String(s) => Some(ListItemNode {
                text: s.clone(),
                children: Vec::new(),
            }),
            Value::Object(obj) => {
                let text = obj
                    .get("text")
                    .or_else(|| obj.get("label"))
                    .map(value_str)
                    .unwrap_or_else(|| default_item_text(it));
                let children = obj
                    .get("children")
                    .or_else(|| obj.get("items"))
                    .map(normalize_list_items)
                    .unwrap_or_default();
                Some(ListItemNode { text, children })
            }
            _ => None,
        })
        .collect()
}

pub fn resolve_list_items(content: &Value, row: &Value, ctx: &RuntimeContext) -> Vec<ListItemNode> {
    let dataset_name = content
        .get("datasetName")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let source_path = content
        .get("sourcePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let item_text = content
        .get("itemText")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let children_path = content
        .get("childrenPath")
        .and_then(|v| v.as_str())
        .unwrap_or("children")
        .trim();

    if !dataset_name.is_empty() || !source_path.is_empty() {
        let rows = resolve_table_source_rows(content, row, ctx);
        if rows.is_empty() && !source_path.is_empty() {
            let items = resolve_items_path(source_path, row, ctx);
            if !items.is_empty() && items.iter().all(|x| x.is_string()) {
                return items
                    .into_iter()
                    .map(|t| ListItemNode {
                        text: value_str(&t),
                        children: Vec::new(),
                    })
                    .collect();
            }
        }
        return rows_to_nodes(&rows, item_text, children_path, row, ctx);
    }

    content
        .get("items")
        .map(normalize_list_items)
        .unwrap_or_default()
}

fn field_key_from_header(raw: &str) -> String {
    raw.trim()
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect::<String>()
        .trim_matches('_')
        .to_string()
}

pub fn table_column_templates(cells: &[Value], header: bool) -> Vec<String> {
    if cells.is_empty() {
        return Vec::new();
    }
    if header {
        let headers = cells[0].as_array().cloned().unwrap_or_default();
        let tpl = cells.get(1).and_then(|v| v.as_array());
        if let Some(tpl_row) = tpl {
            if tpl_row.iter().any(|c| {
                c.as_str()
                    .map(|s| s.contains("{{") || s.starts_with('='))
                    .unwrap_or(false)
            }) {
                return tpl_row.iter().map(|c| c.as_str().unwrap_or("").to_string()).collect();
            }
        }
        return headers
            .iter()
            .map(|h| format!("{{{{{}}}}}", field_key_from_header(h.as_str().unwrap_or(""))))
            .collect();
    }
    let first = cells[0].as_array().cloned().unwrap_or_default();
    if first.iter().any(|c| {
        c.as_str()
            .map(|s| s.contains("{{") || s.starts_with('='))
            .unwrap_or(false)
    }) {
        return first.iter().map(|c| c.as_str().unwrap_or("").to_string()).collect();
    }
    first
        .iter()
        .map(|h| format!("{{{{{}}}}}", field_key_from_header(h.as_str().unwrap_or(""))))
        .collect()
}

pub fn map_table_item_to_cells(
    item: &Value,
    templates: &[String],
    ctx: &RuntimeContext,
) -> Vec<String> {
    templates
        .iter()
        .map(|tpl| {
            let raw = tpl.as_str();
            if raw.starts_with('=') {
                return raw[1..].to_string();
            }
            if !raw.contains("{{") {
                if let Some(obj) = item.as_object() {
                    let key = field_key_from_header(raw);
                    if let Some(v) = obj.get(raw).or_else(|| obj.get(&key)) {
                        return value_str(v);
                    }
                }
                return raw.to_string();
            }
            resolve_template(raw, item, Some(ctx), true)
        })
        .collect()
}

pub fn resolve_table_cells(
    content: &Value,
    row: &Value,
    ctx: &RuntimeContext,
) -> Vec<Vec<String>> {
    let static_cells = content.get("cells").and_then(|v| v.as_array());
    let source_rows = resolve_table_source_rows(content, row, ctx);

    if source_rows.is_empty() {
        return static_cells
            .map(|cells| {
                cells
                    .iter()
                    .filter_map(|r| {
                        r.as_array().map(|arr| {
                            arr.iter()
                                .map(|c| c.as_str().unwrap_or("").to_string())
                                .collect()
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();
    }

    let header = content.get("header").and_then(|v| v.as_bool()).unwrap_or(false);
    let template_source: Vec<Value> = if let Some(cells) = static_cells.filter(|c| !c.is_empty()) {
        cells.clone()
    } else {
        Vec::new()
    };
    let mut templates = if !template_source.is_empty() {
        table_column_templates(&template_source, header)
    } else {
        Vec::new()
    };
    if templates.is_empty() {
        if let Some(obj) = source_rows.first().and_then(|v| v.as_object()) {
            templates = obj.keys().map(|k| format!("{{{{{k}}}}}")).collect();
        }
    }
    if templates.is_empty() {
        return Vec::new();
    }
    source_rows
        .iter()
        .map(|item| map_table_item_to_cells(item, &templates, ctx))
        .collect()
}
