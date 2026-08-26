//! Project JSON → PDF bytes (ADR 0014). Geometry: CSS px → pt.

use crate::template::{evaluate_condition, resolve_template, RuntimeContext};
use printpdf::{BuiltinFont, Line, Mm, PdfDocument, Point};
use serde_json::Value;
use thiserror::Error;

const PX_TO_PT: f32 = 72.0 / 96.0;

#[derive(Debug, Error)]
pub enum RenderError {
    #[error("render: {0}")]
    Msg(String),
    #[error("pdf: {0}")]
    Pdf(String),
}

fn px_to_mm(px: f32) -> Mm {
    Mm(px * PX_TO_PT * 25.4 / 72.0)
}

fn page_size_px(project: &Value, page: &Value) -> (f32, f32) {
    if let (Some(w), Some(h)) = (
        page.get("width").and_then(|v| v.as_f64()),
        page.get("height").and_then(|v| v.as_f64()),
    ) {
        return ((w as f32).max(100.0), (h as f32).max(100.0));
    }
    if let Some(ab) = project.get("artboard") {
        if let Some(id) = ab.as_str() {
            let (w, h) = match id {
                "a4" => (714.0, 1010.0),
                "a5" => (505.0, 714.0),
                "landscape" => (960.0, 540.0),
                "square" => (720.0, 720.0),
                "mobile" => (390.0, 844.0),
                "notification" => (360.0, 180.0),
                "fbCover" => (820.0, 312.0),
                "fbPost" => (1200.0, 630.0),
                "igPost" => (1080.0, 1080.0),
                "igStory" => (1080.0, 1920.0),
                "igLandscape" => (1080.0, 566.0),
                "ytThumb" => (1280.0, 720.0),
                "ytCover" => (2560.0, 1440.0),
                "linkedinCover" => (1584.0, 396.0),
                "xHeader" => (1500.0, 500.0),
                "xPost" => (1200.0, 675.0),
                _ => (720.0, 960.0),
            };
            return (w, h);
        }
        let w = ab.get("w").and_then(|v| v.as_f64()).unwrap_or(720.0) as f32;
        let h = ab.get("h").and_then(|v| v.as_f64()).unwrap_or(960.0) as f32;
        return (w, h);
    }
    let mut max_x: f32 = 720.0;
    let mut max_y: f32 = 960.0;
    if let Some(blocks) = page.get("blocks").and_then(|b| b.as_array()) {
        for b in blocks {
            let x = b.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
            let y = b.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
            let w = b.get("w").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
            let h = b.get("h").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
            max_x = max_x.max(x + w);
            max_y = max_y.max(y + h);
        }
    }
    (max_x.max(100.0), max_y.max(100.0))
}

fn block_text(block: &Value) -> Option<String> {
    let content = block.get("content")?;
    if let Some(t) = content.get("text").and_then(|v| v.as_str()) {
        return Some(t.to_string());
    }
    if let Some(items) = content.get("items").and_then(|v| v.as_array()) {
        let lines: Vec<String> = items
            .iter()
            .filter_map(|i| i.as_str().map(|s| s.to_string()))
            .collect();
        if !lines.is_empty() {
            return Some(lines.join("\n"));
        }
    }
    if let Some(cells) = content.get("cells").and_then(|v| v.as_array()) {
        let mut lines = Vec::new();
        for row in cells {
            if let Some(cols) = row.as_array() {
                let cells: Vec<&str> = cols.iter().filter_map(|c| c.as_str()).collect();
                lines.push(cells.join(" | "));
            }
        }
        if !lines.is_empty() {
            return Some(lines.join("\n"));
        }
    }
    None
}

fn draw_text_block(
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    block: &Value,
    page_h_px: f32,
    row: &Value,
    ctx: &RuntimeContext,
) {
    let Some(raw) = block_text(block) else {
        return;
    };
    let text = resolve_template(&raw, row, Some(ctx), true);
    if text.trim().is_empty() {
        return;
    }
    let x = block.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
    let y = block.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
    let font_size = block
        .get("style")
        .and_then(|s| s.get("fontSize"))
        .and_then(|v| v.as_f64())
        .unwrap_or(12.0) as f32;
    let pdf_y_px = page_h_px - y - font_size;
    let mut line_y = pdf_y_px;
    for line in text.lines() {
        layer.use_text(
            line,
            font_size * PX_TO_PT,
            px_to_mm(x),
            px_to_mm(line_y),
            font,
        );
        line_y -= font_size * 1.35;
    }
}

fn draw_shape_placeholder(
    layer: &printpdf::PdfLayerReference,
    block: &Value,
    page_h_px: f32,
) {
    let x = block.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
    let y = block.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
    let w = block.get("w").and_then(|v| v.as_f64()).unwrap_or(40.0) as f32;
    let h = block.get("h").and_then(|v| v.as_f64()).unwrap_or(40.0) as f32;
    let bottom = page_h_px - y - h;
    let points = vec![
        (Point::new(px_to_mm(x), px_to_mm(bottom)), false),
        (Point::new(px_to_mm(x + w), px_to_mm(bottom)), false),
        (Point::new(px_to_mm(x + w), px_to_mm(bottom + h)), false),
        (Point::new(px_to_mm(x), px_to_mm(bottom + h)), false),
    ];
    let line = Line {
        points,
        is_closed: true,
    };
    layer.add_line(line);
}

