# Visual QA checklist (calm document studio)

- [ ] 1280×800: Context bar + Edit studio (navigator, toolbox, paper, inspector)
- [ ] 900×600: Studio switch usable; panels do not crush canvas
- [ ] Studio switch: Edit ↔ Data only (no Preview tab); comfortable shows labels
- [ ] Preview button / `Ctrl+.` toggles preview; Exit preview returns to editing
- [ ] While previewing: toolbox/inspector hidden; row picker visible; canvas read-only
- [ ] Overflow ··· opens Settings / About overlays; Escape closes; focus returns
- [ ] Settings → Appearance: Stone (default) / Nova / Mist / Dusk; paper stays light
- [ ] Right-click empty page → create menu; toolbox click inserts block
- [ ] Data Apply / Automation Run use Rust when Tauri is present
- [ ] About shows runtime backbone (rust on Tauri, javascript on web)
- [ ] Save status: Autosaved locally vs catalog stamp
- [ ] First viewport reads as light document studio (Stone default)
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass; `cargo test` in src-tauri
- [ ] `npm run tauri:dev` loads UI on :1420 against Rust catalog + engines
