/** Release channel policy — keep in sync with `TEXLOOPER_CHANNEL` in src-tauri/build.rs. */
export const RELEASE_CHANNEL = "alpha";
export const VERSION_SUFFIX = "-alpha";

export function stripReleaseSuffix(version) {
  if (version.endsWith(VERSION_SUFFIX)) {
    return version.slice(0, -VERSION_SUFFIX.length);
  }
  return version;
}

export function withReleaseSuffix(baseVersion) {
  return `${stripReleaseSuffix(baseVersion)}${VERSION_SUFFIX}`;
}

export function parseCoreSemver(version) {
  const core = stripReleaseSuffix(version);
  const parts = core.split(".");
  if (parts.length !== 3) {
    throw new Error(`invalid semver core: ${version}`);
  }
  const [maj, min, pat] = parts.map(Number);
  if ([maj, min, pat].some((n) => Number.isNaN(n))) {
    throw new Error(`invalid semver core: ${version}`);
  }
  return { maj, min, pat };
}
