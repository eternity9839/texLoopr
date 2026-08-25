# texLoopr — Agent & Repo Policies

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

## Automatic Versioning (policy)

The app version is **derived from conventional commits**, never hand-picked:

| Commits since last `v*` tag           | Bump   |
| ------------------------------------- | ------ |
| any `feat`                            | minor  |
| only `fix` / `perf` / `refactor` etc. | patch  |
| any breaking change                   | major  |

Run the bump before publishing/building release artifacts:

```fish
npm run release:bump    # rewrites version in package.json + src-tauri/tauri.conf.json
git add -A && git commit -m "chore(release): v<version>" && git tag v<version>
```

Rules:

1. One logical concern per commit; features are committed as `feat(...)` so
   the next bump picks them up.
2. Never bump manually with `npm version`; always via `npm run release:bump`
   so both manifests stay in sync.
3. Android/desktop builds must be produced from a tagged commit
   (`tauri.android.versionCode/Name` derive from `src-tauri/tauri.conf.json`).
4. APK artifacts: debug builds may ride on untagged heads; release builds
   must match a `v*` tag.
5. Distributed APK filenames must carry the version:
   `texloopr-v<version>-arm64-{debug,release}.apk`.
