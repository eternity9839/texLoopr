/** Sandboxed expression language for conditions and scripts. No eval, no I/O. */

export type ExprValue = string | number | boolean | null | ExprValue[] | { [k: string]: ExprValue };

export interface RuntimeContext {
  data: Record<string, ExprValue>;
  output: Record<string, ExprValue>;
  device: Record<string, ExprValue>;
  vars: Record<string, ExprValue>;
  env: Record<string, ExprValue>;
}

export class ExprError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExprError";
  }
}

type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "eof" };

function tokenize(input: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  const s = input.trim();
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if ("()[],".includes(c)) {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      i++;
      let v = "";
      while (i < s.length && s[i] !== q) {
        if (s[i] === "\\" && i + 1 < s.length) {
          v += s[i + 1];
          i += 2;
          continue;
        }
        v += s[i++];
      }
      if (s[i] !== q) throw new ExprError("unclosed string");
      i++;
      tokens.push({ t: "str", v });
      continue;
    }
    const two = s.slice(i, i + 2);
    if (["==", "!=", ">=", "<=", "&&", "||", "~="].includes(two)) {
      tokens.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("!<>".includes(c)) {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1] ?? ""))) {
      let v = "";
      while (i < s.length && /[0-9.]/.test(s[i])) v += s[i++];
      tokens.push({ t: "num", v: Number(v) });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let v = "";
      while (i < s.length && /[A-Za-z0-9_.]/.test(s[i])) v += s[i++];
      tokens.push({ t: "id", v });
      continue;
    }
    throw new ExprError(`unexpected character: ${c}`);
  }
  tokens.push({ t: "eof" });
  return tokens;
}

class Parser {
  private i = 0;
  constructor(
    private tokens: Tok[],
    private ctx: RuntimeContext,
  ) {}

  private peek(): Tok {
    return this.tokens[this.i] ?? { t: "eof" };
  }

  private peekOp(): string | null {
    const tok = this.peek();
    return tok.t === "op" ? tok.v : null;
  }

  private eat(): Tok {
    return this.tokens[this.i++] ?? { t: "eof" };
  }

  private expectOp(v: string): void {
    const tok = this.eat();
    if (tok.t !== "op" || tok.v !== v) throw new ExprError(`expected ${v}`);
  }

  parse(): ExprValue {
    const v = this.parseOr();
    if (this.peek().t !== "eof") throw new ExprError("trailing tokens");
    return v;
  }

  private parseOr(): ExprValue {
    let left = this.parseAnd();
    while (this.peekOp() === "||") {
      this.eat();
      const right = this.parseAnd();
      left = Boolean(truthy(left) || truthy(right));
    }
    return left;
  }

  private parseAnd(): ExprValue {
    let left = this.parseCmp();
    while (this.peekOp() === "&&") {
      this.eat();
      const right = this.parseCmp();
      left = Boolean(truthy(left) && truthy(right));
    }
    return left;
  }

  private parseCmp(): ExprValue {
    let left = this.parseUnary();
    while (["==", "!=", "~=", ">", "<", ">=", "<="].includes(this.peekOp() ?? "")) {
      const opTok = this.eat();
      if (opTok.t !== "op") throw new ExprError("expected operator");
      const right = this.parseUnary();
      left = compare(left, opTok.v, right);
    }
    return left;
  }

