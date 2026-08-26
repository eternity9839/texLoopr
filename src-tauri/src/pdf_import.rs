//! PDF → Project structure import (ADR 0012).
//! Text + image placeholders; no auto-merge fields; no embedded bitmaps.

use lopdf::{Document, Object};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use thiserror::Error;
use uuid::Uuid;

const PT_TO_PX: f64 = 96.0 / 72.0;

#[derive(Debug, Error)]
pub enum PdfImportError {
    #[error("pdf: {0}")]
    Pdf(String),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("decode: {0}")]
    Decode(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfImportProgress {
    pub phase: String,
    pub page: u32,
    pub total: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfImportResult {
    pub project: Value,
    pub warnings: Vec<String>,
}

pub type ProgressFn = Box<dyn Fn(PdfImportProgress) + Send>;

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

fn pt_to_px(v: f64) -> i64 {
    (v * PT_TO_PX).round() as i64
}

fn media_box_size(doc: &Document, page_id: (u32, u16)) -> (f64, f64) {
    if let Ok(dict) = doc.get_dictionary(page_id) {
        if let Ok(Object::Array(arr)) = dict.get(b"MediaBox") {
            if arr.len() >= 4 {
                let nums: Vec<f64> = arr
                    .iter()
                    .filter_map(|o| match o {
                        Object::Integer(i) => Some(*i as f64),
                        Object::Real(r) => Some(*r as f64),
                        _ => None,
                    })
                    .collect();
                if nums.len() >= 4 {
                    let w = (nums[2] - nums[0]).abs();
                    let h = (nums[3] - nums[1]).abs();
                    if w > 1.0 && h > 1.0 {
                        return (w, h);
                    }
                }
            }
        }
    }
    (595.0, 842.0) // A4 fallback
}

fn extract_page_text(doc: &Document, page_id: (u32, u16)) -> String {
    // Best-effort: collect literal strings from the page content stream(s).
    let mut out = String::new();
    let Ok(content_data) = doc.get_page_content(page_id) else {
        return out;
    };
    let mut i = 0;
    let bytes = content_data;
    while i < bytes.len() {
        if bytes[i] == b'(' {
            i += 1;
            let mut s = String::new();
            while i < bytes.len() && bytes[i] != b')' {
                if bytes[i] == b'\\' && i + 1 < bytes.len() {
                    i += 1;
                }
                if bytes[i].is_ascii_graphic() || bytes[i] == b' ' {
                    s.push(bytes[i] as char);
                }
                i += 1;
            }
            if !s.trim().is_empty() {
                if !out.is_empty() {
                    out.push(' ');
                }
                out.push_str(s.trim());
            }
        }
        i += 1;
    }
    out
}

fn count_image_xobjects(doc: &Document, page_id: (u32, u16)) -> usize {
    let Ok(dict) = doc.get_dictionary(page_id) else {
        return 0;
    };
    let Ok(Object::Dictionary(resources)) = dict.get(b"Resources") else {
        // Resources may be a reference
        if let Ok(Object::Reference(r)) = dict.get(b"Resources") {
            if let Ok(Object::Dictionary(resources)) = doc.get_object(*r) {
                return count_xobject_images(doc, resources);
            }
        }
        return 0;
    };
    count_xobject_images(doc, resources)
}

fn count_xobject_images(doc: &Document, resources: &lopdf::Dictionary) -> usize {
    let xobj = match resources.get(b"XObject") {
        Ok(Object::Dictionary(d)) => d,
        Ok(Object::Reference(r)) => match doc.get_object(*r) {
            Ok(Object::Dictionary(d)) => d,
            _ => return 0,
        },
        _ => return 0,
    };
    let mut n = 0;
    for (_, v) in xobj.iter() {
        let obj = match v {
            Object::Reference(r) => doc.get_object(*r).ok(),
            other => Some(other),
        };
        if let Some(Object::Stream(stream)) = obj {
            if let Ok(Object::Name(subtype)) = stream.dict.get(b"Subtype") {
                if subtype == b"Image" {
                    n += 1;
                }
            }
        }
    }
    n
}

fn text_block(name: &str, text: &str, x: i64, y: i64, w: i64, h: i64, z: i64) -> Value {
    json!({
        "id": new_id(),
        "type": "paragraph",
        "name": name,
        "x": x,
        "y": y,
        "w": w,
        "h": h,
        "zIndex": z,
        "content": { "text": text },
        "style": {
            "fontSize": 12,
            "color": "#1c2430",
            "lineHeight": 1.4
        }
    })
}

fn picture_placeholder(name: &str, x: i64, y: i64, w: i64, h: i64, z: i64) -> Value {
    json!({
        "id": new_id(),
        "type": "picture",
        "name": name,
        "x": x,
        "y": y,
        "w": w,
        "h": h,
        "zIndex": z,
        "content": {
            "src": "",
            "alt": "Image placeholder",
            "fit": "contain",
            "placeholder": true
        },
        "style": {
            "background": "transparent",
            "borderWidth": 1,
            "borderColor": "#9a9288",
            "borderStyle": "dashed"
        }
    })
}

/// Import PDF bytes into a new Project JSON (structure pass).
pub fn import_pdf_structure(
    bytes: &[u8],
    progress: Option<&ProgressFn>,
) -> Result<PdfImportResult, PdfImportError> {
    let doc = Document::load_mem(bytes).map_err(|e| PdfImportError::Pdf(e.to_string()))?;
    let pages = doc.get_pages();
    let total = pages.len() as u32;
    if total == 0 {
        return Err(PdfImportError::Pdf("PDF has no pages".into()));
    }

    if let Some(cb) = progress {
        cb(PdfImportProgress {
            phase: "start".into(),
            page: 0,
            total,
        });
    }

    let mut warnings = Vec::new();
    warnings.push(
        "Structure import: text is approximate; images are empty placeholders; no merge fields were inferred."
            .into(),
    );

    let mut project_pages = Vec::new();
    let mut first_w = 720i64;
    let mut first_h = 960i64;
    let mut page_index = 0u32;

    for (_num, page_id) in pages.iter() {
        page_index += 1;
        if let Some(cb) = progress {
            cb(PdfImportProgress {
                phase: "page".into(),
                page: page_index,
                total,
            });
        }

        let (pt_w, pt_h) = media_box_size(&doc, *page_id);
        let w = pt_to_px(pt_w).max(100);
        let h = pt_to_px(pt_h).max(100);
        if page_index == 1 {
            first_w = w;
            first_h = h;
        }

        let mut blocks = Vec::new();
        let text = extract_page_text(&doc, *page_id);
        if text.trim().is_empty() {
            warnings.push(format!(
                "Page {page_index}: little or no extractable text (may be image-only)."
            ));
        } else {
            let margin = 40i64;
            blocks.push(text_block(
                &format!("Page {page_index} text"),
                &text,
                margin,
                margin,
                (w - margin * 2).max(40),
                (h - margin * 2).max(40),
                2,
            ));
        }

        let img_count = count_image_xobjects(&doc, *page_id);
        if img_count > 0 {
            // Stack placeholders along the top; do not copy bitmap data.
            let slot_w = (w - 80) / (img_count as i64).min(4).max(1);
            let slot_h = 120i64;
            for i in 0..img_count {
                let col = (i as i64) % 4;
                let row = (i as i64) / 4;
                blocks.push(picture_placeholder(
                    &format!("Image placeholder {}", i + 1),
                    40 + col * slot_w,
                    40 + row * (slot_h + 12),
                    (slot_w - 12).max(40),
                    slot_h,
                    1,
                ));
            }
            warnings.push(format!(
                "Page {page_index}: {img_count} image region(s) replaced with placeholders."
            ));
        }

        if blocks.is_empty() {
            blocks.push(text_block(
                &format!("Page {page_index} placeholder"),
                "[No extractable text on this page — replace with your content]",
                40,
                40,
                (w - 80).max(40),
                80,
                2,
            ));
        }

        project_pages.push(json!({
            "id": new_id(),
            "name": format!("Page {page_index}"),
            "width": w,
            "height": h,
            "blocks": blocks,
            "background": "#ffffff",
            "margins": { "top": 40, "right": 40, "bottom": 40, "left": 40 }
        }));
    }

    let active = project_pages
        .first()
        .and_then(|p| p.get("id"))
        .cloned()
        .unwrap_or(json!(new_id()));

    let artboard = if first_w > first_h + 40 {
        "landscape"
    } else if (first_w - 714).abs() < 40 && (first_h - 1010).abs() < 80 {
        "a4"
    } else {
        "document"
    };

    let project = json!({
        "name": "Imported PDF",
        "author": "",
        "subject": "Structure import from PDF",
        "description": "Generated by pdf_import_structure (ADR 0012). Bind fields manually.",
        "published": false,
        "lastSaved": null,
        "pages": project_pages,
        "activePageId": active,
        "artboard": artboard,
        "outputs": [{
            "id": "out-pdf",
            "name": "PDF",
            "kind": "pdf",
            "enabled": true
        }],
        "activeOutputId": "out-pdf",
        "workflow": [
            { "id": "s-bind", "name": "Bind", "type": "bind" },
            { "id": "s-render", "name": "Render", "type": "render" },
            { "id": "s-emit", "name": "Emit", "type": "emit" }
        ]
    });

    if let Some(cb) = progress {
        cb(PdfImportProgress {
            phase: "done".into(),
            page: total,
            total,
        });
    }

    Ok(PdfImportResult { project, warnings })
}

pub fn import_pdf_from_path(
    path: &std::path::Path,
    progress: Option<&ProgressFn>,
) -> Result<PdfImportResult, PdfImportError> {
    let bytes = std::fs::read(path)?;
    import_pdf_structure(&bytes, progress)
}

pub fn import_pdf_from_base64(
    b64: &str,
    progress: Option<&ProgressFn>,
) -> Result<PdfImportResult, PdfImportError> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64.trim())
        .map_err(|e| PdfImportError::Decode(e.to_string()))?;
    import_pdf_structure(&bytes, progress)
}

