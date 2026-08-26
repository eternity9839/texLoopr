# texLooper — Agent & Repo Policies

## Conventional Commits (required)

Every commit message MUST follow the Conventional Commits format:

```
<type>(<scope>): <short imperative summary>

[optional body]
[optional footer(s)]
```

Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`,
`ci`, `chore`, `style`.

- `feat` — user-visible feature or behavior (new tool parameter, new panel…)
- `fix` — bug fix in shipped behavior
- Breaking changes: add `!` after type (`feat!:`) or a `BREAKING CHANGE:`
  footer line.

**Minor bumps are rare.** Reserve `feat` for milestone capabilities that
were explicitly agreed for a minor release. Enhancements, UX polish,
layout changes and sample/template additions are `fix` (behavior or
content change) or `refactor`/`style` (no behavior change) so the next
bump stays a patch.

## Automatic Versioning (policy)

The app version is **derived from conventional commits**, never hand-picked:

| Commits since last `v*` tag           | Bump   |
| ------------------------------------- | ------ |
| any `feat`                            | minor  |
| only `fix` / `perf` / `refactor` etc. | patch  |
| any breaking change                   | major  |

### CI (source of truth)

- **Commitlint** (`.github/workflows/commitlint.yml`) — rejects non-conventional
  commit subjects on PRs and pushes to `main`.
- **Release** (`.github/workflows/release.yml`) — on `main` (and
  `workflow_dispatch`), runs `npm run release:bump`, commits
  `chore(release): v<version>`, and pushes tag `v<version>`. Skips when HEAD
  is already tagged or the push is itself a release commit. Does **not**
  deploy.

Synced manifests: `package.json`, `package-lock.json`,
`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`.

### Local (optional)

```fish
npm run release:bump    # rewrite manifests from commits since last v* tag
git add -A && git commit -m "chore(release): v<version>" && git tag v<version>
```

Rules:

1. One logical concern per commit; features are committed as `feat(...)` so
   the next bump picks them up.
2. Never bump manually with `npm version`; always via `npm run release:bump`
   (or the Release workflow) so all manifests stay in sync.
3. Android/desktop builds must be produced from a tagged commit
   (`tauri.android.versionCode/Name` derive from `src-tauri/tauri.conf.json`).
4. APK artifacts: debug builds may ride on untagged heads; release builds
   must match a `v*` tag.
5. Distributed APK filenames must carry the version:
   `texlooper-v<version>-arm64-{debug,release}.apk`.