  private parseUnary(): ExprValue {
    if (this.peekOp() === "!") {
      this.eat();
      return !truthy(this.parseUnary());
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprValue {
    const tok = this.peek();
    if (tok.t === "num") {
      this.eat();
      return tok.v;
    }
    if (tok.t === "str") {
      this.eat();
      return tok.v;
    }
    if (tok.t === "op" && tok.v === "(") {
      this.eat();
      const v = this.parseOr();
      this.expectOp(")");
      return v;
    }
    if (tok.t === "id") {
      this.eat();
      if (tok.v === "true") return true;
      if (tok.v === "false") return false;
      if (tok.v === "null") return null;
      if (this.peekOp() === "(") {
        return this.callFn(tok.v);
      }
      return resolvePath(tok.v, this.ctx);
    }
    throw new ExprError("expected value");
  }

  private callFn(name: string): ExprValue {
    this.expectOp("(");
    const args: ExprValue[] = [];
    if (this.peekOp() !== ")") {
      args.push(this.parseOr());
      while (this.peekOp() === ",") {
        this.eat();
        args.push(this.parseOr());
      }
    }
    this.expectOp(")");
    return callBuiltin(name, args);
  }
}

function truthy(v: ExprValue): boolean {
  if (v == null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return Object.keys(v).length > 0;
}

function asString(v: ExprValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function asNumber(v: ExprValue): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(asString(v));
  return Number.isFinite(n) ? n : 0;
}

function compare(left: ExprValue, op: string, right: ExprValue): boolean {
  if (op === "~=") {
    return asString(left).toLowerCase().includes(asString(right).toLowerCase());
  }
  if (op === "==") return asString(left) === asString(right) || left === right;
  if (op === "!=") return !(asString(left) === asString(right) || left === right);
  const a = asNumber(left);
  const b = asNumber(right);
  if (op === ">") return a > b;
  if (op === "<") return a < b;
  if (op === ">=") return a >= b;
  if (op === "<=") return a <= b;
  return false;
}

function resolvePath(path: string, ctx: RuntimeContext): ExprValue {
  const parts = path.split(".");
  const root = parts[0];
  let cur: ExprValue;
  if (root === "data") cur = ctx.data;
  else if (root === "output") cur = ctx.output;
  else if (root === "device") cur = ctx.device;
  else if (root === "vars") cur = ctx.vars;
  else if (root === "env") cur = ctx.env;
  else {
    // bare field → data.field (compat with legacy conditions); supports nested a.b
    return (getAtPath(ctx.data, path) as ExprValue) ?? null;
  }
  for (const p of parts.slice(1)) {
    if (cur == null || typeof cur !== "object") return null;
    if (Array.isArray(cur)) {
      const idx = Number(p);
      if (!Number.isFinite(idx)) return null;
      cur = (cur[idx] as ExprValue) ?? null;
      continue;
    }
    cur = (cur as Record<string, ExprValue>)[p] ?? null;
  }
  return cur;
}

function callBuiltin(name: string, args: ExprValue[]): ExprValue {
  switch (name) {
    case "empty":
      return !truthy(args[0] ?? null);
    case "len":
      if (typeof args[0] === "string" || Array.isArray(args[0])) return args[0].length;
      return 0;
    case "upper":
      return asString(args[0] ?? "").toUpperCase();
    case "lower":
      return asString(args[0] ?? "").toLowerCase();
    case "includes":
      return asString(args[0] ?? "")
        .toLowerCase()
        .includes(asString(args[1] ?? "").toLowerCase());
    case "coalesce":
      for (const a of args) if (truthy(a)) return a;
      return args[args.length - 1] ?? null;
    case "num":
      return asNumber(args[0] ?? 0);
    case "str":
      return asString(args[0] ?? "");
    default:
      throw new ExprError(`unknown function: ${name}`);
  }
}

export function evaluateExpr(source: string, ctx: RuntimeContext): ExprValue {
  const trimmed = source.trim();
  if (!trimmed) return true;
  const parser = new Parser(tokenize(trimmed), ctx);
  return parser.parse();
}

export function evaluateConditionExpr(
  source: string | undefined,
  ctx: RuntimeContext,
): boolean {
  if (!source || !source.trim()) return true;
  try {
    return truthy(evaluateExpr(source, ctx));
  } catch {
    // Fail open in authoring when expression is invalid
    return true;
  }
}

export function applyTemplateFilters(
  value: string,
  filters: string[],
): string {
  let out = value;
  for (const raw of filters) {
    const [name, ...rest] = raw.split(":");
    const arg = rest.join(":");
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
      case "default":
        if (!out) out = arg;
        break;
      case "replace": {
        // replace:old:new  (first match); use \/ for literal :
        const parts = splitFilterArgs(arg);
        const from = parts[0] ?? "";
        const to = parts[1] ?? "";
        if (from) out = out.split(from).join(to);
        break;
      }
      case "slice": {
        const parts = splitFilterArgs(arg);
        const start = Number(parts[0] ?? 0);
        const end = parts[1] != null && parts[1] !== "" ? Number(parts[1]) : undefined;
        out = out.slice(
          Number.isFinite(start) ? start : 0,
          end != null && Number.isFinite(end) ? end : undefined,
        );
        break;
      }
      case "pad": {
        // pad:width:char  (left-pad)
        const parts = splitFilterArgs(arg);
        const width = Number(parts[0] ?? 0);
        const ch = (parts[1] ?? " ").slice(0, 1) || " ";
        if (Number.isFinite(width) && width > out.length) {
          out = out.padStart(width, ch);
        }
        break;
      }
      case "join": {
        // value may be JSON array string
        try {
          const parsed = JSON.parse(out) as unknown;
          if (Array.isArray(parsed)) {
            out = parsed.map((x) => String(x ?? "")).join(arg || ", ");
          }
        } catch {
          /* keep */
        }
        break;
      }
      case "number": {
        const n = Number(out.replace(/[^0-9.-]/g, ""));
        if (!Number.isFinite(n)) break;
        const digits = arg !== "" && Number.isFinite(Number(arg)) ? Number(arg) : 0;
        out = n.toFixed(digits);
        break;
      }
      case "currency": {
        const n = Number(out.replace(/[^0-9.-]/g, ""));
        if (!Number.isFinite(n)) break;
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
        // date:iso | date:short | date:long — parses ISO / epoch ms
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
      default:
        break;
    }
  }
  return out;
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

/** Walk dotted path on a value (objects / arrays by index). */
export function getAtPath(root: unknown, path: string): unknown {
  if (!path) return root;
  let cur: unknown = root;
  for (const part of path.split(".")) {
    if (cur == null) return null;
    if (Array.isArray(cur)) {
      const idx = Number(part);
      if (!Number.isFinite(idx)) return null;
      cur = cur[idx];
      continue;
    }
    if (typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur ?? null;
}
