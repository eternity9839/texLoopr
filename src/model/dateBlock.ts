import type { DataRow } from "./bindings";
import type { DateBlockFormat, DateBlockSource } from "./document";
import type { RuntimeContext } from "./expr";
import { localIsoDate } from "./envClock";
import { applyTemplateFilters } from "./templateFilters";
import { resolveTemplate } from "./bindings";

export function parseDateSource(raw: unknown): DateBlockSource {
  if (raw === "fixed" || raw === "field" || raw === "today") return raw;
  return "today";
}

export function parseDateFormat(raw: unknown): DateBlockFormat {
  if (raw === "long" || raw === "iso" || raw === "short") return raw;
  return "short";
}

/**
 * Resolve the visible string for a date block.
 * `today` uses env.today (or local clock); `fixed` uses content.fixed;
 * `field` merges content.path (filters optional on the path).
 */
export function resolveDateBlockText(
  content: Record<string, unknown>,
  row: DataRow | undefined,
  runtime: RuntimeContext | undefined,
): string {
  const source = parseDateSource(content.source);
  const format = parseDateFormat(content.format);
  const filter = format === "iso" ? "date:iso" : `date:${format}`;

  let raw = "";
  if (source === "today") {
    const fromEnv = runtime?.env?.today;
    raw =
      fromEnv != null && String(fromEnv).trim()
        ? String(fromEnv)
        : localIsoDate();
  } else if (source === "fixed") {
    raw = String(content.fixed ?? "").trim();
  } else {
    const path = String(content.path ?? "date").trim() || "date";
    if (path.includes("|")) {
      return resolveTemplate(`{{${path}}}`, row, {
        missingAsEmpty: true,
        ctx: runtime,
      });
    }
    return resolveTemplate(`{{${path}|${filter}}}`, row, {
      missingAsEmpty: true,
      ctx: runtime,
    });
  }

  if (!raw) return "";
  return applyTemplateFilters(raw, [filter]);
}
