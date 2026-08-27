/** Email envelope fields shared by Project defaults and OutputProfile overrides. */

export interface EmailEnvelope {
  /** From address (templates OK) */
  from?: string;
  /** Reply-To */
  replyTo?: string;
  /** Optional To override (else row.email / row.to) */
  to?: string;
  cc?: string;
  bcc?: string;
  /** Subject override (else row.subject → project.subject → name) */
  subject?: string;
  /** Preheader / preview text */
  preheader?: string;
  /** Attach the rendered PDF when the caller provides it. */
  attachPdf?: boolean;
  /**
   * Extra headers as `Name: value` or `Name=value` lines.
   * Templates OK. Reserved/system headers are dropped.
   */
  headers?: string;
}

const RESERVED_HEADER = new Set(
  [
    "from",
    "to",
    "cc",
    "bcc",
    "subject",
    "date",
    "message-id",
    "mime-version",
    "content-type",
    "content-transfer-encoding",
    "x-mailer",
    "x-texlooper-version",
    "x-texlooper-channel",
    "x-texlooper-instance-id",
    "x-texlooper-project-id",
  ].map((s) => s.toLowerCase()),
);

/** Merge output envelope over project defaults (field-wise). */
export function mergeEmailEnvelope(
  projectEmail: EmailEnvelope | undefined,
  outputEmail: EmailEnvelope | undefined,
): EmailEnvelope {
  return {
    from: pick(outputEmail?.from, projectEmail?.from),
    replyTo: pick(outputEmail?.replyTo, projectEmail?.replyTo),
    to: pick(outputEmail?.to, projectEmail?.to),
    cc: pick(outputEmail?.cc, projectEmail?.cc),
    bcc: pick(outputEmail?.bcc, projectEmail?.bcc),
    subject: pick(outputEmail?.subject, projectEmail?.subject),
    preheader: pick(outputEmail?.preheader, projectEmail?.preheader),
    attachPdf: Boolean(projectEmail?.attachPdf || outputEmail?.attachPdf),
    headers: mergeHeaderBlocks(projectEmail?.headers, outputEmail?.headers),
  };
}

function pick(a?: string, b?: string): string | undefined {
  const x = String(a ?? "").trim();
  if (x) return x;
  const y = String(b ?? "").trim();
  return y || undefined;
}

/** Later block wins on duplicate keys (output overrides project). */
function mergeHeaderBlocks(
  base?: string,
  override?: string,
): string | undefined {
  const map = new Map<string, { name: string; value: string }>();
  for (const line of parseHeaderLines(base ?? "")) {
    map.set(line.name.toLowerCase(), line);
  }
  for (const line of parseHeaderLines(override ?? "")) {
    map.set(line.name.toLowerCase(), line);
  }
  if (!map.size) return undefined;
  return [...map.values()].map((h) => `${h.name}: ${h.value}`).join("\n");
}

export function parseHeaderLines(
  raw: string,
): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = [];
  for (const line of String(raw).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = /^([^:=]+)\s*[:=]\s*(.*)$/.exec(trimmed);
    if (!m) continue;
    const name = m[1]!.trim();
    const value = m[2]!.trim();
    if (!name || !value) continue;
    if (RESERVED_HEADER.has(name.toLowerCase())) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(name)) continue;
    out.push({ name, value });
  }
  return out;
}

export function emptyEmailEnvelope(): EmailEnvelope {
  return {};
}

export function patchEmailEnvelope(
  current: EmailEnvelope | undefined,
  patch: Partial<EmailEnvelope>,
): EmailEnvelope | undefined {
  const next: EmailEnvelope = { ...(current ?? {}), ...patch };
  for (const key of Object.keys(next) as (keyof EmailEnvelope)[]) {
    const v = next[key];
    if (v == null || String(v).trim() === "") delete next[key];
  }
  return Object.keys(next).length ? next : undefined;
}
