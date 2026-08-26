/**
 * Merge template filters — pipe transforms on {{path|filter:args}}.
 * Accepts authoring forms like trim() / add(1); stores/resolves as colon args.
 * No free-form expression language inside {{ }}; unary maths only.
 */

import { dataFieldLabel } from "./dataField";
import { getAtPath, type RuntimeContext } from "./expr";

export type FilterKind =
  | "string"
  | "structure"
  | "format"
  | "date"
  | "math"
  | "random";

export interface FilterSpec {
  name: string;
  kind: FilterKind;
  /** Short chip / docs label */
  label: string;
}

/** Allowed filter names (single source for resolve + assert + chips). */
export const TEMPLATE_FILTERS: readonly FilterSpec[] = [
  { name: "upper", kind: "string", label: "upper" },
  { name: "lower", kind: "string", label: "lower" },
  { name: "trim", kind: "string", label: "trim" },
  { name: "capitalize", kind: "string", label: "cap" },
  { name: "title", kind: "string", label: "title" },
  { name: "default", kind: "string", label: "default" },
  { name: "replace", kind: "string", label: "replace" },
  { name: "slice", kind: "string", label: "slice" },
  { name: "pad", kind: "string", label: "pad" },
  { name: "truncate", kind: "string", label: "trunc" },
  { name: "split", kind: "structure", label: "split" },
  { name: "join", kind: "structure", label: "join" },
  { name: "first", kind: "structure", label: "first" },
  { name: "last", kind: "structure", label: "last" },
  { name: "number", kind: "format", label: "num" },
  { name: "currency", kind: "format", label: "€/$" },
  { name: "date", kind: "date", label: "date" },
  { name: "add", kind: "math", label: "+" },
  { name: "sub", kind: "math", label: "−" },
  { name: "mul", kind: "math", label: "×" },
  { name: "div", kind: "math", label: "÷" },
  { name: "abs", kind: "math", label: "abs" },
  { name: "round", kind: "math", label: "round" },
  { name: "random", kind: "random", label: "rand" },
] as const;

const FILTER_NAMES = new Set(TEMPLATE_FILTERS.map((f) => f.name));

const MATH_FILTERS = new Set(
  TEMPLATE_FILTERS.filter((f) => f.kind === "math").map((f) => f.name),
);

export function isKnownFilter(name: string): boolean {
  return FILTER_NAMES.has(name);
}

export function isMathFilter(name: string): boolean {
  return MATH_FILTERS.has(name);
}

export function filterChipLabel(name: string, arg: string): string {
  const spec = TEMPLATE_FILTERS.find((f) => f.name === name);
  if (!spec) return name;
  if (name === "currency" && arg) return arg;
  if (name === "date" && arg) return arg;
  if (name === "default" && arg) return `≈${arg.slice(0, 8)}`;
  if (
    (name === "add" ||
      name === "sub" ||
      name === "mul" ||
      name === "div" ||
      name === "round" ||
      name === "truncate") &&
    arg
  ) {
    return `${spec.label}${arg}`;
  }
  return spec.label;
}

/**
 * Normalize one pipe segment: `trim()` → `trim`, `add(1)` → `add:1`,
 * `default("n/a")` → `default:n/a`, `split(",")` → `split:,`.
 * Preserves trailing spaces in colon args (e.g. `join: · `).
 */
export function normalizeFilterSegment(raw: string): string {
  const leading = raw.replace(/^\s+/, "");
  if (!leading.trim()) return "";

  const forParen = leading.trimEnd();
  const paren = forParen.match(/^([a-zA-Z_][\w]*)\s*\((.*)\)\s*$/);
  if (paren) {
    const name = paren[1]!.toLowerCase();
    let inner = paren[2]!;
    const t = inner.trim();
    if (
      (t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith("'") && t.endsWith("'"))
    ) {
      inner = t.slice(1, -1);
    }
    // Keep unquoted inner spaces (e.g. join( · )).
    return inner === "" ? name : `${name}:${inner}`;
  }

  const colon = leading.indexOf(":");
  if (colon < 0) return leading.trim().toLowerCase();
  const name = leading.slice(0, colon).trim().toLowerCase();
  const arg = leading.slice(colon + 1);
  return `${name}:${arg}`;
}

export function normalizeFilterList(filters: string[]): string[] {
  return filters.map(normalizeFilterSegment).filter(Boolean);
}

export function parseFilterPipe(inner: string): {
  path: string;
  filters: string[];
} {
  const parts = inner.split("|").map((p) => p.trim());
  const path = parts[0] ?? "";
  const filters = normalizeFilterList(parts.slice(1));
  return { path, filters };
}

export function mergeChipLabel(path: string, filters: string[]): string {
  const base = dataFieldLabel(path);
  if (!filters.length) return base;
  const bits = filters.map((f) => {
    const [name, ...rest] = f.split(":");
    return filterChipLabel(name!, rest.join(":"));
  });
  return `${base} · ${bits.join(" · ")}`;
}

