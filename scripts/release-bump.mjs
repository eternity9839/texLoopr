#!/usr/bin/env node
/**
 * Derives the next semver from conventional commits since the last v* tag
 * and rewrites package.json + src-tauri/tauri.conf.json in sync.
 *
 * feat  -> minor   |  fix/perf/refactor/... -> patch  |  breaking -> major
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const lastTag = sh("git describe --tags --match 'v*' --abbrev=0 2>/dev/null");
const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
const subjects = sh(`git log ${range} --pretty=%s`).split("\n").filter(Boolean);

if (!subjects.length && lastTag) {
  console.error("No commits since", lastTag);
  process.exit(1);
}

let major = false,
  minor = false;
for (const s of subjects) {
  if (/^(feat|fix|refactor|perf|build|ci|chore|style)(\([^)]*\))?!:/.test(s) || /BREAKING CHANGE/.test(s))
    major = true;
  if (/^feat(\([^)]*\))?:/.test(s)) minor = true;
}
const bump = major ? "major" : minor ? "minor" : "patch";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const [maj, min, pat] = pkg.version.split(".").map(Number);
const next =
  bump === "major"
    ? `${maj + 1}.0.0`
    : bump === "minor"
      ? `${maj}.${min + 1}.0`
      : `${maj}.${min}.${pat + 1}`;

pkg.version = next;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

const confPath = "src-tauri/tauri.conf.json";
const conf = JSON.parse(readFileSync(confPath, "utf8"));
conf.version = next;
writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");

console.log(`${bump}: v${lastTag?.replace(/^v/, "") ?? pkg.version} -> v${next}`);
