# texLoopr

Open-source editor for tailored bulk documents via templating and simple data formats. Runs on the web and as a Tauri desktop app.

## Requirements

Use the Nix flake (recommended):

```fish
cd /home/yassin/projects/self/texLoopr
direnv allow
# or: nix develop
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
```

### Catalog database

Durable projects, files, filesystem aliases, and variables live in SQLite (`texloopr.db` under the app data directory when using Tauri). Only the **active** project is kept in memory / a temp browser draft. Open **··· → Catalog** to save, switch, and register filesystem roots. Web mode uses a localStorage-backed catalog with the same API.

### Edition chrome

Labeled toolbox + edit ribbon (clipboard, arrange, type, review, view). Comments live on the project and show as page markers. First launch opens a skippable **Edition tour** (··· → Edition tour to restart). The left **navigator** is an embedded virtualized outline (filter, pile/z sort, collapse) ready for thousands of blocks. **··· → Samples** opens nine conventional templates (letter, contract, ad, email, invoice, paper, label, memo, welcome) with matching data.

### Templating & automation

Projects include **outputs** (preview / PDF / print device / API), an ordered **workflow**, and named **scripts** (sandboxed expressions or templates). Block conditions and step `when` clauses can use `data.*`, `output.*`, `device.*`, `vars.*`, and `env.*`. Templates support filters like `{{name|upper}}` and `{{x|default:n/a}}`. Open **··· → Automation** to edit and dry-run; Preview’s toolbar selects the active output profile.

### Mobile

The studio UI is responsive: below 880 px the navigator and inspector become overlay drawers with edge tabs, and all drag handles are touch-enabled.

Share the dev server on your tailnet/LAN:

```fish
npm run dev:share     # vite --host → http://<your-host>:1420
```

Build a debug APK entirely from the Nix-provided Android toolchain (JDK 17, SDK + NDK, Rust std for all ABIs — no system SDK required):

```fish
nix develop .#android -c bash -c 'npm run tauri android init'   # once
npm run android:debug            # arm64-only APK (~150 MB debug)
npm run android:debug:universal  # all-ABI APK (~550 MB debug)
```

Output lands in `src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`. The shell hook injects the Nix-patched `aapt2` override into `gradle.properties`, so Gradle builds work on NixOS out of the box. Release builds additionally need a signing keystore.