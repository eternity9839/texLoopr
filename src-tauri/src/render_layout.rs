//! Layout helpers mirroring the editor preview pipeline (flatten, pin, flex, z-order).

use crate::template::{lookup_value, RuntimeContext};
use serde_json::{json, Value};
use std::collections::HashMap;

const MIN_BLOCK_W: f32 = 24.0;
const MIN_BLOCK_H: f32 = 24.0;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

pub fn px(n: f32) -> f32 {
    if n.is_finite() {
        n.round()
    } else {
        0.0
    }
}

pub fn layer_rank(ty: &str) -> i64 {
    match ty {
        "shape" => 0,
        "picture" | "qrcode" | "signature" => 1,
        _ => 2,
    }
}

pub fn effective_z(block: &Value) -> i64 {
    block
        .get("zIndex")
        .and_then(|v| v.as_i64())
        .unwrap_or_else(|| layer_rank(block.get("type").and_then(|v| v.as_str()).unwrap_or("")))
}

pub fn block_type(block: &Value) -> &str {
    block.get("type").and_then(|v| v.as_str()).unwrap_or("")
}

fn child_blocks(block: &Value) -> Vec<Value> {
    block
        .get("content")
        .and_then(|c| c.get("blocks"))
        .and_then(|b| b.as_array())
        .cloned()
        .unwrap_or_default()
}

fn is_container(block: &Value) -> bool {
    matches!(block_type(block), "group" | "repeat")
}

fn is_repeating_group(block: &Value) -> bool {
    if block_type(block) == "repeat" {
        return true;
    }
    if block_type(block) != "group" {
        return false;
    }
    block
        .get("content")
        .and_then(|c| c.get("itemsPath"))
        .and_then(|v| v.as_str())
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
}

fn repeat_row_height(children: &[Value], gap: f32) -> f32 {
    if children.is_empty() {
        return 48.0;
    }
    let mut max = 0.0f32;
    for c in children {
        let y = c.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
        let h = c.get("h").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
        max = max.max(y + h);
    }
    max + gap
}

pub fn resolve_items_path(path: &str, row: &Value, ctx: &RuntimeContext) -> Vec<Value> {
    let raw = lookup_value(path, row, ctx);
    match raw {
        Some(Value::Array(arr)) => arr,
        Some(Value::String(s)) if s.trim().starts_with('[') => {
            serde_json::from_str(&s).unwrap_or_default()
        }
        _ => Vec::new(),
    }
}

pub fn merge_item_context(
    base: &RuntimeContext,
    row: &Value,
    item_var: &str,
    item: &Value,
    index: usize,
) -> RuntimeContext {
    let mut data = base.data.clone();
    if let Value::Object(row_map) = row {
        for (k, v) in row_map {
            data.insert(k.clone(), v.clone());
        }
    }
    match item {
        Value::Object(item_map) => {
            for (k, v) in item_map {
                data.insert(k.clone(), v.clone());
            }
        }
        other => {
            data.insert("value".into(), other.clone());
        }
    }
    data.insert(item_var.into(), item.clone());
    data.insert(
        format!("{item_var}_index"),
        Value::Number((index as i64).into()),
    );

    let mut vars = base.vars.clone();
    vars.insert(item_var.into(), item.clone());
    vars.insert("index".into(), Value::Number((index as i64).into()));

    RuntimeContext {
        data,
        vars,
        ..base.clone()
    }
}

fn pin_active(block: &Value) -> bool {
    let Some(p) = block.get("pin") else {
        return false;
    };
    p.get("top").and_then(|v| v.as_bool()).unwrap_or(false)
        || p.get("bottom").and_then(|v| v.as_bool()).unwrap_or(false)
        || p.get("left").and_then(|v| v.as_bool()).unwrap_or(false)
        || p.get("right").and_then(|v| v.as_bool()).unwrap_or(false)
}