function splitFilterArgs(arg: string): string[] {
  if (!arg) return [];
  return arg.split(":").map((p) => p.replace(/\\:/g, ":"));
}

function parseLooseDate(raw: string): Date | null {
  if (!raw) return null;
  if (/^\d{10,13}$/.test(raw)) {
    const n = Number(raw);
    const ms = raw.length <= 10 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseNumberish(raw: string): number | null {
  if (!/[0-9]/.test(String(raw))) return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Seeded 0..1 from string (stable across Preview paints). */
function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function tryParseJsonArray(raw: string): unknown[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function applyTemplateFilters(
  value: string,
  filters: string[],
  opts?: { seedKey?: string },
): string {
  let out = value;
  const normalized = normalizeFilterList(filters);
  for (const raw of normalized) {
    const [name, ...rest] = raw.split(":");
    const arg = rest.join(":");
    if (!name || !isKnownFilter(name)) continue;

    switch (name) {
      case "upper":
        out = out.toUpperCase();
        break;
      case "lower":
        out = out.toLowerCase();
        break;
      case "trim":
        out = out.trim();
        break;
      case "capitalize":
        out = out.length
          ? out.charAt(0).toUpperCase() + out.slice(1).toLowerCase()
          : out;
        break;
      case "title":
        out = out
          .split(/\s+/)
          .map((w) =>
            w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w,
          )
          .join(" ");
        break;
      case "default":
        if (!out) out = arg;
        break;
      case "replace": {
        const parts = splitFilterArgs(arg);
        const from = parts[0] ?? "";
        const to = parts[1] ?? "";
        if (from) out = out.split(from).join(to);
        break;
      }
      case "slice": {
        const parts = splitFilterArgs(arg);
        const start = Number(parts[0] ?? 0);
        const end =
          parts[1] != null && parts[1] !== "" ? Number(parts[1]) : undefined;
        out = out.slice(
          Number.isFinite(start) ? start : 0,
          end != null && Number.isFinite(end) ? end : undefined,
        );
        break;
      }
      case "pad": {
        const parts = splitFilterArgs(arg);
        const width = Number(parts[0] ?? 0);
        const ch = (parts[1] ?? " ").slice(0, 1) || " ";
        if (Number.isFinite(width) && width > out.length) {
          out = out.padStart(width, ch);
        }
        break;
      }
      case "truncate": {
        const n = Number(arg || 0);
        if (Number.isFinite(n) && n >= 0 && out.length > n) {
          out =
            n <= 1 ? out.slice(0, n) : `${out.slice(0, Math.max(0, n - 1))}…`;
        }
        break;
      }
      case "split": {
        const sep = arg === "" ? "," : arg;
        out = JSON.stringify(out.split(sep));
        break;
      }
      case "join": {
        const arr = tryParseJsonArray(out);
        if (arr) out = arr.map((x) => String(x ?? "")).join(arg || ", ");
        break;
      }
      case "first": {
        const arr = tryParseJsonArray(out);
        if (arr) out = arr.length ? String(arr[0] ?? "") : "";
        else out = out.slice(0, 1);
        break;
      }
      case "last": {
        const arr = tryParseJsonArray(out);
        if (arr) out = arr.length ? String(arr[arr.length - 1] ?? "") : "";
        else out = out.slice(-1);
        break;
      }
      case "number": {
        const n = parseNumberish(out);
        if (n == null) break;
        const digits =
          arg !== "" && Number.isFinite(Number(arg)) ? Number(arg) : 0;
        out = n.toFixed(digits);
        break;
      }
      case "currency": {
        const n = parseNumberish(out);
        if (n == null) break;
        const currency = arg || "EUR";
        try {
          out = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
          }).format(n);
        } catch {
          out = `${n.toFixed(2)} ${currency}`;
        }
        break;
      }
      case "date": {
        const d = parseLooseDate(out);
        if (!d) break;
        if (arg === "iso" || !arg) out = d.toISOString().slice(0, 10);
        else if (arg === "long")
          out = d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        else
          out = d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        break;
      }
      case "add":
      case "sub":
      case "mul":
      case "div": {
        const n = parseNumberish(out);
        const rhs = Number(arg);
        if (n == null || !Number.isFinite(rhs)) break;
        if (name === "div" && rhs === 0) break;
        const r =
          name === "add"
            ? n + rhs
            : name === "sub"
              ? n - rhs
              : name === "mul"
                ? n * rhs
                : n / rhs;
        out = String(r);
        break;
      }
      case "abs": {
        const n = parseNumberish(out);
        if (n == null) break;
        out = String(Math.abs(n));
        break;
      }
      case "round": {
        const n = parseNumberish(out);
        if (n == null) break;
        const digits =
          arg !== "" && Number.isFinite(Number(arg)) ? Number(arg) : 0;
        const f = 10 ** Math.max(0, Math.min(12, digits));
        out = String(Math.round(n * f) / f);
        break;
      }
      case "random": {
        const parts = splitFilterArgs(arg);
        const min =
          parts[0] !== undefined && parts[0] !== "" ? Number(parts[0]) : 0;
        const max =
          parts[1] !== undefined && parts[1] !== "" ? Number(parts[1]) : 1;
        const lo = Number.isFinite(min) ? min : 0;
        const hi = Number.isFinite(max) ? max : 1;
        const u = seededUnit(`${opts?.seedKey ?? ""}|${out}|${lo}|${hi}`);
        const span = hi - lo;
        const n = lo + u * (span || 1);
        out = String(
          Number.isInteger(lo) && Number.isInteger(hi) ? Math.floor(n) : n,
        );
        break;
      }
      default:
        break;
    }
  }
  return out;
}

export type MergeAssertFailure = {
  severity: "error" | "warning";
  message: string;
  detail: string;
  path: string;
};

function valueToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Lightweight lookup without importing bindings (avoids cycle). */
function lookupSample(
  path: string,
  row: Record<string, unknown> | undefined,
  ctx?: RuntimeContext,
): unknown {
  if (ctx) {
    const roots = ["data", "output", "device", "vars", "env"] as const;
    if (roots.some((r) => path === r || path.startsWith(`${r}.`))) {
      const parts = path.split(".");
      let cur: unknown =
        parts[0] === "data"
          ? ctx.data
          : parts[0] === "output"
            ? ctx.output
            : parts[0] === "device"
              ? ctx.device
              : parts[0] === "vars"
                ? ctx.vars
                : ctx.env;
      for (const p of parts.slice(1)) {
        if (cur == null || typeof cur !== "object") return null;
        if (Array.isArray(cur)) {
          const idx = Number(p);
          if (!Number.isFinite(idx)) return null;
          cur = cur[idx];
          continue;
        }
        cur = (cur as Record<string, unknown>)[p];
      }
      return cur ?? null;
    }
    if (path in ctx.data) return ctx.data[path];
    const fromData = getAtPath(ctx.data, path);
    if (fromData != null) return fromData;
  }
  if (!row) return null;
  if (path in row) return row[path];
  return getAtPath(row, path);
}

/**
 * Assert merge tokens in text against a sample row (typically row 1).
 */
export function assertMergeTemplate(
  text: string,
  row: Record<string, unknown> | undefined,
  opts?: { ctx?: RuntimeContext },
): MergeAssertFailure[] {
  const failures: MergeAssertFailure[] = [];
  const re = /\{\{(?!#|\/)([^{}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0]!;
    const inner = m[1]!.trim();
    const { path, filters } = parseFilterPipe(inner);
    const looked = lookupSample(path, row, opts?.ctx);
    const hasDefault = filters.some((f) => f.startsWith("default"));
    const present = looked !== undefined && looked !== null;
    const value = present ? valueToString(looked) : "";

    if (!present && !hasDefault) {
      failures.push({
        severity: "warning",
        message: `Missing field «${path}» on sample row`,
        detail: raw,
        path,
      });
    }

    for (const f of filters) {
      const [name, ...rest] = f.split(":");
      const arg = rest.join(":");
      if (!name) continue;
      if (!isKnownFilter(name)) {
        failures.push({
          severity: "error",
          message: `Unknown filter «${name}»`,
          detail: raw,
          path,
        });
        continue;
      }

      if (name === "div" && Number(arg) === 0) {
        failures.push({
          severity: "error",
          message: "Division by zero (div:0)",
          detail: raw,
          path,
        });
      }

      if (
        name === "slice" ||
        name === "pad" ||
        name === "truncate" ||
        name === "round" ||
        name === "add" ||
        name === "sub" ||
        name === "mul" ||
        name === "div"
      ) {
        const first = arg.split(":")[0] ?? "";
        if (arg !== "" && !Number.isFinite(Number(first))) {
          failures.push({
            severity: "error",
            message: `Filter «${name}» has a non-numeric argument`,
            detail: raw,
            path,
          });
        }
      }

      if (name === "random") {
        const parts = splitFilterArgs(arg);
        for (const p of parts) {
          if (p !== "" && !Number.isFinite(Number(p))) {
            failures.push({
              severity: "error",
              message: "random:min:max needs numeric bounds",
              detail: raw,
              path,
            });
            break;
          }
        }
      }

      if (name === "currency" && arg) {
        try {
          new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: arg,
          }).format(1);
        } catch {
          failures.push({
            severity: "error",
            message: `Invalid currency code «${arg}»`,
            detail: raw,
            path,
          });
        }
      }

      if (!present && hasDefault) continue;
      if (!present) continue;

      if (isMathFilter(name) || name === "number" || name === "currency") {
        if (value !== "" && parseNumberish(value) == null) {
          failures.push({
            severity: "error",
            message: `«${path}» is not numeric for filter «${name}»`,
            detail: raw,
            path,
          });
        }
      }

      if (name === "date" && value !== "" && !parseLooseDate(value)) {
        failures.push({
          severity: "error",
          message: `«${path}» is not a valid date for |date`,
          detail: raw,
          path,
        });
      }
    }
  }
  return failures;
}