#[cfg(test)]
mod tests {
    use super::*;
    use printpdf::PdfDocument;

    fn tiny_pdf_bytes() -> Vec<u8> {
        let (doc, page, layer) = PdfDocument::new("fixture", printpdf::Mm(210.0), printpdf::Mm(297.0), "Layer");
        let font = doc.add_builtin_font(printpdf::BuiltinFont::Helvetica).unwrap();
        let layer = doc.get_page(page).get_layer(layer);
        layer.use_text("Hello structure import", 14.0, printpdf::Mm(20.0), printpdf::Mm(270.0), &font);
        doc.save_to_bytes().unwrap()
    }

    #[test]
    fn imports_pages_and_text() {
        let bytes = tiny_pdf_bytes();
        let result = import_pdf_structure(&bytes, None).expect("import");
        let pages = result.project.get("pages").and_then(|p| p.as_array()).unwrap();
        assert_eq!(pages.len(), 1);
        assert!(!result.warnings.is_empty());
        let blocks = pages[0].get("blocks").and_then(|b| b.as_array()).unwrap();
        assert!(!blocks.is_empty());
    }

    #[test]
    fn pt_to_px_scaling() {
        assert_eq!(pt_to_px(72.0), 96);
        assert_eq!(pt_to_px(595.0), 793);
    }
}
