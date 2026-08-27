//! Inline rich text parsing and line layout (mirrors `richText.tsx`).

use crate::render_style::char_width_factor;

#[derive(Clone, Debug, PartialEq)]
pub enum InlineNode {
    Text(String),
    Strong(Vec<InlineNode>),
    Em(Vec<InlineNode>),
    Underline(Vec<InlineNode>),
    Del(Vec<InlineNode>),
    Link { label: String, href: String },
}

#[derive(Clone, Debug, PartialEq)]
pub struct StyledSpan {
    pub text: String,
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
    pub strike: bool,
    pub link_url: Option<String>,
    /// Per-span ink override (list markers, etc.)
    pub color: Option<printpdf::Color>,
}

pub fn parse_inline_rich_text(text: &str) -> Vec<InlineNode> {
    let mut nodes = Vec::new();
    let mut i = 0;
    let bytes = text.as_bytes();
    while i < bytes.len() {
        let special = next_special_index(text, i);
        if special < 0 {
            if i < bytes.len() {
                nodes.push(InlineNode::Text(text[i..].to_string()));
            }
            break;
        }
        if special > i as i32 {
            nodes.push(InlineNode::Text(text[i..special as usize].to_string()));
            i = special as usize;
        }
        if let Some((node, next)) = try_link(text, i) {
            nodes.push(node);
            i = next;
            continue;
        }
        if let Some((node, next)) = try_marker(text, i) {
            nodes.push(node);
            i = next;
            continue;
        }
        let ch = text[i..].chars().next().unwrap_or(' ');
        nodes.push(InlineNode::Text(ch.to_string()));
        i += ch.len_utf8();
    }
    if nodes.is_empty() {
        nodes.push(InlineNode::Text(text.to_string()));
    }
    nodes
}

fn next_special_index(text: &str, from: usize) -> i32 {
    let chars = ['[', '*', '_', '+', '~'];
    let mut next = -1i32;
    for ch in chars {
        if let Some(idx) = text[from..].find(ch) {
            let abs = from + idx;
            if next < 0 || (abs as i32) < next {
                next = abs as i32;
            }
        }
    }
    next
}

fn try_link(text: &str, i: usize) -> Option<(InlineNode, usize)> {
    let slice = &text[i..];
    if !slice.starts_with('[') {
        return None;
    }
    let rest = &slice[1..];
    let label_end = rest.find(']')?;
    let label = &rest[..label_end];
    let after = &rest[label_end + 1..];
    if !after.starts_with('(') {
        return None;
    }
    let url_end = after[1..].find(')')?;
    let href = &after[1..1 + url_end];
    Some((
        InlineNode::Link {
            label: label.to_string(),
            href: href.to_string(),
        },
        i + 1 + label.len() + 1 + 1 + href.len() + 1,
    ))
}

fn try_marker(text: &str, i: usize) -> Option<(InlineNode, usize)> {
    const MARKERS: [(&str, &str, fn(Vec<InlineNode>) -> InlineNode); 6] = [
        ("***", "***", |c| InlineNode::Strong(vec![InlineNode::Em(c)])),
        ("**", "**", InlineNode::Strong),
        ("++", "++", InlineNode::Underline),
        ("~~", "~~", InlineNode::Del),
        ("*", "*", InlineNode::Em),
        ("_", "_", InlineNode::Em),
    ];
    for (open, close, wrap) in MARKERS {
        if !text[i..].starts_with(open) {
            continue;
        }
        if open == "*" && text[i..].starts_with("**") {
            continue;
        }
        if open == "**" && text[i..].starts_with("***") {
            continue;
        }
        let inner_start = i + open.len();
        let close_at = text[inner_start..].find(close)? + inner_start;
        let inner = &text[inner_start..close_at];
        let children = parse_inline_rich_text(inner);
        return Some((wrap(children), close_at + close.len()));
    }
    None
}

pub fn flatten_spans(nodes: &[InlineNode]) -> Vec<StyledSpan> {
    let mut out = Vec::new();
    for node in nodes {
        flatten_node(node, false, false, false, false, &mut out);
    }
    out.retain(|s| !s.text.is_empty());
    out
}

fn flatten_node(
    node: &InlineNode,
    bold: bool,
    italic: bool,
    underline: bool,
    strike: bool,
    out: &mut Vec<StyledSpan>,
) {
    match node {
        InlineNode::Text(t) => {
            out.push(StyledSpan {
                text: t.clone(),
                bold,
                italic,
                underline,
                strike,
                link_url: None,
                color: None,
            });
        }
        InlineNode::Strong(children) => {
            for c in children {
                flatten_node(c, true, italic, underline, strike, out);
            }
        }
        InlineNode::Em(children) => {
            for c in children {
                flatten_node(c, bold, true, underline, strike, out);
            }
        }
        InlineNode::Underline(children) => {
            for c in children {
                flatten_node(c, bold, italic, true, strike, out);
            }
        }
        InlineNode::Del(children) => {
            for c in children {
                flatten_node(c, bold, italic, underline, true, out);
            }
        }
        InlineNode::Link { label, href } => {
            let inner = parse_inline_rich_text(label);
            for c in &inner {
                flatten_node(c, bold, italic, true, strike, out);
            }
            if let Some(last) = out.last_mut() {
                last.link_url = Some(href.clone());
            }
        }
    }
}

