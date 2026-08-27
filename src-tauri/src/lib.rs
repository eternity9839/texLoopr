mod build_info;
mod data;
pub mod data_sources;
pub mod db;
pub mod pdf_import;
pub mod render_assets;
pub mod render_batch;
pub mod render_data;
pub mod render_fonts;
pub mod render_layout;
pub mod render_pdf;
pub mod render_richtext;
pub mod render_style;
pub mod template;
pub mod workflow;
pub mod api;
pub mod catalog_store;

#[cfg(feature = "desktop")]
mod desktop;
#[cfg(feature = "desktop")]
mod frontend_server;

#[cfg(feature = "desktop")]
pub fn run() {
    desktop::run();
}
