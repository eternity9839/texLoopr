# texLooper — Orange Pi 5 hosted demo (via Pangolin Newt)

Ephemeral web SPA behind Traefik ForwardAuth + CrowdSec. Public HTTPS is
terminated by **Pangolin**; the Pi runs a native **Newt** systemd unit (NixOS)
and exposes Traefik only on loopback.

## Architecture

```text
Browser → Pangolin (TLS)
       → Newt (systemd on Pi)
       → http://127.0.0.1:8788  (Traefik + CrowdSec + auth + SPA)
```

## CI/CD (incremental)

Goal: **no full `docker compose build` on every change.**

| Change | On Pi |
|--------|--------|
| SPA (`src/`, …) | CI builds `dist/` → rsync → `app/html` bind-mount → nginx reload |
| `deploy/orangepi/auth/` | `docker compose build auth` + recreate auth only |
| Traefik / CrowdSec / compose | recreate those services only |
| `.env` / Newt | never from CI (stay on the Pi) |

### GitHub Actions

Full pipeline doc: [ci-pipeline.md](./ci-pipeline.md) · ACL example: [tailscale-acl.example.hujson](./tailscale-acl.example.hujson)

Workflow: [`.github/workflows/deploy-orangepi.yml`](../../.github/workflows/deploy-orangepi.yml)  
Triggers: push to `main` (paths under `src/` / `deploy/orangepi/`) or manual.

**Tailscale:** dedicated OAuth tag **`tag:texloopr-ci`** (not shared `tag:ci`). ACL: allow `443` + `22` to `tag:homelab` only.

Repo secrets:

| Secret | Purpose |
|--------|---------|
| `TS_OAUTH_CLIENT_ID` / `TS_OAUTH_SECRET` | Tailscale OAuth client scoped to `tag:texloopr-ci` |
| `ATTIC_TOKEN` | Push devShell paths to homelab cache (optional) |

Deploy uses **Tailscale SSH** (`tailscale ssh orangepi@orangepi5`) — no `ORANGEPI_SSH_KEY`. ACL must allow `tag:texloopr-ci` → `tag:homelab:22` with user `orangepi`.

Build: [install-nix-action](https://github.com/cachix/install-nix-action) → Attic substituter `https://orangepi5.tail48a8e.ts.net/homelab` → `nix develop` → rsync/SSH deploy. **Tailscale joins before Nix install.**

Pi: deploy key in `~/.ssh/authorized_keys`. Orange Pi proxy: `orangepi5-server/nixos/media-stack.nix`.

### Laptop (same path as CI)

```fish
nix run .#deploy-orangepi
# or
nix develop .#deploy -c bash deploy/orangepi/deploy-from-laptop.sh
```

Requires Tailscale SSH to `orangepi5` (default `SSH_CFG` points at home-manager `orangepi5-server` config).  
On-device logic: `deploy/orangepi/ci-deploy.sh` (stamps under `.deploy-stamps/`).

Decision record: [ADR 0011](../../architecture/adr/0011-hosted-demo-deploy.md).

## Newt on the Pi (NixOS)

Secrets in `/etc/newt/newt.env` (not in git). Module: `orangepi5-server/nixos/newt.nix`.

## Pangolin resource

- Target: `http://127.0.0.1:8788`
- Public hostname as configured in Pangolin (e.g. `texlooper.tunnelmy.app` / `dev.texlooper.com`)

## CrowdSec

```fish
docker exec texlooper-crowdsec cscli bouncers list
docker exec texlooper-crowdsec cscli decisions list
```

## Services

| Unit / container | Role |
|------------------|------|
| `newt.service` | Pangolin site connector |
| `texlooper-traefik` | `127.0.0.1:8788` + CrowdSec + ForwardAuth |
| `texlooper-crowdsec` | LAPI |
| `texlooper-auth` / `app` / `db` | Demo login, SPA (bind-mounted html), Postgres |
