//! Project JSON → PDF bytes (ADR 0014). Geometry: CSS px → pt.

use crate::build_info;
use crate::render_data::{attach_project_datasets, resolve_list_items, resolve_table_cells, ListItemNode};
use crate::render_fonts::{FontError, FontRegistry};
use crate::render_layout::{
    apply_layout_rect, flatten_blocks, resolve_pinned_rect, sort_by_effective_z, FlatBlock, Rect,
};
use crate::render_richtext::{
    apply_text_transform, flatten_spans, parse_inline_rich_text, LayoutLine, StyledSpan,
};
use crate::render_style::{
    apply_opacity, parse_hex_color, resolve_style, ResolvedStyle, PX_TO_PT,
};
use crate::template::{evaluate_condition, resolve_template, RuntimeContext};
use printpdf::path::{PaintMode, WindingOrder};
use printpdf::{
    Color, Image, ImageTransform, ImageXObject, LinkAnnotation, Mm,
    PdfDocument, PdfDocumentReference, PdfLayerReference, Point, Polygon,
};
use qrcode::QrCode;
use serde_json::Value;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum RenderError {
    #[error("render: {0}")]
    Msg(String),
    #[error("pdf: {0}")]
    Pdf(String),
    #[error(transparent)]
    Font(#[from] FontError),
}

struct PageCtx<'a> {
    page: &'a Value,
    page_w: f32,
    page_h: f32,
}

impl PageCtx<'_> {
    fn margins(&self) -> Option<&Value> {
        self.page.get("margins")
    }

    fn pin_respects_margins(&self) -> bool {
        self.page
            .get("pinRespectsMargins")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
    }
}

fn px_to_mm(px: f32) -> Mm {
    Mm(px * PX_TO_PT * 25.4 / 72.0)
}

