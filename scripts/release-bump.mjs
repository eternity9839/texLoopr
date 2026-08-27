#!/usr/bin/env node
/**
 * Derives the next semver from conventional commits since the last v* tag
 * and rewrites versioned manifests in sync:
 *   package.json, package-lock.json, src-tauri/tauri.conf.json,
 *   src-tauri/Cargo.toml, src-tauri/Cargo.lock (package texlooper)
 *
 * feat  -> minor   |  fix/perf/refactor/... -> patch  |  breaking -> major
 *
 * Exit 0 with "SKIP" when HEAD is already tagged / no commits since last v*.
 * Prints NEXT_VERSION=<semver> when a bump is applied (for CI).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import {
  parseCoreSemver,
  withReleaseSuffix,
} from "./version-channel.mjs";

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function setLockRootVersion(lockPath, next) {
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.version = next;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = next;
  }
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
}

function setCargoTomlVersion(cargoPath, next) {
  const raw = readFileSync(cargoPath, "utf8");
  // First [package] version = "…" only
  let seenPackage = false;
  const out = raw
    .split("\n")
    .map((line) => {
      if (line.trim() === "[package]") seenPackage = true;
      else if (line.startsWith("[")) seenPackage = false;
      if (seenPackage && /^version\s*=\s*".*"/.test(line)) {
        return `version = "${next}"`;
      }
      return line;
    })
    .join("\n");
  writeFileSync(cargoPath, out.endsWith("\n") ? out : out + "\n");
}

function setCargoLockPackageVersion(lockPath, name, next) {
  const raw = readFileSync(lockPath, "utf8");
  const re = new RegExp(
    `(name\\s*=\\s*"${name}"\\nversion\\s*=\\s*")[^"]+(")`,
    "m",
  );
  if (!re.test(raw)) {
    console.warn(`warn: ${lockPath}: package ${name} not found; skipped`);
    return;
  }
  writeFileSync(lockPath, raw.replace(re, `$1${next}$2`));
}

const lastReachableTag = sh(
  "git tag -l 'v*' --merged HEAD --sort=-v:refname | head -1",
);
const lastReleaseCommit = sh(
  "git log --grep='^chore(release):' -E -1 --pretty=%H",
);

// Prefer a v* tag on this history. After rebases/force-pushes, tags may be
// orphaned — fall back to the last chore(release) commit, then full history.
const lastTag = lastReachableTag;
const range = lastTag
  ? `${lastTag}..HEAD`
  : lastReleaseCommit
    ? `${lastReleaseCommit}..HEAD`
    : "HEAD";
const subjects = sh(`git log ${range} --pretty=%s`)
  .split("\n")
  .filter(Boolean)
  // Ignore prior automated release commits if any linger untagged
  .filter((s) => !/^chore\(release\):/.test(s));

const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const baseline = lastTag ? lastTag.replace(/^v/, "") : pkg.version;

if (!subjects.length) {
  if (lastTag === `v${pkg.version}`) {
    console.log(`SKIP: already at ${lastTag}`);
  } else {
    console.log(
      `SKIP: no conventional commits since ${lastTag || lastReleaseCommit || "start"}`,
    );
  }
  process.exit(0);
}

let major = false,
  minor = false;
for (const s of subjects) {
  if (
    /^(feat|fix|refactor|perf|docs|test|build|ci|chore|style)(\([^)]*\))?!:/.test(s) ||
    /BREAKING CHANGE/.test(s)
  ) {
    major = true;
  }
  if (/^feat(\([^)]*\))?:/.test(s)) minor = true;
}
const bump = major ? "major" : minor ? "minor" : "patch";

const { maj, min, pat } = parseCoreSemver(pkg.version);
const nextCore =
  bump === "major"
    ? `${maj + 1}.0.0`
    : bump === "minor"
      ? `${maj}.${min + 1}.0`
      : `${maj}.${min}.${pat + 1}`;
const next = withReleaseSuffix(nextCore);

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
setLockRootVersion("package-lock.json", next);

const confPath = "src-tauri/tauri.conf.json";
const conf = JSON.parse(readFileSync(confPath, "utf8"));
conf.version = next;
writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");

setCargoTomlVersion("src-tauri/Cargo.toml", next);
setCargoLockPackageVersion("src-tauri/Cargo.lock", "texlooper", next);

const prevLabel = baseline;
console.log(`${bump}: v${prevLabel} -> v${next}`);
console.log(`NEXT_VERSION=${next}`);
