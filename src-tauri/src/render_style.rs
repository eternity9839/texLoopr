//! BlockStyle resolution — mirrors `styleFromBlock()` in the web editor.

use printpdf::Color;
use printpdf::Rgb;
use serde_json::Value;

pub const PX_TO_PT: f32 = 72.0 / 96.0;

#[derive(Clone, Debug)]
pub struct ResolvedStyle {
    pub font_size: f32,
    pub font_weight: u32,
    pub font_style: String,
    pub text_decoration: String,
    pub color: Option<Color>,
    pub text_align: String,
    pub text_indent: f32,
    pub line_height: f32,
    pub letter_spacing: f32,
    pub text_transform: String,
    pub background: Option<Color>,
    pub border_radius: f32,
    pub border_width: f32,
    pub border_color: Option<Color>,
    pub opacity: f32,
    pub padding: f32,
    pub margin: f32,
    pub vertical_align: String,
    pub list_style: String,
    pub font_family: String,
    pub white_space: String,
    pub shadow: bool,
    pub rotate: f32,
    pub mirror_x: bool,
    pub mirror_y: bool,
}

impl Default for ResolvedStyle {
    fn default() -> Self {
        Self {
            font_size: 14.0,
            font_weight: 400,
            font_style: "normal".into(),
            text_decoration: "none".into(),
            color: parse_hex_color("#2a2622"),
            text_align: "left".into(),
            text_indent: 0.0,
            line_height: 1.4,
            letter_spacing: 0.0,
            text_transform: "none".into(),
            background: None,
            border_radius: 0.0,
            border_width: 0.0,
            border_color: None,
            opacity: 1.0,
            padding: 0.0,
            margin: 0.0,
            vertical_align: "top".into(),
            list_style: "disc".into(),
            font_family: "doc".into(),
            white_space: "pre-wrap".into(),
            shadow: false,
            rotate: 0.0,
            mirror_x: false,
            mirror_y: false,
        }
    }
}

pub fn parse_hex_color(raw: &str) -> Option<Color> {
    let hex = raw.trim().trim_start_matches('#');
    if hex.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&hex[0..2], 16).ok()? as f32 / 255.0;
    let g = u8::from_str_radix(&hex[2..4], 16).ok()? as f32 / 255.0;
    let b = u8::from_str_radix(&hex[4..6], 16).ok()? as f32 / 255.0;
    Some(Color::Rgb(Rgb::new(r, g, b, None)))
}

pub fn apply_opacity(color: Color, opacity: f32) -> Color {
    if opacity >= 0.999 {
        return color;
    }
    match color {
        Color::Rgb(rgb) => {
            let r = rgb.r * opacity + (1.0 - opacity);
            let g = rgb.g * opacity + (1.0 - opacity);
            let b = rgb.b * opacity + (1.0 - opacity);
            Color::Rgb(Rgb::new(r, g, b, None))
        }
        other => other,
    }
}

fn style_f32(block: &Value, key: &str, default: f32) -> f32 {
    block
        .get("style")
        .and_then(|s| s.get(key))
        .and_then(|v| v.as_f64())
        .map(|n| n as f32)
        .unwrap_or(default)
}

fn style_str(block: &Value, key: &str, default: &str) -> String {
    block
        .get("style")
        .and_then(|s| s.get(key))
        .and_then(|v| v.as_str())
        .unwrap_or(default)
        .to_string()
}

fn style_bool(block: &Value, key: &str, default: bool) -> bool {
    block
        .get("style")
        .and_then(|s| s.get(key))
        .and_then(|v| v.as_bool())
        .unwrap_or(default)
}

pub fn parse_font_weight(raw: &Value) -> u32 {
    if let Some(n) = raw.as_f64() {
        return n.round() as u32;
    }
    if let Some(s) = raw.as_str() {
        return match s.trim().to_lowercase().as_str() {
            "bold" | "bolder" => 700,
            "semibold" | "demibold" => 600,
            "medium" => 500,
            "normal" | "regular" => 400,
            "light" => 300,
            _ => s.parse::<u32>().unwrap_or(400),
        };
    }
    400
}

pub fn resolve_style(block: &Value) -> ResolvedStyle {
    let opacity = style_f32(block, "opacity", 1.0).clamp(0.0, 1.0);
    let bg_raw = block
        .get("style")
        .and_then(|s| s.get("background"))
        .and_then(|v| v.as_str())
        .unwrap_or("transparent");
    let background = if bg_raw.eq_ignore_ascii_case("transparent") {
        None
    } else {
        parse_hex_color(bg_raw).map(|c| apply_opacity(c, opacity))
    };
    let font_weight = block
        .get("style")
        .and_then(|s| s.get("fontWeight"))
        .map(parse_font_weight)
        .unwrap_or(400);

    ResolvedStyle {
        font_size: style_f32(block, "fontSize", 14.0),
        font_weight,
        font_style: style_str(block, "fontStyle", "normal"),
        text_decoration: style_str(block, "textDecoration", "none"),
        color: block
            .get("style")
            .and_then(|s| s.get("color"))
            .and_then(|v| v.as_str())
            .and_then(parse_hex_color)
            .map(|c| apply_opacity(c, opacity)),
        text_align: style_str(block, "textAlign", "left"),
        text_indent: style_f32(block, "textIndent", 0.0),
        line_height: style_f32(block, "lineHeight", 1.4).max(0.5),
        letter_spacing: style_f32(block, "letterSpacing", 0.0),
        text_transform: style_str(block, "textTransform", "none"),
        background,
        border_radius: style_f32(block, "borderRadius", 0.0),
        border_width: style_f32(block, "borderWidth", 0.0),
        border_color: block
            .get("style")
            .and_then(|s| s.get("borderColor"))
            .and_then(|v| v.as_str())
            .and_then(parse_hex_color)
            .map(|c| apply_opacity(c, opacity)),
        opacity,
        padding: style_f32(block, "padding", 0.0),
        margin: style_f32(block, "margin", 0.0),
        vertical_align: style_str(block, "verticalAlign", "top"),
        list_style: style_str(block, "listStyle", "disc"),
        font_family: style_str(block, "fontFamily", "doc"),
        white_space: style_str(block, "whiteSpace", "pre-wrap"),
        shadow: style_bool(block, "shadow", false),
        rotate: style_f32(block, "rotate", 0.0),
        mirror_x: style_bool(block, "mirrorX", false),
        mirror_y: style_bool(block, "mirrorY", false),
    }
}

/// Approximate char width factor per font preset (until glyph metrics wired).
pub fn char_width_factor(preset: &str, bold: bool) -> f32 {
    let base = match preset {
        "display" => 0.54,
        "doc" => 0.48,
        "mono" => 0.56,
        "inter" | "ui" => 0.52,
        _ => 0.52,
    };
    if bold {
        base * 1.06
    } else {
        base
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_bold_weight_string() {
        assert_eq!(parse_font_weight(&json!("bold")), 700);
    }

    #[test]
    fn defaults_white_space_pre_wrap() {
        let block = json!({ "style": { "fontSize": 12 } });
        assert_eq!(resolve_style(&block).white_space, "pre-wrap");
    }
}