/// Stamp Creator/Producer/Keywords/Identifier from build info + optional
/// `_texlooperEmit` bag attached by the frontend (same correlators as EML).
fn apply_emit_metadata(doc: PdfDocumentReference, project: &Value) -> PdfDocumentReference {
    let version = env!("CARGO_PKG_VERSION");
    let channel = build_info::channel();
    let emit = project.get("_texlooperEmit");
    let instance = emit
        .and_then(|e| e.get("instanceId"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or("unknown");
    let project_id = emit
        .and_then(|e| e.get("projectId"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty());

    let producer = format!("texLooper/{version} ({channel})");
    let mut keywords = vec![
        format!("X-TexLooper-Version={version}"),
        format!("X-TexLooper-Channel={channel}"),
        format!("X-TexLooper-Instance-Id={instance}"),
    ];
    if let Some(pid) = project_id {
        keywords.push(format!("X-TexLooper-Project-Id={pid}"));
    }
    if let Some(user_kw) = project.get("keywords").and_then(|v| v.as_str()) {
        for part in user_kw.split(',') {
            let t = part.trim();
            if !t.is_empty() {
                keywords.push(t.to_string());
            }
        }
    }

    let mut doc = doc
        .with_creator("texLooper")
        .with_producer(producer)
        .with_keywords(keywords)
        .with_identifier(instance.to_string());

    if let Some(title) = project.get("name").and_then(|v| v.as_str()) {
        if !title.is_empty() {
            doc = doc.with_title(title);
        }
    }
    if let Some(author) = project.get("author").and_then(|v| v.as_str()) {
        if !author.is_empty() {
            doc = doc.with_author(author);
        }
    }
    if let Some(subject) = project.get("subject").and_then(|v| v.as_str()) {
        if !subject.is_empty() {
            doc = doc.with_subject(subject);
        }
    }
    doc
}

fn block_rect(block: &Value, ctx: &PageCtx<'_>) -> Rect {
    let pinned = resolve_pinned_rect(
        block,
        ctx.page_w,
        ctx.page_h,
        ctx.margins(),
        ctx.pin_respects_margins(),
    );
    let margin = resolve_style(block).margin;
    Rect {
        x: pinned.x + margin,
        y: pinned.y + margin,
        w: (pinned.w - margin * 2.0).max(1.0),
        h: (pinned.h - margin * 2.0).max(1.0),
    }
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
    (720.0, 960.0)
}

fn content_rect(frame: Rect, style: &ResolvedStyle) -> Rect {
    Rect {
        x: frame.x + style.padding,
        y: frame.y + style.padding,
        w: (frame.w - style.padding * 2.0).max(1.0),
        h: (frame.h - style.padding * 2.0).max(1.0),
    }
}

fn pdf_y_top(page_h_px: f32, y_px: f32) -> f32 {
    page_h_px - y_px
}

fn polygon_points(points: &[(f32, f32)], page_h_px: f32) -> Vec<(Point, bool)> {
    points
        .iter()
        .map(|(x, y)| (Point::new(px_to_mm(*x), px_to_mm(page_h_px - *y)), false))
        .collect()
}

fn draw_polygon(
    layer: &PdfLayerReference,
    points: &[(f32, f32)],
    page_h_px: f32,
    fill: Option<Color>,
    stroke: Option<(Color, f32)>,
) {
    let mode = match (fill.is_some(), stroke.is_some()) {
        (true, true) => PaintMode::FillStroke,
        (true, false) => PaintMode::Fill,
        (false, true) => PaintMode::Stroke,
        (false, false) => return,
    };
    if let Some(c) = fill {
        layer.set_fill_color(c);
    }
    if let Some((c, w)) = stroke {
        layer.set_outline_color(c);
        layer.set_outline_thickness(w * PX_TO_PT);
    }
    let poly = Polygon {
        rings: vec![polygon_points(points, page_h_px)],
        mode,
        winding_order: WindingOrder::NonZero,
    };
    layer.add_polygon(poly);
}

fn draw_rounded_rect(
    layer: &PdfLayerReference,
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    radius: f32,
    page_h_px: f32,
    fill: Option<Color>,
    stroke: Option<(Color, f32)>,
) {
    let r = radius.min(w / 2.0).min(h / 2.0);
    if r <= 0.5 {
        draw_polygon(layer, &[(x, y), (x + w, y), (x + w, y + h), (x, y + h)], page_h_px, fill, stroke);
        return;
    }
    let segs = 6;
    let mut pts = Vec::new();
    for i in 0..=segs {
        let t = i as f32 / segs as f32;
        let a = std::f32::consts::FRAC_PI_2 * t;
        pts.push((x + w - r + r * a.cos(), y + r - r * a.sin()));
    }
    for i in 0..=segs {
        let t = i as f32 / segs as f32;
        let a = std::f32::consts::FRAC_PI_2 * t;
        pts.push((x + w - r + r * a.sin(), y + h - r + r * a.cos()));
    }
    for i in 0..=segs {
        let t = i as f32 / segs as f32;
        let a = std::f32::consts::FRAC_PI_2 * t;
        pts.push((x + r - r * a.cos(), y + h - r + r * a.sin()));
    }
    for i in 0..=segs {
        let t = i as f32 / segs as f32;
        let a = std::f32::consts::FRAC_PI_2 * t;
        pts.push((x + r - r * a.sin(), y + r - r * a.cos()));
    }
    draw_polygon(layer, &pts, page_h_px, fill, stroke);
}

fn draw_frame_chrome(
    layer: &PdfLayerReference,
    frame: Rect,
    style: &ResolvedStyle,
    page_h_px: f32,
) {
    if style.background.is_some() || style.border_width > 0.0 {
        let fill = style.background.clone();
        let stroke = style
            .border_color
            .clone()
            .map(|c| (c, style.border_width));
        if style.border_radius > 0.0 {
            draw_rounded_rect(
                layer,
                frame.x,
                frame.y,
                frame.w,
                frame.h,
                style.border_radius,
                page_h_px,
                fill,
                stroke,
            );
        } else {
            draw_polygon(
                layer,
                &[
                    (frame.x, frame.y),
                    (frame.x + frame.w, frame.y),
                    (frame.x + frame.w, frame.y + frame.h),
                    (frame.x, frame.y + frame.h),
                ],
                page_h_px,
                fill,
                stroke,
            );
        }
    }
}

fn shape_variant(block: &Value) -> &str {
    block
        .get("content")
        .and_then(|c| c.get("variant").or_else(|| c.get("shape")))
        .and_then(|v| v.as_str())
        .unwrap_or("rect")
}

fn shape_filled(block: &Value, style: &ResolvedStyle) -> bool {
    block
        .get("content")
        .and_then(|c| c.get("filled"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
        || style.background.is_some()
}

fn draw_shape_block(layer: &PdfLayerReference, block: &Value, ctx: &PageCtx<'_>) {
    let frame = block_rect(block, ctx);
    if frame.w <= 0.0 || frame.h <= 0.0 {
        return;
    }
    let page_h_px = ctx.page_h;
    let style = resolve_style(block);
    let variant = shape_variant(block);
    let filled = shape_filled(&block, &style);
    let border_w = if style.border_width > 0.0 {
        style.border_width
    } else if filled {
        0.0
    } else {
        1.5
    };
    let border_color = style
        .border_color
        .or_else(|| parse_hex_color("#2a2622"));
    let fill_color = if filled {
        style
            .background
            .or_else(|| parse_hex_color("#e3ddd3"))
    } else {
        None
    };

    if variant == "line" {
        let lw = border_w.max(1.0);
        let color = border_color.unwrap_or_else(|| parse_hex_color("#2a2622").unwrap());
        layer.set_outline_color(color);
        layer.set_outline_thickness(lw * PX_TO_PT);
        let y = frame.y + lw / 2.0;
        let bottom = page_h_px - y;
        let line = printpdf::Line {
            points: vec![
                (Point::new(px_to_mm(frame.x), px_to_mm(bottom)), false),
                (Point::new(px_to_mm(frame.x + frame.w), px_to_mm(bottom)), false),
            ],
            is_closed: false,
        };
        layer.add_line(line);
        return;
    }

    let radius = match variant {
        "rounded" | "circle" => {
            if style.border_radius > 0.0 {
                style.border_radius
            } else if variant == "circle" {
                frame.w.min(frame.h) / 2.0
            } else {
                16.0
            }
        }
        _ => style.border_radius,
    };

    let stroke = if border_w > 0.0 {
        border_color.map(|c| (c, border_w))
    } else {
        None
    };

    match variant {
        "ellipse" | "circle" => {
            let cx = frame.x + frame.w / 2.0;
            let cy = frame.y + frame.h / 2.0;
            let rx = frame.w / 2.0;
            let ry = frame.h / 2.0;
            let segs = 32;
            let mut pts = Vec::with_capacity(segs);
            for i in 0..segs {
                let a = 2.0 * std::f32::consts::PI * i as f32 / segs as f32;
                pts.push((cx + rx * a.cos(), cy + ry * a.sin()));
            }
            draw_polygon(layer, &pts, page_h_px, fill_color, stroke);
        }
        "triangle" => {
            let pts = [
                (frame.x + frame.w / 2.0, frame.y),
                (frame.x, frame.y + frame.h),
                (frame.x + frame.w, frame.y + frame.h),
            ];
            draw_polygon(layer, &pts, page_h_px, fill_color, stroke);
        }
        "diamond" => {
            let pts = [
                (frame.x + frame.w / 2.0, frame.y),
                (frame.x + frame.w, frame.y + frame.h / 2.0),
                (frame.x + frame.w / 2.0, frame.y + frame.h),
                (frame.x, frame.y + frame.h / 2.0),
            ];
            draw_polygon(layer, &pts, page_h_px, fill_color, stroke);
        }
        _ => {
            draw_rounded_rect(
                layer,
                frame.x,
                frame.y,
                frame.w,
                frame.h,
                radius,
                page_h_px,
                fill_color,
                stroke,
            );
        }
    }
}

fn is_bold(style: &ResolvedStyle, span: &StyledSpan) -> bool {
    span.bold || style.font_weight >= 600
}

fn is_italic(style: &ResolvedStyle, span: &StyledSpan) -> bool {
    span.italic || style.font_style == "italic"
}

fn span_measure(spans: &[StyledSpan], style: &ResolvedStyle, fonts: &FontRegistry) -> f32 {
    fonts.measure_spans(spans, style, style.font_size, style.letter_spacing)
}

fn draw_span_text(
    layer: &PdfLayerReference,
    fonts: &FontRegistry,
    span: &StyledSpan,
    style: &ResolvedStyle,
    x: f32,
    baseline_y: f32,
    font_size: f32,
    letter_spacing: f32,
    default_color: Option<Color>,
    page_h_px: f32,
) {
    if span.text.is_empty() {
        return;
    }
    let bold = is_bold(style, span);
    let italic = is_italic(style, span);
    let weight = if bold { 700 } else { style.font_weight };
    let font = fonts.pick(&style.font_family, weight, italic);
    let ink = span.color.clone().or(default_color.clone());
    if let Some(color) = ink.clone() {
        layer.set_fill_color(color);
    }

    let size_pt = font_size * PX_TO_PT;
    let spacing_pt = letter_spacing * PX_TO_PT;
    if spacing_pt.abs() > 0.01 {
        layer.begin_text_section();
        layer.set_font(font, size_pt);
        layer.set_character_spacing(spacing_pt);
        layer.set_text_cursor(px_to_mm(x), px_to_mm(baseline_y));
        layer.write_text(&span.text, font);
        layer.end_text_section();
    } else {
        layer.use_text(
            &span.text,
            size_pt,
            px_to_mm(x),
            px_to_mm(baseline_y),
            font,
        );
    }

    let span_w = fonts.measure_text(
        &span.text,
        &style.font_family,
        weight,
        italic,
        font_size,
        letter_spacing,
    );
    let deco_color = ink.unwrap_or_else(|| parse_hex_color("#2a2622").unwrap());
    if span.underline || style.text_decoration == "underline" {
        let line_y = baseline_y - 2.0;
        layer.set_outline_color(deco_color.clone());
        layer.set_outline_thickness(0.5);
        let line = printpdf::Line {
            points: vec![
                (Point::new(px_to_mm(x), px_to_mm(line_y)), false),
                (Point::new(px_to_mm(x + span_w), px_to_mm(line_y)), false),
            ],
            is_closed: false,
        };
        layer.add_line(line);
    }
    if span.strike || style.text_decoration == "line-through" {
        let line_y = baseline_y - font_size * 0.35;
        layer.set_outline_color(deco_color);
        layer.set_outline_thickness(0.5);
        let line = printpdf::Line {
            points: vec![
                (Point::new(px_to_mm(x), px_to_mm(line_y)), false),
                (Point::new(px_to_mm(x + span_w), px_to_mm(line_y)), false),
            ],
            is_closed: false,
        };
        layer.add_line(line);
    }
    if let Some(url) = span.link_url.as_deref() {
        if !url.trim().is_empty() {
            let css_y = page_h_px - baseline_y - font_size;
            add_link_annotation(layer, x, css_y, span_w, font_size * 1.2, page_h_px, url);
        }
    }
}

fn draw_rich_lines(
    layer: &PdfLayerReference,
    fonts: &FontRegistry,
    lines: &[LayoutLine],
    area: Rect,
    style: &ResolvedStyle,
    page_h_px: f32,
) {
    let font_size = style.font_size;
    let lh = font_size * style.line_height;
    let total_h = lines.len() as f32 * lh;
    let mut start_y = area.y;
    match style.vertical_align.as_str() {
        "middle" => start_y += (area.h - total_h) / 2.0,
        "bottom" => start_y += area.h - total_h,
        _ => {}
    }
    start_y += fonts.text_ascent(
        &style.font_family,
        style.font_weight,
        style.font_style == "italic",
        font_size,
    );

    for line in lines {
        let mut draw_x = area.x + style.text_indent;
        match style.text_align.as_str() {
            "center" => draw_x = area.x + ((area.w - line.width) / 2.0).max(0.0),
            "right" => draw_x = area.x + (area.w - line.width).max(0.0),
            _ => {}
        }
        let baseline = pdf_y_top(page_h_px, start_y);
        for span in &line.spans {
            draw_span_text(
                layer,
                fonts,
                span,
                style,
                draw_x,
                baseline,
                font_size,
                style.letter_spacing,
                style.color.clone(),
                page_h_px,
            );
            draw_x += span_measure(std::slice::from_ref(span), style, fonts);
        }
        start_y += lh;
    }
}

fn text_to_lines(text: &str, style: &ResolvedStyle, width: f32, fonts: &FontRegistry) -> Vec<LayoutLine> {
    let transformed = apply_text_transform(text, &style.text_transform);
    match style.white_space.as_str() {
        "nowrap" => {
            let nodes = parse_inline_rich_text(&transformed.replace('\n', " "));
            let spans = flatten_spans(&nodes);
            let line_w = fonts.measure_spans(&spans, style, style.font_size, style.letter_spacing);
            vec![LayoutLine {
                spans,
                width: line_w.min(width.max(line_w)),
            }]
        }
        "pre" => transformed
            .split('\n')
            .map(|paragraph| {
                let nodes = parse_inline_rich_text(paragraph);
                let spans = flatten_spans(&nodes);
                let line_w = fonts.measure_spans(&spans, style, style.font_size, style.letter_spacing);
                LayoutLine {
                    spans,
                    width: line_w,
                }
            })
            .collect(),
        _ => {
            let mut all_lines = Vec::new();
            for paragraph in transformed.split('\n') {
                let nodes = parse_inline_rich_text(paragraph);
                let spans = flatten_spans(&nodes);
                all_lines.extend(fonts.wrap_spans(&spans, width, style));
            }
            all_lines
        }
    }
}

fn block_text(block: &Value) -> Option<String> {
    let content = block.get("content")?;
    let ty = block.get("type").and_then(|v| v.as_str()).unwrap_or("");
    if ty == "date" {
        let source = content
            .get("source")
            .and_then(|v| v.as_str())
            .unwrap_or("today");
        let format = content
            .get("format")
            .and_then(|v| v.as_str())
            .unwrap_or("short");
        let filter = if format == "iso" {
            "date:iso"
        } else if format == "long" {
            "date:long"
        } else {
            "date:short"
        };
        return Some(match source {
            "fixed" => {
                let fixed = content
                    .get("fixed")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if fixed.is_empty() {
                    String::new()
                } else {
                    format!("{{{{{fixed}|{filter}}}}}", fixed = fixed, filter = filter)
                }
            }
            "field" => {
                let path = content
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("date")
                    .trim();
                let path = if path.is_empty() { "date" } else { path };
                if path.contains('|') {
                    format!("{{{{{path}}}}}")
                } else {
                    format!("{{{{{path}|{filter}}}}}")
                }
            }
            _ => format!("{{{{env.today|{filter}}}}}"),
        });
    }
    if let Some(t) = content.get("text").and_then(|v| v.as_str()) {
        return Some(t.to_string());
    }
    if let Some(path) = content.get("path").and_then(|v| v.as_str()) {
        if ty == "data" {
            return Some(format!("{{{{{path}}}}}"));
        }
    }
    if ty == "prebuild" {
        return content.get("text").and_then(|v| v.as_str()).map(str::to_string);
    }
    None
}

fn draw_text_block(
    layer: &PdfLayerReference,
    fonts: &FontRegistry,
    block: &Value,
    ctx: &PageCtx<'_>,
    row: &Value,
    runtime: &RuntimeContext,
) {
    let Some(raw) = block_text(block) else {
        return;
    };
    let text = resolve_template(&raw, row, Some(runtime), true);
    if text.trim().is_empty() {
        return;
    }
    let style = resolve_style(block);
    let frame = block_rect(block, ctx);
    draw_frame_chrome(layer, frame, &style, ctx.page_h);
    let area = content_rect(frame, &style);
    let lines = text_to_lines(&text, &style, area.w, fonts);
    draw_rich_lines(layer, fonts, &lines, area, &style, ctx.page_h);
}

fn list_marker(index: usize, list_style: &str, start: i64) -> String {
    match list_style {
        "decimal" => format!("{}.", index as i64 + start),
        "upper-roman" => format!("{}.", to_roman(index + 1)),
        "lower-alpha" => format!("{}.", (b'a' + (index as u8).min(25)) as char),
        "circle" => "○".into(),
        "square" => "■".into(),
        "none" => String::new(),
        _ => "•".into(),
    }
}

fn to_roman(mut n: usize) -> String {
    const PAIRS: [(usize, &str); 13] = [
        (1000, "M"),
        (900, "CM"),
        (500, "D"),
        (400, "CD"),
        (100, "C"),
        (90, "XC"),
        (50, "L"),
        (40, "XL"),
        (10, "X"),
        (9, "IX"),
        (5, "V"),
        (4, "IV"),
        (1, "I"),
    ];
    let mut out = String::new();
    for (v, s) in PAIRS {
        while n >= v {
            out.push_str(s);
            n -= v;
        }
    }
    out
}

struct ListItem {
    text: String,
    children: Vec<ListItem>,
}

fn list_item_from_node(node: &ListItemNode) -> ListItem {
    ListItem {
        text: node.text.clone(),
        children: node.children.iter().map(list_item_from_node).collect(),
    }
}

fn parse_list_items(content: &Value, row: &Value, ctx: &RuntimeContext) -> Vec<ListItem> {
    resolve_list_items(content, row, ctx)
        .iter()
        .map(list_item_from_node)
        .collect()
}

fn flatten_list_lines(
    items: &[ListItem],
    depth: usize,
    list_style: &str,
    start: i64,
    style: &ResolvedStyle,
    width: f32,
    marker_color: Option<&Color>,
    row: &Value,
    ctx: &RuntimeContext,
    fonts: &FontRegistry,
    out: &mut Vec<(usize, LayoutLine)>,
    counter: &mut usize,
) {
    let indent = style_f32_from_content(depth, 19.0);
    let list_indent = 19.0f32;
    let pad = list_indent + depth as f32 * 16.0;
    let _ = indent;
    for item in items {
        let text = resolve_template(&item.text, row, Some(ctx), true);
        if text.trim().is_empty() {
            continue;
        }
        let marker = list_marker(*counter, list_style, start);
        *counter += 1;
        let lines = text_to_lines(&text, style, width - pad - 12.0, fonts);
        for (i, line) in lines.into_iter().enumerate() {
            let mut spans = Vec::new();
            if i == 0 && !marker.is_empty() {
                spans.push(StyledSpan {
                    text: format!("{marker} "),
                    bold: false,
                    italic: false,
                    underline: false,
                    strike: false,
                    link_url: None,
                    color: marker_color.cloned(),
                });
            } else if i > 0 {
                spans.push(StyledSpan {
                    text: "  ".to_string(),
                    bold: false,
                    italic: false,
                    underline: false,
                    strike: false,
                    link_url: None,
                    color: None,
                });
            }
            spans.extend(line.spans);
            let width = span_measure(&spans, style, fonts);
            out.push((depth, LayoutLine { spans, width }));
        }
        if !item.children.is_empty() {
            flatten_list_lines(
                &item.children,
                depth + 1,
                list_style,
                start,
                style,
                width,
                marker_color,
                row,
                ctx,
                fonts,
                out,
                counter,
            );
        }
    }
}

fn style_f32_from_content(_depth: usize, default: f32) -> f32 {
    default
}

fn draw_list_block(
    layer: &PdfLayerReference,
    fonts: &FontRegistry,
    block: &Value,
    ctx: &PageCtx<'_>,
    row: &Value,
    runtime: &RuntimeContext,
) {
    let content = match block.get("content") {
        Some(c) => c,
        None => return,
    };
    let items = parse_list_items(content, row, runtime);
    if items.is_empty() {
        return;
    }
    let style = resolve_style(block);
    let frame = block_rect(block, ctx);
    draw_frame_chrome(layer, frame, &style, ctx.page_h);
    let area = content_rect(frame, &style);
    let list_indent = content
        .get("listIndent")
        .and_then(|v| v.as_f64())
        .unwrap_or(19.0) as f32;
    let start = content.get("start").and_then(|v| v.as_i64()).unwrap_or(1);
    let list_style = if style.list_style.is_empty() || style.list_style == "disc" {
        style.list_style.as_str()
    } else {
        style.list_style.as_str()
    };
    let marker_color = content
        .get("markerColor")
        .and_then(|v| v.as_str())
        .and_then(parse_hex_color);
    let marker_ref = marker_color.as_ref();
    let mut lines: Vec<(usize, LayoutLine)> = Vec::new();
    let mut counter = 0usize;
    flatten_list_lines(
        &items,
        0,
        list_style,
        start,
        &style,
        area.w - list_indent,
        marker_ref,
        row,
        runtime,
        fonts,
        &mut lines,
        &mut counter,
    );
    let layout_lines: Vec<LayoutLine> = lines
        .into_iter()
        .map(|(_, l)| {
            let mut shifted = l;
            shifted.width += list_indent;
            shifted
        })
        .collect();
    let mut list_style_copy = style.clone();
    list_style_copy.text_indent = list_indent;
    draw_rich_lines(
        layer,
        fonts,
        &layout_lines,
        area,
        &list_style_copy,
        ctx.page_h,
    );
}

fn resolve_link_url(hook: &str, target: &str) -> String {
    match hook {
        "url" => target.to_string(),
        "mailto" => format!("mailto:{target}"),
        "tel" => format!("tel:{target}"),
        _ => target.to_string(),
    }
}

fn add_link_annotation(
    layer: &PdfLayerReference,
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    page_h_px: f32,
    url: &str,
) {
    let bottom = page_h_px - y - h;
    let rect = printpdf::Rect::new(
        px_to_mm(x),
        px_to_mm(bottom),
        px_to_mm(x + w),
        px_to_mm(bottom + h),
    );
    layer.add_link_annotation(LinkAnnotation::new(
        rect,
        None,
        None,
        printpdf::Actions::uri(url.to_string()),
        None,
    ));
}

fn draw_link_block(
    layer: &PdfLayerReference,
    fonts: &FontRegistry,
    block: &Value,
    page: &PageCtx<'_>,
    row: &Value,
    runtime: &RuntimeContext,
) {
    let content = match block.get("content") {
        Some(c) => c,
        None => return,
    };
    let hook = content
        .get("hook")
        .and_then(|v| v.as_str())
        .unwrap_or("url");
    let target = resolve_template(
        content
            .get("target")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        row,
        Some(runtime),
        true,
    );
    let label = resolve_template(
        content
            .get("label")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        row,
        Some(runtime),
        true,
    );
    let display = if label.trim().is_empty() {
        target.clone()
    } else {
        label
    };
    if display.trim().is_empty() {
        return;
    }
    let mut style = resolve_style(block);
    if style.text_decoration == "none" {
        style.text_decoration = "underline".into();
    }
    let frame = block_rect(block, page);
    draw_frame_chrome(layer, frame, &style, page.page_h);
    let area = content_rect(frame, &style);
    let lines = text_to_lines(&display, &style, area.w, fonts);
    draw_rich_lines(layer, fonts, &lines, area, &style, page.page_h);
    if !target.trim().is_empty() {
        let url = resolve_link_url(hook, &target);
        add_link_annotation(layer, area.x, area.y, area.w, area.h, page.page_h, &url);
    }
}

fn draw_table_block(
    layer: &PdfLayerReference,
    fonts: &FontRegistry,
    block: &Value,
    page: &PageCtx<'_>,
    row: &Value,
    runtime: &RuntimeContext,
) {
    let content = match block.get("content") {
        Some(c) => c,
        None => return,
    };
    let resolved = resolve_table_cells(content, row, runtime);
    if resolved.is_empty() {
        return;
    }
    let cells: Vec<Value> = resolved
        .into_iter()
        .map(|row| Value::Array(row.into_iter().map(Value::String).collect()))
        .collect();
    let style = resolve_style(block);
    let frame = block_rect(block, page);
    draw_frame_chrome(layer, frame, &style, page.page_h);
    let area = content_rect(frame, &style);
    let page_h_px = page.page_h;

    let rows = cells.len();
    let cols = cells.iter().filter_map(|r| r.as_array()).map(|r| r.len()).max().unwrap_or(1);
    let header = content.get("header").and_then(|v| v.as_bool()).unwrap_or(false);
    let zebra = content.get("zebra").and_then(|v| v.as_bool()).unwrap_or(false);
    let cell_pad = content
        .get("cellPadding")
        .and_then(|v| v.as_f64())
        .unwrap_or(6.0) as f32;
    let show_borders = content
        .get("showBorders")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let border_color = content
        .get("borderColor")
        .and_then(|v| v.as_str())
        .and_then(parse_hex_color)
        .unwrap_or_else(|| parse_hex_color("#cfc8bc").unwrap());
    let row_h = area.h / rows.max(1) as f32;

    for (ri, row_cells) in cells.iter().enumerate() {
        let Some(row_arr) = row_cells.as_array() else {
            continue;
        };
        let is_header_row = header && ri == 0;
        let col_w = area.w / cols as f32;
        if zebra && ri % 2 == 1 {
            draw_polygon(
                layer,
                &[
                    (area.x, area.y + ri as f32 * row_h),
                    (area.x + area.w, area.y + ri as f32 * row_h),
                    (area.x + area.w, area.y + (ri + 1) as f32 * row_h),
                    (area.x, area.y + (ri + 1) as f32 * row_h),
                ],
                page_h_px,
                Some(parse_hex_color("#2a2622")
                    .map(|c| apply_opacity(c, 0.08))
                    .unwrap()),
                None,
            );
        }
        for (ci, cell) in row_arr.iter().enumerate() {
            let cx = area.x + ci as f32 * col_w;
            let cy = area.y + ri as f32 * row_h;
            if show_borders {
                draw_polygon(
                    layer,
                    &[(cx, cy), (cx + col_w, cy), (cx + col_w, cy + row_h), (cx, cy + row_h)],
                    page_h_px,
                    None,
                    Some((border_color.clone(), 0.5)),
                );
            }
            let raw = cell.as_str().unwrap_or("");
            let text = resolve_template(raw, row, Some(runtime), true);
            let mut cell_style = style.clone();
            if is_header_row {
                cell_style.font_weight = content
                    .get("headerFontWeight")
                    .and_then(|v| v.as_f64())
                    .map(|n| n as u32)
                    .unwrap_or(600);
                if let Some(c) = content.get("headerColor").and_then(|v| v.as_str()) {
                    cell_style.color = parse_hex_color(c);
                }
                if let Some(bg) = content.get("headerBackground").and_then(|v| v.as_str()) {
                    draw_polygon(
                        layer,
                        &[(cx, cy), (cx + col_w, cy), (cx + col_w, cy + row_h), (cx, cy + row_h)],
                        page_h_px,
                        parse_hex_color(bg),
                        None,
                    );
                }
            }
            let lines = text_to_lines(&text, &cell_style, col_w - cell_pad * 2.0, fonts);
            let cell_area = Rect {
                x: cx + cell_pad,
                y: cy + cell_pad,
                w: col_w - cell_pad * 2.0,
                h: row_h - cell_pad * 2.0,
            };
            draw_rich_lines(layer, fonts, &lines, cell_area, &cell_style, page_h_px);
        }
    }
}

fn decode_image_bytes(src: &str) -> Option<Vec<u8>> {
    if let Some(rest) = src.strip_prefix("data:") {
        let payload = rest.split_once(",")?.1;
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, payload).ok()
    } else if src.starts_with("http://") || src.starts_with("https://") {
        None
    } else {
        let path = std::path::Path::new(src.trim());
        if path.is_file() {
            std::fs::read(path).ok()
        } else if let Ok(cwd) = std::env::current_dir() {
            std::fs::read(cwd.join(path)).ok()
        } else {
            None
        }
    }
}

fn draw_page_background(
    layer: &PdfLayerReference,
    page: &Value,
    page_w: f32,
    page_h: f32,
) {
    let bg = page
        .get("background")
        .and_then(|v| v.as_str())
        .unwrap_or("#ffffff");
    if let Some(color) = parse_hex_color(bg) {
        draw_polygon(
            layer,
            &[(0.0, 0.0), (page_w, 0.0), (page_w, page_h), (0.0, page_h)],
            page_h,
            Some(color),
            None,
        );
    }
}

fn draw_chrome_band_fills(
    layer: &PdfLayerReference,
    project: &Value,
    page_h: f32,
    page_w: f32,
) {
    let Some(chrome) = project.get("pageChrome") else {
        return;
    };
    for (slot, band) in [("header", chrome.get("header")), ("footer", chrome.get("footer"))] {
        let Some(b) = band else { continue };
        let enabled = b.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
        if !enabled {
            continue;
        }
        let height = b
            .get("height")
            .and_then(|v| v.as_f64())
            .unwrap_or(64.0) as f32;
        let bg = b.get("background").and_then(|v| v.as_str());
        let Some(color) = bg.and_then(parse_hex_color) else {
            continue;
        };
        let y = if slot == "header" {
            0.0
        } else {
            (page_h - height).max(0.0)
        };
        draw_polygon(
            layer,
            &[(0.0, y), (page_w, y), (page_w, y + height), (0.0, y + height)],
            page_h,
            Some(color),
            None,
        );
    }
}

fn draw_image_in_area(
    layer: &PdfLayerReference,
    bytes: &[u8],
    area: Rect,
    fit: &str,
    page_h_px: f32,
) -> bool {
    let Ok(img) = image::load_from_memory(bytes) else {
        return false;
    };
    let rgb = img.to_rgb8();
    let (iw, ih) = rgb.dimensions();
    let xobj = ImageXObject {
        width: printpdf::Px(iw as usize),
        height: printpdf::Px(ih as usize),
        color_space: printpdf::ColorSpace::Rgb,
        bits_per_component: printpdf::ColorBits::Bit8,
        interpolate: true,
        clipping_bbox: None,
        image_filter: None,
        smask: None,
        image_data: rgb.into_raw(),
    };
    let (dw, dh) = match fit {
        "fill" => (area.w, area.h),
        "cover" => {
            let scale = (area.w / iw as f32).max(area.h / ih as f32);
            (iw as f32 * scale, ih as f32 * scale)
        }
        _ => {
            let scale = (area.w / iw as f32).min(area.h / ih as f32);
            (iw as f32 * scale, ih as f32 * scale)
        }
    };
    let dx = area.x + (area.w - dw) / 2.0;
    let dy = area.y + (area.h - dh) / 2.0;
    let pdf_img = Image::from(xobj);
    pdf_img.add_to_layer(
        layer.clone(),
        ImageTransform {
            translate_x: Some(px_to_mm(dx)),
            translate_y: Some(px_to_mm(page_h_px - dy - dh)),
            scale_x: Some(dw / iw as f32),
            scale_y: Some(dh / ih as f32),
            dpi: Some(72.0 / PX_TO_PT),
            ..Default::default()
        },
    );
    true
}

fn draw_picture_block(
    layer: &PdfLayerReference,
    block: &Value,
    page: &PageCtx<'_>,
    row: &Value,
    runtime: &RuntimeContext,
) {
    let content = match block.get("content") {
        Some(c) => c,
        None => return,
    };
    let src = resolve_template(
        content.get("src").and_then(|v| v.as_str()).unwrap_or(""),
        row,
        Some(runtime),
        true,
    );
    if src.trim().is_empty() {
        return;
    }
    let style = resolve_style(block);
    let frame = block_rect(block, page);
    draw_frame_chrome(layer, frame, &style, page.page_h);
    let area = content_rect(frame, &style);
    let Some(bytes) = decode_image_bytes(&src) else {
        return;
    };
    let fit = content
        .get("fit")
        .and_then(|v| v.as_str())
        .unwrap_or("contain");
    let _ = draw_image_in_area(layer, &bytes, area, fit, page.page_h);
}

fn draw_qrcode_block(
    layer: &PdfLayerReference,
    block: &Value,
    page: &PageCtx<'_>,
    row: &Value,
    runtime: &RuntimeContext,
) {
    let content = match block.get("content") {
        Some(c) => c,
        None => return,
    };
    let value = resolve_template(
        content
            .get("value")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        row,
        Some(runtime),
        true,
    );
    if value.trim().is_empty() {
        return;
    }
    let style = resolve_style(block);
    let frame = block_rect(block, page);
    draw_frame_chrome(layer, frame, &style, page.page_h);
    let area = content_rect(frame, &style);
    let Ok(code) = QrCode::new(value.as_bytes()) else {
        return;
    };
    let modules = code.to_colors();
    let dim = code.width();
    if dim == 0 {
        return;
    }
    let quiet = content
        .get("quietZone")
        .and_then(|v| v.as_f64())
        .unwrap_or(4.0) as f32;
    let total = dim as f32 + quiet * 2.0;
    let module = area.w.min(area.h) / total;
    let ox = area.x + (area.w - module * total) / 2.0 + quiet * module;
    let oy = area.y + (area.h - module * total) / 2.0 + quiet * module;
    let dark = parse_hex_color("#000000").unwrap();
    for (i, color) in modules.iter().enumerate() {
        if *color == qrcode::Color::Light {
            continue;
        }
        let mx = i % dim;
        let my = i / dim;
        draw_polygon(
            layer,
            &[
                (ox + mx as f32 * module, oy + my as f32 * module),
                (ox + (mx + 1) as f32 * module, oy + my as f32 * module),
                (ox + (mx + 1) as f32 * module, oy + (my + 1) as f32 * module),
                (ox + mx as f32 * module, oy + (my + 1) as f32 * module),
            ],
            page.page_h,
            Some(dark.clone()),
            None,
        );
    }
}

fn draw_signature_block(
    layer: &PdfLayerReference,
    fonts: &FontRegistry,
    block: &Value,
    page: &PageCtx<'_>,
    row: &Value,
    runtime: &RuntimeContext,
) {
    let content = match block.get("content") {
        Some(c) => c,
        None => return,
    };
    let style = resolve_style(block);
    let frame = block_rect(block, page);
    draw_frame_chrome(layer, frame, &style, page.page_h);
    let area = content_rect(frame, &style);
    let show_line = content
        .get("showLine")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let label = resolve_template(
        content
            .get("label")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        row,
        Some(runtime),
        true,
    );
    let caption = resolve_template(
        content
            .get("caption")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        row,
        Some(runtime),
        true,
    );
    let signed_at = resolve_template(
        content
            .get("signedAt")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        row,
        Some(runtime),
        true,
    );
    let src = resolve_template(
        content.get("src").and_then(|v| v.as_str()).unwrap_or(""),
        row,
        Some(runtime),
        true,
    );
    let mode = content
        .get("mode")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let is_open = mode == "open" || (mode.is_empty() && src.trim().is_empty());
    let mut ink_h = area.h;
    if show_line {
        ink_h -= 8.0;
    }
    if !caption.trim().is_empty() {
        ink_h -= style.font_size * style.line_height * caption.lines().count() as f32;
    }
    if !signed_at.trim().is_empty() {
        ink_h -= style.font_size * style.line_height;
    }
    if !label.trim().is_empty() {
        ink_h -= style.font_size * style.line_height;
    }
    ink_h = ink_h.max(style.font_size * 2.0);
    if !is_open && !src.trim().is_empty() {
        if let Some(bytes) = decode_image_bytes(&src) {
            let ink_area = Rect {
                x: area.x,
                y: area.y,
                w: area.w,
                h: ink_h,
            };
            let _ = draw_image_in_area(layer, &bytes, ink_area, "contain", page.page_h);
        }
    }
    let mut meta_y = area.y + ink_h;
    if show_line {
        let line_y = meta_y + 4.0;
        let color = parse_hex_color("#2a2622").unwrap();
        layer.set_outline_color(color);
        layer.set_outline_thickness(0.5);
        let bottom = page.page_h - line_y;
        layer.add_line(printpdf::Line {
            points: vec![
                (Point::new(px_to_mm(area.x), px_to_mm(bottom)), false),
                (Point::new(px_to_mm(area.x + area.w), px_to_mm(bottom)), false),
            ],
            is_closed: false,
        });
        meta_y += 8.0;
    }
    if !label.trim().is_empty() {
        let label_area = Rect {
            x: area.x,
            y: meta_y,
            w: area.w,
            h: style.font_size * style.line_height,
        };
        let lines = text_to_lines(&label, &style, label_area.w, fonts);
        draw_rich_lines(layer, fonts, &lines, label_area, &style, page.page_h);
        meta_y += label_area.h;
    }
    if !caption.trim().is_empty() {
        let cap_h = style.font_size * style.line_height * caption.lines().count().max(1) as f32;
        let cap_area = Rect {
            x: area.x,
            y: meta_y,
            w: area.w,
            h: cap_h.min(area.y + area.h - meta_y).max(style.font_size),
        };
        let lines = text_to_lines(&caption, &style, cap_area.w, fonts);
        draw_rich_lines(layer, fonts, &lines, cap_area, &style, page.page_h);
        meta_y += cap_area.h;
    }
    if !signed_at.trim().is_empty() {
        let date_area = Rect {
            x: area.x,
            y: meta_y,
            w: area.w,
            h: (area.y + area.h - meta_y).max(style.font_size),
        };
        let lines = text_to_lines(&signed_at, &style, date_area.w, fonts);
        draw_rich_lines(layer, fonts, &lines, date_area, &style, page.page_h);
    }
}

fn draw_files_block(
    layer: &PdfLayerReference,
    fonts: &FontRegistry,
    block: &Value,
    page: &PageCtx<'_>,
    row: &Value,
    runtime: &RuntimeContext,
) {
    let content = match block.get("content") {
        Some(c) => c,
        None => return,
    };
    let file_name = content
        .get("fileName")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let label = resolve_template(
        content
            .get("label")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        row,
        Some(runtime),
        true,
    );
    let data_url = content
        .get("dataUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let display = if label.trim().is_empty() {
        file_name.to_string()
    } else {
        label
    };
    if display.trim().is_empty() {
        return;
    }
    let mut style = resolve_style(block);
    if style.text_decoration == "none" {
        style.text_decoration = "underline".into();
    }
    let frame = block_rect(block, page);
    draw_frame_chrome(layer, frame, &style, page.page_h);
    let area = content_rect(frame, &style);
    let lines = text_to_lines(&display, &style, area.w, fonts);
    draw_rich_lines(layer, fonts, &lines, area, &style, page.page_h);
    if !data_url.trim().is_empty() {
        add_link_annotation(layer, area.x, area.y, area.w, area.h, page.page_h, data_url);
    }
}

fn draw_block(
    layer: &PdfLayerReference,
    fonts: &FontRegistry,
    block: &Value,
    page: &PageCtx<'_>,
    row: &Value,
    runtime: &RuntimeContext,
) {
    let ty = block.get("type").and_then(|v| v.as_str()).unwrap_or("");
    match ty {
        "paragraph" | "text" | "data" | "date" | "prebuild" => {
            draw_text_block(layer, fonts, block, page, row, runtime);
        }
        "list" => draw_list_block(layer, fonts, block, page, row, runtime),
        "link" => draw_link_block(layer, fonts, block, page, row, runtime),
        "table" => draw_table_block(layer, fonts, block, page, row, runtime),
        "shape" => draw_shape_block(layer, block, page),
        "picture" => draw_picture_block(layer, block, page, row, runtime),
        "signature" => draw_signature_block(layer, fonts, block, page, row, runtime),
        "qrcode" => draw_qrcode_block(layer, block, page, row, runtime),
        "files" => draw_files_block(layer, fonts, block, page, row, runtime),
        _ => {}
    }
}

fn map_chrome_band(band: &Value, slot: &str, page_h: f32) -> Vec<Value> {
    let enabled = band
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if !enabled {
        return Vec::new();
    }
    let height = band
        .get("height")
        .and_then(|v| v.as_f64())
        .unwrap_or(64.0) as f32;
    let origin_y = if slot == "header" {
        0.0
    } else {
        (page_h - height).max(0.0)
    };
    let blocks = band
        .get("blocks")
        .and_then(|b| b.as_array())
        .cloned()
        .unwrap_or_default();
    blocks
        .into_iter()
        .map(|mut b| {
            if let Some(obj) = b.as_object_mut() {
                let y = obj.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                obj.insert("y".into(), Value::from(origin_y + y));
                obj.remove("pin");
            }
            b
        })
        .collect()
}

fn compose_chrome_blocks(project: &Value, page_h: f32) -> Vec<Value> {
    let Some(chrome) = project.get("pageChrome") else {
        return Vec::new();
    };
    let mut out = Vec::new();
    if let Some(header) = chrome.get("header") {
        out.extend(map_chrome_band(header, "header", page_h));
    }
    if let Some(footer) = chrome.get("footer") {
        out.extend(map_chrome_band(footer, "footer", page_h));
    }
    out
}

fn prepare_page_blocks(
    page: &Value,
    project: &Value,
    page_w: f32,
    page_h: f32,
    row: &Value,
    ctx: &RuntimeContext,
) -> Vec<FlatBlock> {
    let mut source = page
        .get("blocks")
        .and_then(|b| b.as_array())
        .cloned()
        .unwrap_or_default();
    let mut chrome = compose_chrome_blocks(project, page_h);
    chrome.append(&mut source);

    let mut flat = flatten_blocks(&chrome, row, ctx);
    let margins = page.get("margins");
    let pin_respects = page
        .get("pinRespectsMargins")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    for item in &mut flat {
        let rect = resolve_pinned_rect(
            &item.block,
            page_w,
            page_h,
            margins,
            pin_respects,
        );
        item.block = apply_layout_rect(&item.block, rect);
    }
    sort_by_effective_z(&mut flat);
    flat
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
    let project_lang = project.get("language").and_then(|v| v.as_str());
    let mut ctx = RuntimeContext::from_row_with_language(row, &output_val, false, project_lang);
    attach_project_datasets(project, &mut ctx, row);

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
    let doc = apply_emit_metadata(doc, project);
    let fonts = FontRegistry::load(&doc)?;

    for (vis_i, (_orig_i, page)) in visible.iter().enumerate() {
        let (w, h) = page_size_px(project, page);
        let (p_idx, l_idx) = if vis_i == 0 {
            (page_idx, layer_idx)
        } else {
            doc.add_page(px_to_mm(w), px_to_mm(h), format!("Page {}", vis_i + 1))
        };
        let layer = doc.get_page(p_idx).get_layer(l_idx);
        let page_ctx = PageCtx {
            page,
            page_w: w,
            page_h: h,
        };

        draw_page_background(&layer, page, w, h);
        draw_chrome_band_fills(&layer, project, h, w);

        let blocks = prepare_page_blocks(page, project, w, h, row, &ctx);
        for item in &blocks {
            let cond = item.block.get("condition").and_then(|v| v.as_str());
            if let Some(c) = cond {
                if !evaluate_condition(c, row, Some(&item.ctx)) {
                    continue;
                }
            }
            draw_block(
                &layer,
                &fonts,
                &item.block,
                &page_ctx,
                row,
                &item.ctx,
            );
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
    fn stamps_texlooper_producer_metadata() {
        let project = json!({
            "name": "Meta",
            "author": "Ada",
            "subject": "Trace test",
            "artboard": { "w": 200, "h": 200 },
            "pages": [{
                "id": "p1",
                "blocks": [{
                    "id": "b1",
                    "type": "text",
                    "x": 10, "y": 10, "w": 80, "h": 20,
                    "content": { "text": "hi" },
                    "style": { "fontSize": 12 }
                }]
            }],
            "outputs": [{ "id": "out-pdf", "kind": "pdf" }],
            "_texlooperEmit": {
                "instanceId": "11111111-2222-4333-8444-555555555555",
                "projectId": "proj-demo",
                "version": "0.0.0-test",
                "channel": "test"
            }
        });
        let bytes = render_project_pdf(&project, &json!({}), None).expect("pdf");
        let hay = String::from_utf8_lossy(&bytes);
        assert!(hay.contains("texLooper"), "creator/producer missing: {hay}");
        assert!(
            hay.contains("11111111-2222-4333-8444-555555555555"),
            "instance id missing"
        );
        assert!(hay.contains("X-TexLooper-Instance-Id="), "keyword missing");
    }

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
                    "style": { "fontSize": 14, "fontWeight": 700 }
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
    fn renders_pinned_shape() {
        let project = json!({
            "name": "Pin",
            "artboard": { "w": 714, "h": 1010 },
            "pages": [{
                "id": "p1",
                "blocks": [{
                    "id": "bar",
                    "type": "shape",
                    "x": 0, "y": 0, "w": 12, "h": 50,
                    "content": { "shape": "rect", "filled": true },
                    "style": { "background": "#006e46" },
                    "pin": { "left": true, "top": true, "bottom": true }
                }]
            }],
            "outputs": [{ "id": "out-pdf", "kind": "pdf" }]
        });
        let bytes = render_project_pdf(&project, &json!({}), None).expect("pdf");
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

    #[test]
    fn nowrap_keeps_single_line() {
        let (doc, _, _) = printpdf::PdfDocument::new("t", printpdf::Mm(100.0), printpdf::Mm(100.0), "L");
        let fonts = FontRegistry::load(&doc).expect("fonts");
        let style = resolve_style(&json!({
            "style": { "fontSize": 12, "whiteSpace": "nowrap", "fontFamily": "ui" }
        }));
        let lines = text_to_lines(
            "one two three four five six seven eight",
            &style,
            40.0,
            &fonts,
        );
        assert_eq!(lines.len(), 1);
    }

    #[test]
    fn list_marker_color_on_span() {
        let (doc, _, _) = printpdf::PdfDocument::new("t", printpdf::Mm(100.0), printpdf::Mm(100.0), "L");
        let fonts = FontRegistry::load(&doc).expect("fonts");
        let style = resolve_style(&json!({ "style": { "fontSize": 12, "listStyle": "disc" } }));
        let green = parse_hex_color("#006e46");
        let mut out = Vec::new();
        let mut counter = 0usize;
        flatten_list_lines(
            &[ListItem {
                text: "Item".into(),
                children: vec![],
            }],
            0,
            "disc",
            1,
            &style,
            200.0,
            green.as_ref(),
            &json!({}),
            &RuntimeContext::from_row_with_language(&json!({}), &json!({}), false, None),
            &fonts,
            &mut out,
            &mut counter,
        );
        assert_eq!(out.len(), 1);
        assert!(out[0].1.spans[0].color.is_some());
    }
}