/// Render a project + data row to PDF bytes.
pub fn render_project_pdf(
    project: &Value,
    row: &Value,
    output: Option<&Value>,
) -> Result<Vec<u8>, RenderError> {
    let pages = project
        .get("pages")
        .and_then(|p| p.as_array())
        .ok_or_else(|| RenderError::Msg("project has no pages".into()))?;
    if pages.is_empty() {
        return Err(RenderError::Msg("project has no pages".into()));
    }

    let output_val = output.cloned().unwrap_or_else(|| json_output_pdf(project));
    let project_lang = project
        .get("language")
        .and_then(|v| v.as_str());
    let ctx = RuntimeContext::from_row_with_language(row, &output_val, false, project_lang);

    // First visible page determines initial PDF page size.
    let visible: Vec<(usize, &Value)> = pages
        .iter()
        .enumerate()
        .filter(|(_, page)| {
            match page.get("condition").and_then(|v| v.as_str()) {
                Some(c) if !c.trim().is_empty() => evaluate_condition(c, row, Some(&ctx)),
                _ => true,
            }
        })
        .collect();
    if visible.is_empty() {
        return Err(RenderError::Msg(
            "no pages visible for this language/row".into(),
        ));
    }

    let (first_w, first_h) = page_size_px(project, visible[0].1);
    let (doc, page_idx, layer_idx) = PdfDocument::new(
        project
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("texLooper"),
        px_to_mm(first_w),
        px_to_mm(first_h),
        "Layer 1",
    );
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| RenderError::Pdf(e.to_string()))?;

    for (vis_i, (_orig_i, page)) in visible.iter().enumerate() {
        let (w, h) = page_size_px(project, page);
        let (p_idx, l_idx) = if vis_i == 0 {
            (page_idx, layer_idx)
        } else {
            doc.add_page(px_to_mm(w), px_to_mm(h), format!("Page {}", vis_i + 1))
        };
        let layer = doc.get_page(p_idx).get_layer(l_idx);

        let mut ordered = page
            .get("blocks")
            .and_then(|b| b.as_array())
            .cloned()
            .unwrap_or_default();
        ordered.sort_by(|a, b| {
            let za = a.get("zIndex").and_then(|v| v.as_i64()).unwrap_or(0);
            let zb = b.get("zIndex").and_then(|v| v.as_i64()).unwrap_or(0);
            za.cmp(&zb)
        });

        for block in &ordered {
            let cond = block.get("condition").and_then(|v| v.as_str());
            if let Some(c) = cond {
                if !evaluate_condition(c, row, Some(&ctx)) {
                    continue;
                }
            }
            let ty = block.get("type").and_then(|v| v.as_str()).unwrap_or("");
            match ty {
                "paragraph" | "text" | "data" | "list" | "table" => {
                    draw_text_block(&layer, &font, block, h, row, &ctx);
                }
                "shape" | "picture" | "files" => {
                    draw_shape_placeholder(&layer, block, h);
                }
                "group" => {
                    if let Some(kids) = block
                        .get("content")
                        .and_then(|c| c.get("blocks"))
                        .and_then(|b| b.as_array())
                    {
                        for kid in kids {
                            let kty = kid.get("type").and_then(|v| v.as_str()).unwrap_or("");
                            if matches!(kty, "paragraph" | "text" | "data" | "list" | "table") {
                                draw_text_block(&layer, &font, kid, h, row, &ctx);
                            } else if matches!(kty, "shape" | "picture") {
                                draw_shape_placeholder(&layer, kid, h);
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    doc.save_to_bytes()
        .map_err(|e| RenderError::Pdf(e.to_string()))
}

fn json_output_pdf(project: &Value) -> Value {
    if let Some(outs) = project.get("outputs").and_then(|o| o.as_array()) {
        if let Some(pdf) = outs
            .iter()
            .find(|o| o.get("kind").and_then(|k| k.as_str()) == Some("pdf"))
        {
            return pdf.clone();
        }
        if let Some(first) = outs.first() {
            return first.clone();
        }
    }
    serde_json::json!({ "id": "out-pdf", "name": "PDF", "kind": "pdf" })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn renders_merge_field() {
        let project = json!({
            "name": "Test",
            "artboard": { "w": 400, "h": 300 },
            "pages": [{
                "id": "p1",
                "name": "One",
                "blocks": [{
                    "id": "b1",
                    "type": "text",
                    "name": "Hello",
                    "x": 40, "y": 40, "w": 200, "h": 40,
                    "content": { "text": "Hi {{name}}" },
                    "style": { "fontSize": 14 }
                }]
            }],
            "outputs": [{ "id": "out-pdf", "kind": "pdf" }]
        });
        let row = json!({ "name": "Ada" });
        let bytes = render_project_pdf(&project, &row, None).expect("pdf");
        assert!(bytes.starts_with(b"%PDF"));
        assert!(bytes.len() > 100);
    }

    #[test]
    fn skips_pages_for_mismatched_language() {
        let project = json!({
            "name": "Lang",
            "language": "en",
            "artboard": { "w": 400, "h": 300 },
            "pages": [
                {
                    "id": "en",
                    "condition": "vars.language == 'en'",
                    "blocks": [{
                        "id": "b1",
                        "type": "text",
                        "x": 10, "y": 10, "w": 100, "h": 30,
                        "content": { "text": "Hello" },
                        "style": { "fontSize": 12 }
                    }]
                },
                {
                    "id": "fr",
                    "condition": "vars.language == 'fr'",
                    "blocks": [{
                        "id": "b2",
                        "type": "text",
                        "x": 10, "y": 10, "w": 100, "h": 30,
                        "content": { "text": "Bonjour" },
                        "style": { "fontSize": 12 }
                    }]
                }
            ],
            "outputs": [{ "id": "out-pdf", "kind": "pdf" }]
        });
        let row_fr = json!({ "language": "fr", "name": "Ada" });
        let bytes = render_project_pdf(&project, &row_fr, None).expect("pdf");
        assert!(bytes.starts_with(b"%PDF"));
    }
}
