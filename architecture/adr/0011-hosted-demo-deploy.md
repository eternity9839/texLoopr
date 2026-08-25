# ADR 0011: Hosted demo deploy (Pangolin + incremental CI)

- **Status:** accepted
- **Date:** 2026-08-25
- **Deciders:** project maintainers
- **Related:** [ADR 0004](0004-sqlite-catalog.md) (catalog stays desktop-local; hosted demo is ephemeral)

## Context

texLooper needs a public **hosted demo** on the Orange Pi 5 without:

- rebuilding the full Docker stack on every UI change,
- storing secrets in git or CI logs,
- exposing the Pi on public `:443` (home IP / self-signed certs),
- coupling release flow to Tauri/desktop builds.

Earlier experiments used Tailscale Serve VIPs and direct Traefik TLS on the Pi; these were replaced by **Pangolin Newt** (outbound tunnel, TLS on Pangolin) plus a local access gate and CrowdSec.

## Decision

1. **Edge:** Pangolin Cloud (`app.pangolin.net`) terminates HTTPS; **Newt** runs as a **NixOS systemd** unit on the Pi (`orangepi5-server/nixos/newt.nix`), not `curl | bash` or a Docker sidecar.
2. **Origin:** Docker Compose under `deploy/orangepi/`:
   - Traefik on `127.0.0.1:8788` only (ForwardAuth + CrowdSec bouncer),
   - auth gate (demo user/password),
   - nginx SPA with **bind-mounted** `app/html` (no `npm run build` on the Pi),
   - Postgres provisioned but unused for catalog in this phase.
3. **Ephemeral demo:** runtime `config.js` sets `window.__TEXLOOPER__.ephemeral = true` — no localStorage autosave, no catalog writes (see app changes in `runtimeConfig.ts` / store guards).
4. **Deploy pipeline (incremental):**
   - **Build** Vite `dist/` on CI or laptop (Nix: `nix develop`, `nix run .#deploy-orangepi`).
   - **Rsync** `deploy/orangepi/` + `dist/` → `/home/orangepi/src/texLooper/` on the Pi (never `.env`, stamps, or CrowdSec keys).
   - **Apply** via `deploy/orangepi/ci-deploy.sh`: content stamps decide whether to reload **app**, rebuild **auth**, or recreate **traefik/crowdsec** only.
5. **Automation:** GitHub Actions (see [deploy/orangepi/ci-pipeline.md](../../deploy/orangepi/ci-pipeline.md)): Tailscale `tag:texloopr-ci` → [install-nix-action](https://github.com/cachix/install-nix-action) + Attic pull → Nix build → optional Attic push → SSH deploy. All homelab access over tailnet; dedicated ACL (`443`/`22` to `tag:homelab` only).
6. **Secrets:** demo credentials, `SESSION_SECRET`, Postgres, CrowdSec bouncer key, and Newt env live **only on the Pi** (`deploy/orangepi/.env`, `/etc/newt/newt.env`). Attic server secret stays on QNAP; CI token in GitHub `ATTIC_TOKEN`.

## Consequences

- Positive: fast UI deploys (rsync + nginx reload); Pi never runs Node build; no inbound firewall on 443; Pangolin handles public TLS; path-aware restarts avoid full `docker compose build`.
- Trade-offs: two deploy surfaces (NixOS Newt + Docker compose); GitHub deploy requires Tailscale OAuth + SSH secrets; demo is shared-user, not multi-tenant; hosted build differs from desktop (ephemeral flag).
- Follow-ups: optional GHCR image for auth instead of on-Pi build; wire `dev.texlooper.com` CNAME to Pangolin; persist catalog via Postgres in a later phase; extend workflow to `feature/*` preview if needed.

## Operator quick reference

```fish
# Local deploy (Nix)
nix run .#deploy-orangepi
# or
nix develop .#deploy -c bash deploy/orangepi/deploy-from-laptop.sh

# Pangolin resource target (on Pi)
http://127.0.0.1:8788
```

See [deploy/orangepi/README.md](../../deploy/orangepi/README.md) for secrets, CrowdSec, and CI setup.
