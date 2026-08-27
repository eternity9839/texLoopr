//! Embedded font presets — loads TTF from shared `assets/fonts/`.

use crate::render_assets::{file_bytes, font_path, load_render_parity};
use crate::render_richtext::{LayoutLine, StyledSpan};
use crate::render_style::ResolvedStyle;
use fontdue::Font;
use printpdf::{BuiltinFont, IndirectFontRef, PdfDocumentReference};
use std::collections::HashMap;
use std::io::Cursor;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum FontError {
    #[error("font: {0}")]
    Msg(String),
}

struct FontSlot {
    pdf: IndirectFontRef,
    metrics: Font,
}

pub struct FontRegistry {
    slots: HashMap<String, FontSlot>,
    fallback: FontSlot,
    fallback_bold: FontSlot,
    fallback_italic: FontSlot,
    fallback_bold_italic: FontSlot,
}

impl FontRegistry {
    pub fn load(doc: &PdfDocumentReference) -> Result<Self, FontError> {
        let fallback = load_builtin_slot(doc, BuiltinFont::Helvetica)?;
        let fallback_bold = load_builtin_slot(doc, BuiltinFont::HelveticaBold)?;
        let fallback_italic = load_builtin_slot(doc, BuiltinFont::HelveticaOblique)?;
        let fallback_bold_italic = load_builtin_slot(doc, BuiltinFont::HelveticaBoldOblique)?;

        let mut slots = HashMap::new();
        if let Some(manifest) = load_render_parity() {
            if let Some(fonts) = manifest.get("fonts").and_then(|v| v.as_object()) {
                for (preset, slots_obj) in fonts {
                    if let Some(map) = slots_obj.as_object() {
                        for (slot, rel) in map {
                            if let Some(path) = rel.as_str() {
                                let key = format!("{preset}:{slot}");
                                if let Some(entry) = load_ttf_slot(doc, path) {
                                    slots.insert(key, entry);
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(Self {
            slots,
            fallback,
            fallback_bold,
            fallback_italic,
            fallback_bold_italic,
        })
    }

    pub fn embedded_count(&self) -> usize {
        self.slots.len()
    }

    pub fn pick(&self, preset: &str, weight: u32, italic: bool) -> &IndirectFontRef {
        &self.pick_slot(preset, weight, italic).pdf
    }

    fn pick_slot(&self, preset: &str, weight: u32, italic: bool) -> &FontSlot {
        let slot = if italic && weight >= 600 {
            "boldItalic"
        } else if italic {
            "italic"
        } else if weight >= 700 {
            "bold"
        } else if weight >= 600 {
            "semibold"
        } else {
            "regular"
        };
        let key = format!("{preset}:{slot}");
        self.slots.get(&key).unwrap_or_else(|| {
            if italic && weight >= 600 {
                &self.fallback_bold_italic
            } else if italic {
                &self.fallback_italic
            } else if weight >= 600 {
                &self.fallback_bold
            } else {
                &self.fallback
            }
        })
    }

    pub fn text_ascent(&self, preset: &str, weight: u32, italic: bool, font_size: f32) -> f32 {
        self.pick_slot(preset, weight, italic)
            .metrics
            .horizontal_line_metrics(font_size)
            .map(|m| m.ascent)
            .unwrap_or(font_size * 0.82)
    }

    pub fn measure_text(
        &self,
        text: &str,
        preset: &str,
        weight: u32,
        italic: bool,
        font_size: f32,
        letter_spacing: f32,
    ) -> f32 {
        if text.is_empty() {
            return 0.0;
        }
        let slot = self.pick_slot(preset, weight, italic);
        let mut w = 0.0f32;
        for ch in text.chars() {
            let (metrics, _) = slot.metrics.rasterize(ch, font_size);
            w += metrics.advance_width + letter_spacing;
        }
        w
    }

    pub fn measure_spans(
        &self,
        spans: &[StyledSpan],
        style: &ResolvedStyle,
        font_size: f32,
        letter_spacing: f32,
    ) -> f32 {
        spans
            .iter()
            .map(|s| {
                let weight = if s.bold || style.font_weight >= 600 {
                    700
                } else {
                    style.font_weight
                };
                let italic = s.italic || style.font_style == "italic";
                self.measure_text(&s.text, &style.font_family, weight, italic, font_size, letter_spacing)
            })
            .sum()
    }

    /// Word-wrap styled spans using real glyph advances.
    pub fn wrap_spans(
        &self,
        spans: &[StyledSpan],
        max_width: f32,
        style: &ResolvedStyle,
    ) -> Vec<LayoutLine> {
        let font_size = style.font_size;
        let letter_spacing = style.letter_spacing;
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

        let span_width = |span: &StyledSpan| {
            let weight = if span.bold || style.font_weight >= 600 {
                700
            } else {
                style.font_weight
            };
            let italic = span.italic || style.font_style == "italic";
            self.measure_text(
                &span.text,
                &style.font_family,
                weight,
                italic,
                font_size,
                letter_spacing,
            )
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
                let ww = span_width(&word_span);
                let space_w = if current.is_empty() {
                    0.0
                } else {
                    self.measure_text(
                        " ",
                        &style.font_family,
                        style.font_weight,
                        false,
                        font_size,
                        letter_spacing,
                    )
                };
                let trial_w = if current.is_empty() { ww } else { current_w + space_w + ww };
                if !current.is_empty() && trial_w > max_width {
                    push_line(&mut lines, &mut current, &mut current_w);
                }
                if ww > max_width && current.is_empty() {
                    let mut chunk = String::new();
                    for ch in word.chars() {
                        let trial = format!("{chunk}{ch}");
                        let tw = self.measure_text(
                            &trial,
                            &style.font_family,
                            if span.bold || style.font_weight >= 600 {
                                700
                            } else {
                                style.font_weight
                            },
                            span.italic || style.font_style == "italic",
                            font_size,
                            letter_spacing,
                        );
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
                            current_w = self.measure_spans(&current, style, font_size, letter_spacing);
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
                        current_w = self.measure_spans(&current, style, font_size, letter_spacing);
                    }
                    continue;
                }
                if !current.is_empty() {
                    current.push(StyledSpan {
                        text: " ".into(),
                        bold: false,
                        italic: false,
                        underline: false,
                        strike: false,
                        link_url: None,
                        color: None,
                    });
                    current_w += space_w;
                }
                current.push(word_span);
                current_w += ww;
            }
        }
        push_line(&mut lines, &mut current, &mut current_w);
        lines
    }
}

fn split_words(text: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut cur = String::new();
    for ch in text.chars() {
        if ch.is_whitespace() {
            if !cur.is_empty() {
                words.push(cur.clone());
                cur.clear();
            }
        } else {
            cur.push(ch);
        }
    }
    if !cur.is_empty() {
        words.push(cur);
    }
    if words.is_empty() && !text.is_empty() {
        words.push(text.to_string());
    }
    words
}

fn load_builtin_slot(doc: &PdfDocumentReference, builtin: BuiltinFont) -> Result<FontSlot, FontError> {
    let pdf = doc
        .add_builtin_font(builtin)
        .map_err(|e| FontError::Msg(e.to_string()))?;
    let metrics = load_metrics_font("fonts/inter-latin-400-normal.ttf").ok_or_else(|| {
        FontError::Msg("metrics fallback font missing — run npm run sync:render-assets".into())
    })?;
    Ok(FontSlot { pdf, metrics })
}

fn load_metrics_font(relative: &str) -> Option<Font> {
    let bytes = file_bytes(&font_path(relative))?;
    Font::from_bytes(bytes, fontdue::FontSettings::default()).ok()
}

fn load_ttf_slot(doc: &PdfDocumentReference, relative: &str) -> Option<FontSlot> {
    let path = font_path(relative);
    let bytes = file_bytes(&path)?;
    let mut cursor = Cursor::new(bytes.clone());
    let pdf = doc.add_external_font(&mut cursor).ok()?;
    let metrics = Font::from_bytes(
        bytes,
        fontdue::FontSettings {
            scale: fontdue::FontSettings::default().scale,
            ..fontdue::FontSettings::default()
        },
    )
    .ok()?;
    Some(FontSlot { pdf, metrics })
}

#[cfg(test)]
mod tests {
    use super::*;
    use printpdf::PdfDocument;

    #[test]
    fn loads_registry_with_embedded_fonts() {
        let (doc, _, _) = PdfDocument::new("f", printpdf::Mm(100.0), printpdf::Mm(100.0), "L");
        let reg = FontRegistry::load(&doc).expect("fonts");
        assert!(reg.embedded_count() >= 20, "expected TTF presets under assets/fonts");
        let w = reg.measure_text("Hello", "ui", 400, false, 14.0, 0.0);
        assert!(w > 20.0 && w < 80.0, "unexpected width {w}");
    }
}
