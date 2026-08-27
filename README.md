# texLooper

Closed-source document studio for tailored bulk documents via templating and simple data formats. Runs on the web (official or in-house API), as a Tauri desktop app, and against a shared Rust backend (ADR 0016).

Hosted demo (Orange Pi): see [deploy/orangepi/README.md](deploy/orangepi/README.md).  
In-house / official API + SPA: see [deploy/inhouse/README.md](deploy/inhouse/README.md).  
Public via **Pangolin Newt** (NixOS systemd) → `http://127.0.0.1:8788`.  
Architecture: [ADR 0011](architecture/adr/0011-hosted-demo-deploy.md) · [ADR 0016](architecture/adr/0016-unified-rust-service-topologies.md).

## Requirements

Use the Nix flake (recommended):

```fish
direnv allow          # uses flake via .envrc
# or: nix develop
# legacy: nix-shell shell.nix
npm install
```

Without Nix you need Node 22+, Rust, and (for Tauri on Linux) WebKitGTK / GTK3.

## Develop

```fish
npm run dev          # web UI on http://localhost:1420
npm run tauri:dev    # desktop app (SQLite catalog in app data dir)
npm run typecheck
npm run test
npm run build
npm run build:tauri   # production SPA bundle embedded in the desktop shell
```

Build the desktop app (Linux `.deb` / `.rpm`; AppImage is CI-only — it often fails under NixOS):

```fish
nix develop -c npm run desktop          # deb + rpm
# or full bundles (AppImage/dmg/msi — prefer GitHub Actions):
nix develop -c npm run desktop:all
```

**CI:** [`.github/workflows/desktop-build.yml`](.github/workflows/desktop-build.yml) builds Linux, Windows, and macOS (arm64 + x64) on `v*` tags (attaches to the GitHub Release) and on **Actions → Desktop build → Run workflow** (artifacts only). Alpha/beta versions are marked prerelease automatically.

**On NixOS, do not install the `.deb`** — it won't link GTK/WebKit correctly. Launch from the repo root (serves the UI on loopback HTTP, same as the browser):

```fish
nix develop -c npm run desktop   # once
nix run .#texlooper
# or:
npm run desktop:run
```

Do **not** run `./src-tauri/target/release/texlooper` bare on NixOS — WebKit/GTK paths won't resolve.

Set `TEXLOOPER_DEVTOOLS=1` to open WebKit inspector on startup. On Debian/Ubuntu you can install the `.deb` instead.

### Headless CLI / local API (ADR 0014)

From `src-tauri` (Nix shell):

```fish
cargo run --bin texlooper-cli -- import-pdf --input ./sample.pdf --output ./project.json
cargo run --bin texlooper-cli -- render --project ./project.json --data ./row.json --output ./out.pdf
cargo run --bin texlooper-cli -- serve --bind 127.0.0.1:8787
# POST /v1/render  { "project": {...}, "data": {...} } → application/pdf
# or: nix run .#texlooper-serve
```

Point the SPA at the API with `window.__TEXLOOPER__.apiBaseUrl` (see `deploy/inhouse/spa-config.js`).

Studio: **texLooper** menu → **Import PDF…** (structure pass, ADR 0012; desktop or HTTP).

### Hosted demo deploy (Orange Pi)

Build the SPA locally or in CI, rsync to the Pi, path-aware restart (no full stack rebuild). Requires SSH to `orangepi5` (Tailscale) and secrets on the Pi only.

```fish
nix run .#deploy-orangepi
# or
nix develop .#deploy -c bash deploy/orangepi/deploy-from-laptop.sh
```

Override SSH if needed: `set -x SSH_CFG ~/.ssh/config; set -x HOST orangepi5`.

### Catalog database

Durable projects, files, filesystem aliases, and variables live in SQLite (`texlooper.db` under the app data directory when using Tauri). Only the **active** project is kept in memory / a temp browser draft. Open **··· → Catalog** to save, switch, and register filesystem roots. Web mode uses a localStorage-backed catalog with the same API.

### Edition chrome

Pro studio layout: **left insert palette**, **canvas**, **right inspector** (Layers · Design · Data · Notes · Meta), plus a **contextual selection bar** and thin **status strip**. Preview toggles in place (hides tools/inspector). First launch opens a skippable **Edition tour** (··· → Edition tour to restart). **··· → Samples** opens conventional templates (letter, contract, invoice, email, and more) with matching data.

### Templating & automation

Projects include **outputs** (preview / PDF / print device / API), an ordered **workflow**, and named **scripts** (sandboxed expressions or templates). Block conditions and step `when` clauses can use `data.*`, `output.*`, `device.*`, `vars.*`, and `env.*`. Templates support pipe filters such as `{{name|upper}}`, `{{x|default:n/a}}`, `{{price|mul:1.21|currency:EUR}}`, `{{tags|split:,|join: · }}`, and paren forms like `{{name|trim()}}`. After editing merge text, assertions check the first data row (Issues panel + chip warnings). Open **··· → Automation** to edit and dry-run; Preview’s toolbar selects the active output profile.

### Mobile

The studio UI is responsive: below 880 px the navigator and inspector become overlay drawers with edge tabs, and all drag handles are touch-enabled.

Share the dev server on your tailnet/LAN:

```fish
npm run dev:share     # vite --host → http://<your-host>:1420
```

Build a debug APK entirely from the Nix-provided Android toolchain (JDK 17, SDK + NDK, Rust std for all ABIs — no system SDK required):

```fish
nix develop .#android -c bash -c 'npm run tauri android init'   # once
npm run android:debug            # arm64-only debug APK (~150 MB)
npm run android:release          # signed arm64 release APK (~15 MB)
npm run android:debug:universal  # all-ABI debug APK (~550 MB)

Release signing reads `src-tauri/gen/android/key.properties` (gitignored):
generate a keystore once with the nix-provided keytool and point
`storeFile`/`storePassword`/`keyAlias`/`keyPassword` at it.
```

Output lands in `src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`. The shell hook injects the Nix-patched `aapt2` override into `gradle.properties`, so Gradle builds work on NixOS out of the box. Release builds additionally need a signing keystore.