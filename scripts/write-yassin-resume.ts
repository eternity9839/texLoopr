/**
 * Write projects/yassin-bousaadi-resume.json from the TypeScript builder.
 * Run: nix develop -c npx --yes tsx scripts/write-yassin-resume.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildYassinResume } from "../src/projects/yassinResume.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "projects", "yassin-bousaadi-resume.json");
const publicOut = join(root, "public", "projects", "yassin-bousaadi-resume.json");

const doc = buildYassinResume();
const json = `${JSON.stringify(doc, null, 2)}\n`;

mkdirSync(dirname(out), { recursive: true });
mkdirSync(dirname(publicOut), { recursive: true });
writeFileSync(out, json);
writeFileSync(publicOut, json);
console.log(`Wrote ${out}`);
console.log(`Wrote ${publicOut}`);
