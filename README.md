# texLooper

Open-source editor for tailored bulk documents via templating and simple data formats. Runs on the web and as a Tauri desktop app.

Hosted demo (Orange Pi): see [deploy/orangepi/README.md](deploy/orangepi/README.md).  
Public via **Pangolin Newt** (NixOS systemd) → `http://127.0.0.1:8788`.  
Architecture: [ADR 0011](architecture/adr/0011-hosted-demo-deploy.md).

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
```

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
npm run android:debug            # arm64-only debug APK (~150 MB)
npm run android:release          # signed arm64 release APK (~15 MB)
npm run android:debug:universal  # all-ABI debug APK (~550 MB)

Release signing reads `src-tauri/gen/android/key.properties` (gitignored):
generate a keystore once with the nix-provided keytool and point
`storeFile`/`storePassword`/`keyAlias`/`keyPassword` at it.
```

Output lands in `src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`. The shell hook injects the Nix-patched `aapt2` override into `gradle.properties`, so Gradle builds work on NixOS out of the box. Release builds additionally need a signing keystore.