# In-house / official Rust API + SPA (ADR 0016)

Closed-source stack: same `texlooper-cli serve` binary for official website and customer in-house deploys. Differ by env only.

## Profiles

| Profile | `TEXLOOPER` SPA config | API bind | Catalog | Auth |
|---------|------------------------|----------|---------|------|
| `ephemeral` | `ephemeral: true` (demo) | optional | none | demo gate |
| `official` | `apiBaseUrl` + `profile: official` | public behind TLS | postgres | `TEXLOOPER_API_KEY` |
| `inhouse` | `apiBaseUrl` + `profile: inhouse` | Tailscale / LAN | sqlite or postgres | API key |

## Quick start (in-house, SQLite)

```fish
# build API binary (from repo with Nix)
cd src-tauri
nix develop ../. -c cargo build --release --bin texlooper-cli

set -x TEXLOOPER_API_KEY "change-me"
set -x TEXLOOPER_DATA_DIR /var/lib/texlooper
set -x TEXLOOPER_CATALOG sqlite
./target/release/texlooper-cli serve --bind 0.0.0.0:8787
```

SPA `config.js` (served next to the Vite build):

```js
window.__TEXLOOPER__ = {
  profile: "inhouse",
  apiBaseUrl: "https://texlooper.internal:8787",
  apiKey: "change-me",
  ephemeral: false,
};
```

## Nix

```fish
# loopback API (builds release CLI)
nix run .#texlooper-serve
# or
bash deploy/inhouse/nix-serve.sh 127.0.0.1:8787
```

## Docker Compose

See [docker-compose.yml](docker-compose.yml). Copy `.env.example` → `.env`. Official profile sets `TEXLOOPER_CATALOG=postgres` and `DATABASE_URL`.

```fish
docker compose --profile inhouse up --build
# nix run .#texlooper-inhouse -- inhouse
```

Apply Postgres schema once:

```fish
psql $DATABASE_URL -f ../../src-tauri/src/sql/catalog_postgres.sql
```

(Postgres driver is stubbed until P2 driver wiring; SQLite is production-ready for single-tenant in-house.)

## Endpoints

- `GET /v1/health`, `GET /v1/runtime`
- `POST /v1/data/parse`, `/v1/template/resolve`, `/v1/workflow/run`
- `POST /v1/render`, `/v1/render-batch`, `/v1/import-pdf`
- `GET|POST /v1/catalog/projects`, …