pub fn apply_text_transform(text: &str, transform: &str) -> String {
    match transform {
        "uppercase" => text.to_uppercase(),
        "lowercase" => text.to_lowercase(),
        "capitalize" => text
            .split_whitespace()
            .map(|w| {
                let mut chars = w.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => {
                        first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase()
                    }
                }
            })
            .collect::<Vec<_>>()
            .join(" "),
        _ => text.to_string(),
    }
}

pub fn char_width(font_size: f32, bold: bool, letter_spacing: f32, preset: &str) -> f32 {
    font_size * char_width_factor(preset, bold) + letter_spacing
}

pub fn measure_spans(
    spans: &[StyledSpan],
    font_size: f32,
    letter_spacing: f32,
    preset: &str,
) -> f32 {
    spans
        .iter()
        .map(|s| {
            s.text
                .chars()
                .map(|_| char_width(font_size, s.bold, letter_spacing, preset))
                .sum::<f32>()
        })
        .sum()
}

#[derive(Clone, Debug)]
pub struct LayoutLine {
    pub spans: Vec<StyledSpan>,
    pub width: f32,
}

/// Word-wrap styled spans to fit `max_width`.
pub fn wrap_spans(
    spans: &[StyledSpan],
    max_width: f32,
    font_size: f32,
    letter_spacing: f32,
    preset: &str,
) -> Vec<LayoutLine> {
    let max_width = max_width.max(font_size * 2.0);
    let mut lines: Vec<LayoutLine> = Vec::new();
    let mut current: Vec<StyledSpan> = Vec::new();
    let mut current_w = 0.0f32;

    let push_line = |lines: &mut Vec<LayoutLine>, current: &mut Vec<StyledSpan>, w: &mut f32| {
        if !current.is_empty() {
            lines.push(LayoutLine {
                spans: current.clone(),
                width: *w,
            });
            current.clear();
            *w = 0.0;
        }
    };

    for span in spans {
        for word in split_words(&span.text) {
            let word_span = StyledSpan {
                text: word.clone(),
                bold: span.bold,
                italic: span.italic,
                underline: span.underline,
                strike: span.strike,
                link_url: span.link_url.clone(),
                color: span.color.clone(),
            };
            let ww = measure_spans(std::slice::from_ref(&word_span), font_size, letter_spacing, preset);
            let trial_w = if current.is_empty() {
                ww
            } else {
                current_w + char_width(font_size, false, letter_spacing, preset) + ww
            };
            if !current.is_empty() && trial_w > max_width {
                push_line(&mut lines, &mut current, &mut current_w);
            }
            if ww > max_width && current.is_empty() {
                let mut chunk = String::new();
                for ch in word.chars() {
                    let trial = StyledSpan {
                        text: format!("{chunk}{ch}"),
                        bold: span.bold,
                        italic: span.italic,
                        underline: span.underline,
                        strike: span.strike,
                        link_url: span.link_url.clone(),
                        color: span.color.clone(),
                    };
                    let tw = measure_spans(std::slice::from_ref(&trial), font_size, letter_spacing, preset);
                    if !chunk.is_empty() && tw > max_width {
                        current.push(StyledSpan {
                            text: chunk.clone(),
                            bold: span.bold,
                            italic: span.italic,
                            underline: span.underline,
                            strike: span.strike,
                            link_url: span.link_url.clone(),
                            color: span.color.clone(),
                        });
                        current_w = measure_spans(&current, font_size, letter_spacing, preset);
                        push_line(&mut lines, &mut current, &mut current_w);
                        chunk.clear();
                    }
                    chunk.push(ch);
                }
                if !chunk.is_empty() {
                    current.push(StyledSpan {
                        text: chunk,
                        bold: span.bold,
                        italic: span.italic,
                        underline: span.underline,
                        strike: span.strike,
                        link_url: span.link_url.clone(),
                        color: span.color.clone(),
                    });
                    current_w = measure_spans(&current, font_size, letter_spacing, preset);
                }
                continue;
            }
            if !current.is_empty() {
                current.push(StyledSpan {
                    text: " ".to_string(),
                    bold: false,
                    italic: false,
                    underline: false,
                    strike: false,
                    link_url: None,
                    color: None,
                });
                current_w += char_width(font_size, false, letter_spacing, preset);
            }
            current.push(word_span);
            current_w += ww;
        }
    }
    push_line(&mut lines, &mut current, &mut current_w);
    lines
}

fn split_words(text: &str) -> Vec<String> {
    let mut words = Vec::new();
    for paragraph in text.split('\n') {
        let parts: Vec<&str> = paragraph.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }
        words.extend(parts.iter().map(|s| s.to_string()));
    }
    if words.is_empty() && !text.is_empty() {
        words.push(text.to_string());
    }
    words
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_bold_and_link() {
        let nodes = parse_inline_rich_text("Hello **world** [x](https://a.test)");
        let spans = flatten_spans(&nodes);
        assert!(spans.iter().any(|s| s.bold && s.text == "world"));
        assert!(spans.iter().any(|s| s.underline && s.text == "x"));
    }

    #[test]
    fn wraps_styled_text() {
        let spans = vec![StyledSpan {
            text: "one two three four five six".to_string(),
            bold: false,
            italic: false,
            underline: false,
            strike: false,
            link_url: None,
            color: None,
        }];
        let lines = wrap_spans(&spans, 80.0, 12.0, 0.0, "doc");
        assert!(lines.len() > 1);
    }
}
