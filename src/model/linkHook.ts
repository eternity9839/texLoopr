import { resolveTemplate, type DataRow } from "./bindings";
import type { RuntimeContext } from "./expr";

export type LinkHook = "url" | "mailto" | "tel" | "sms" | "anchor";

export const LINK_HOOKS: LinkHook[] = ["url", "mailto", "tel", "sms", "anchor"];

export const LINK_HOOK_LABEL: Record<LinkHook, string> = {
  url: "Link",
  mailto: "Email",
  tel: "Phone",
  sms: "SMS",
  anchor: "Anchor",
};

export const LINK_HOOK_DEFAULTS: Record<
  LinkHook,
  { target: string; label: string }
> = {
  url: { target: "https://example.com", label: "Visit site" },
  mailto: { target: "{{email}}", label: "Email us" },
  tel: { target: "{{phone}}", label: "Call us" },
  sms: { target: "{{phone}}", label: "Text us" },
  anchor: { target: "#section", label: "Jump to section" },
};

export function parseLinkHook(raw: unknown): LinkHook {
  const h = String(raw ?? "url");
  return LINK_HOOKS.includes(h as LinkHook) ? (h as LinkHook) : "url";
}

export function resolveLinkTarget(
  hook: LinkHook,
  target: string,
  row: DataRow | undefined,
  ctx?: RuntimeContext,
): string {
  const resolved = resolveTemplate(String(target ?? ""), row, {
    missingAsEmpty: true,
    ctx,
  }).trim();
  if (!resolved) return "";
  if (hook === "url") {
    if (/^(https?:|mailto:|tel:|sms:|#|\/)/i.test(resolved)) return resolved;
    return `https://${resolved}`;
  }
  if (hook === "mailto") {
    return resolved.startsWith("mailto:") ? resolved : `mailto:${resolved}`;
  }
  if (hook === "tel") {
    const digits = resolved.replace(/^tel:/i, "");
    return digits.startsWith("tel:") ? digits : `tel:${digits}`;
  }
  if (hook === "sms") {
    const body = resolved.replace(/^sms:/i, "");
    return body.startsWith("sms:") ? body : `sms:${body}`;
  }
  return resolved.startsWith("#") ? resolved : `#${resolved.replace(/^#/, "")}`;
}

export function linkEditLabel(
  hook: LinkHook,
  target: string,
  label: string,
): string {
  const custom = String(label ?? "").trim();
  if (custom) return custom;
  const t = String(target ?? "").trim();
  if (t) return bindingPathOrText(t);
  return LINK_HOOK_LABEL[hook];
}

function bindingPathOrText(raw: string): string {
  const m = raw.match(/\{\{\s*([^}|#/]+?)(?:\|[^}]*)?\s*\}\}/);
  if (m?.[1]) return m[1]!.trim();
  if (raw.length > 24) return `${raw.slice(0, 21)}…`;
  return raw;
}