/// Edge pins — mirrors `resolvePinnedRect` in the TS geometry module.
pub fn resolve_pinned_rect(
    block: &Value,
    page_w: f32,
    page_h: f32,
    margins: Option<&Value>,
    pin_respects_margins: bool,
) -> Rect {
    if !pin_active(block) {
        return Rect {
            x: px(block.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32),
            y: px(block.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32),
            w: px(block.get("w").and_then(|v| v.as_f64()).unwrap_or(200.0) as f32),
            h: px(block.get("h").and_then(|v| v.as_f64()).unwrap_or(40.0) as f32),
        };
    }

    let bx = px(block.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32);
    let by = px(block.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32);
    let bw = px(block.get("w").and_then(|v| v.as_f64()).unwrap_or(200.0) as f32);
    let bh = px(block.get("h").and_then(|v| v.as_f64()).unwrap_or(40.0) as f32);

    let (mt, mr, mb, ml) = if pin_respects_margins {
        margin_insets(margins)
    } else {
        (0.0, 0.0, 0.0, 0.0)
    };

    let pin = block.get("pin").unwrap();
    let left = pin.get("left").and_then(|v| v.as_bool()).unwrap_or(false);
    let right = pin.get("right").and_then(|v| v.as_bool()).unwrap_or(false);
    let top = pin.get("top").and_then(|v| v.as_bool()).unwrap_or(false);
    let bottom = pin.get("bottom").and_then(|v| v.as_bool()).unwrap_or(false);

    let mtop = if pin_respects_margins && top && by <= 0.0 {
        0.0
    } else {
        mt
    };
    let mleft = if pin_respects_margins && left && bx <= 0.0 {
        0.0
    } else {
        ml
    };
    let mright = if pin_respects_margins && right && bx <= 0.0 && left {
        0.0
    } else {
        mr
    };
    let mbottom = if pin_respects_margins && bottom && by + bh >= page_h - 16.0 {
        0.0
    } else {
        mb
    };

    let mut x = bx;
    let mut y = by;
    let mut w = bw;
    let mut h = bh;

    if left && right {
        x = mleft;
        w = (page_w - mleft - mright).max(MIN_BLOCK_W);
    } else if left {
        x = mleft;
    } else if right {
        x = (page_w - mright - w).max(0.0);
    }

    if top && bottom {
        y = mtop;
        h = (page_h - mtop - mbottom).max(MIN_BLOCK_H);
    } else if top {
        y = mtop;
    } else if bottom {
        y = (page_h - mbottom - h).max(0.0);
    }

    Rect { x, y, w, h }
}

fn margin_insets(margins: Option<&Value>) -> (f32, f32, f32, f32) {
    let Some(m) = margins else {
        return (64.0, 56.0, 72.0, 56.0);
    };
    let top = m.get("top").and_then(|v| v.as_f64()).unwrap_or(64.0) as f32;
    let right = m.get("right").and_then(|v| v.as_f64()).unwrap_or(56.0) as f32;
    let bottom = m.get("bottom").and_then(|v| v.as_f64()).unwrap_or(72.0) as f32;
    let left = m.get("left").and_then(|v| v.as_f64()).unwrap_or(56.0) as f32;
    (top, right, bottom, left)
}

pub fn apply_layout_rect(block: &Value, rect: Rect) -> Value {
    let mut out = block.clone();
    if let Some(obj) = out.as_object_mut() {
        obj.insert("x".into(), json!(rect.x));
        obj.insert("y".into(), json!(rect.y));
        obj.insert("w".into(), json!(rect.w));
        obj.insert("h".into(), json!(rect.h));
        obj.remove("pin");
    }
    out
}

