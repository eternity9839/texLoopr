# texLoopr CI pipeline (Nix + Attic + Tailscale)

Single job: join tailnet → pull from Attic → build in Nix devShell → push cache → deploy over SSH.

```text
GitHub runner
  │  tag:texloopr-ci  (ephemeral, OAuth)
  ├─► Tailscale ──► https://orangepi5.<tailnet>/homelab   (Attic substituter)
  ├─► install-nix-action + nix develop ──► build dist/
  ├─► attic push homelab  (optional, ATTIC_TOKEN)
  └─► SSH rsync ──► orangepi5 ──► ci-deploy.sh
```

Workflow: [`.github/workflows/deploy-orangepi.yml`](../../.github/workflows/deploy-orangepi.yml)

## 1. Tailscale tag + ACL (do this first)

Tags are **declared in ACL policy**, not in the admin UI. Add to your tailnet policy (e.g. [`tailscale-personal-acl/policy.hujson`](https://github.com/...)):

1. **`tagOwners`:** `"tag:texloopr-ci": ["autogroup:admin"]`
2. **`grants`:** `tag:texloopr-ci` → `tag:homelab` on ports `443`, `22` only
3. Push → GitOps applies ACL (or paste in admin console)

See also [tailscale-acl.example.hujson](./tailscale-acl.example.hujson) (legacy `acls` syntax — prefer `grants` if your tailnet uses them).

## 2. Tailscale OAuth client

Admin → **OAuth clients** → Generate:

| Field | Value |
|-------|--------|
| Description | `texloopr-github-actions` |
| Scopes | Devices — **Write** |
| Tags | `tag:texloopr-ci` only |

Copy **Client ID** and **Client secret** → GitHub secrets `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`.

## 3. GitHub repository secrets

| Secret | Source |
|--------|--------|
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client |
| `TS_OAUTH_SECRET` | Tailscale OAuth client |
| `ATTIC_TOKEN` | `~/.config/home-manager/servers/qnap-ts433/secrets/attic-ci.env` (optional push) |

No SSH deploy key — deploy step uses `tailscale ssh orangepi@orangepi5` (see `ci-deploy-remote.sh`).

## 4. Homelab side (already done)

| Component | Role |
|-----------|------|
| QNAP `attic` container | Binary cache `:8377`, cache `homelab` |
| Pi `orangepi-nas-proxy-attic` | socat → NAS |
| Pi Tailscale Serve | `https://orangepi5.<tailnet>/` → Attic |
| Pi deploy path | `/home/orangepi/src/texLoopr/deploy/orangepi` |

## 5. Smoke (from a tailnet machine)

```fish
curl -fsS https://orangepi5.tail48a8e.ts.net/homelab/nix-cache-info
ssh orangepi5.tail48a8e.ts.net true
```

## 6. Optional: PR-only workflow

Split later: `ci.yml` (build + test + attic pull, no deploy) on PRs; keep deploy workflow on `main` only.