/// Flex child placement — mirrors `computeFlexRects` in TS.
pub fn compute_flex_rects(group: &Value) -> HashMap<String, Rect> {
    let mut map = HashMap::new();
    let layout = group
        .get("style")
        .and_then(|s| s.get("layout"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if layout != "flex" {
        return map;
    }

    let kids = child_blocks(group);
    if kids.is_empty() {
        return map;
    }

    let pad = group
        .get("style")
        .and_then(|s| s.get("padding"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
        .max(0.0) as f32;
    let gw = group.get("w").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
    let gh = group.get("h").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
    let inner_w = (gw - pad * 2.0).max(0.0);
    let inner_h = (gh - pad * 2.0).max(0.0);

    let column = group
        .get("style")
        .and_then(|s| s.get("direction"))
        .and_then(|v| v.as_str())
        .unwrap_or("column")
        == "column";
    let gap = group
        .get("style")
        .and_then(|s| s.get("gap"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
        .max(0.0) as f32;
    let justify = group
        .get("style")
        .and_then(|s| s.get("justify"))
        .and_then(|v| v.as_str())
        .unwrap_or("start");
    let align = group
        .get("style")
        .and_then(|s| s.get("alignItems"))
        .and_then(|v| v.as_str())
        .unwrap_or("stretch");

    let main_size = if column { inner_h } else { inner_w };
    let cross_size = if column { inner_w } else { inner_h };

    let extent = |b: &Value| -> f32 {
        if column {
            b.get("h").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32
        } else {
            b.get("w").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32
        }
    };
    let cross_extent = |b: &Value| -> f32 {
        if column {
            b.get("w").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32
        } else {
            b.get("h").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32
        }
    };

    let total: f32 = kids.iter().map(|b| extent(b)).sum();
    let mut free = main_size - total - gap * (kids.len() as f32 - 1.0);
    if free < 0.0 {
        free = 0.0;
    }

    let mut cursor = pad;
    if justify == "center" {
        cursor += free / 2.0;
    } else if justify == "end" {
        cursor += free;
    }
    let between_gap = if justify == "space-between" && kids.len() > 1 {
        free / (kids.len() as f32 - 1.0)
    } else {
        0.0
    };

    for b in &kids {
        let id = b.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let main_pos = cursor;
        cursor += extent(b) + gap + between_gap;

        let (cross_pos, cross_len) = if align == "stretch" {
            (pad, cross_size)
        } else {
            let len = cross_extent(b);
            let pos = if align == "center" {
                pad + (cross_size - len) / 2.0
            } else if align == "end" {
                pad + cross_size - len
            } else {
                pad
            };
            (pos, len)
        };

        let rect = if column {
            Rect {
                x: cross_pos,
                y: main_pos,
                w: cross_len,
                h: b.get("h").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
            }
        } else {
            Rect {
                x: main_pos,
                y: cross_pos,
                w: b.get("w").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                h: cross_len,
            }
        };
        map.insert(id, rect);
    }
    map
}

#[derive(Clone)]
pub struct FlatBlock {
    pub block: Value,
    pub ctx: RuntimeContext,
}

/// Expand groups/repeats into absolute-positioned blocks (preview pipeline).
pub fn flatten_blocks(
    blocks: &[Value],
    row: &Value,
    ctx: &RuntimeContext,
) -> Vec<FlatBlock> {
    let mut out = Vec::new();

    fn walk(
        list: &[Value],
        ox: f32,
        oy: f32,
        z_base: i64,
        row: &Value,
        ctx: &RuntimeContext,
        out: &mut Vec<FlatBlock>,
    ) {
        for block in list {
            if is_repeating_group(block) {
                let items_path = block
                    .get("content")
                    .and_then(|c| c.get("itemsPath"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("line_items");
                let item_var = block
                    .get("content")
                    .and_then(|c| c.get("itemVar"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("item");
                let children = child_blocks(block);
                let items = resolve_items_path(items_path, row, ctx);
                let row_h = repeat_row_height(&children, 8.0);

                if items.is_empty() {
                    continue;
                }

                for (index, item) in items.iter().enumerate() {
                    let item_ctx = merge_item_context(ctx, row, item_var, item, index);
                    let flex = compute_flex_rects(block);
                    for child in &children {
                        let child_id = child.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let (cx, cy, cw, ch) = if let Some(r) = flex.get(child_id) {
                            (r.x, r.y, r.w, r.h)
                        } else {
                            (
                                child.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                                child.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                                child.get("w").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                                child.get("h").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                            )
                        };
                        let mut placed = child.clone();
                        if let Some(obj) = placed.as_object_mut() {
                            obj.insert("x".into(), json!(cx));
                            obj.insert("y".into(), json!(cy));
                            obj.insert("w".into(), json!(cw));
                            obj.insert("h".into(), json!(ch));
                        }

                        if is_container(&placed) && !is_repeating_group(&placed) {
                            walk(
                                &[placed],
                                ox + block.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                                oy
                                    + block.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32
                                    + index as f32 * row_h,
                                z_base + effective_z(block),
                                row,
                                &item_ctx,
                                out,
                            );
                            continue;
                        }

                        let clone_id = format!(
                            "{}__{}__{}",
                            block.get("id").and_then(|v| v.as_str()).unwrap_or("g"),
                            index,
                            child.get("id").and_then(|v| v.as_str()).unwrap_or("c")
                        );
                        let child_z = effective_z(&placed);
                        if let Some(obj) = placed.as_object_mut() {
                            obj.insert("id".into(), json!(clone_id));
                            obj.insert(
                                "x".into(),
                                json!(ox
                                    + block.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32
                                    + cx),
                            );
                            obj.insert(
                                "y".into(),
                                json!(oy
                                    + block.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32
                                    + cy
                                    + index as f32 * row_h),
                            );
                            obj.insert(
                                "zIndex".into(),
                                json!(z_base + effective_z(block) + child_z + index as i64),
                            );
                        }
                        out.push(FlatBlock {
                            block: placed,
                            ctx: item_ctx.clone(),
                        });
                    }
                }
                continue;
            }

            if block_type(block) == "group" {
                let children = child_blocks(block);
                if children.is_empty() {
                    continue;
                }
                let flex = compute_flex_rects(block);
                let gx = block.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                let gy = block.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                let mut placed_children = Vec::new();
                for child in children {
                    let child_id = child.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let rect = flex.get(child_id).copied().unwrap_or(Rect {
                        x: child.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                        y: child.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                        w: child.get("w").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                        h: child.get("h").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                    });
                    placed_children.push(apply_layout_rect(&child, rect));
                }
                walk(
                    &placed_children,
                    ox + gx,
                    oy + gy,
                    z_base + effective_z(block),
                    row,
                    ctx,
                    out,
                );
                continue;
            }

            let mut placed = block.clone();
            if let Some(obj) = placed.as_object_mut() {
                obj.insert(
                    "x".into(),
                    json!(ox + block.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32),
                );
                obj.insert(
                    "y".into(),
                    json!(oy + block.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32),
                );
                obj.insert("zIndex".into(), json!(z_base + effective_z(block)));
            }
            out.push(FlatBlock {
                block: placed,
                ctx: ctx.clone(),
            });
        }
    }

    walk(blocks, 0.0, 0.0, 0, row, ctx, &mut out);
    out
}

pub fn sort_by_effective_z(blocks: &mut [FlatBlock]) {
    blocks.sort_by(|a, b| {
        effective_z(&a.block)
            .cmp(&effective_z(&b.block))
            .then_with(|| {
                a.block
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .cmp(b.block.get("name").and_then(|v| v.as_str()).unwrap_or(""))
            })
            .then_with(|| {
                a.block
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .cmp(b.block.get("id").and_then(|v| v.as_str()).unwrap_or(""))
            })
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn pin_stretches_full_height() {
        let block = json!({
            "x": 0, "y": 0, "w": 12, "h": 100,
            "pin": { "left": true, "top": true, "bottom": true }
        });
        let r = resolve_pinned_rect(&block, 714.0, 1010.0, None, false);
        assert_eq!(r.h, 1010.0);
        assert_eq!(r.x, 0.0);
    }

    #[test]
    fn flattens_nested_group() {
        let blocks = json!([{
            "id": "g1", "type": "group", "x": 10, "y": 20, "w": 100, "h": 50,
            "content": { "blocks": [{
                "id": "t1", "type": "text", "x": 5, "y": 6, "w": 40, "h": 12,
                "content": { "text": "hi" }, "style": { "fontSize": 12 }
            }]}
        }]);
        let ctx = RuntimeContext::default();
        let flat = flatten_blocks(blocks.as_array().unwrap(), &json!({}), &ctx);
        assert_eq!(flat.len(), 1);
        assert_eq!(flat[0].block["x"], 15.0);
        assert_eq!(flat[0].block["y"], 26.0);
    }
}
