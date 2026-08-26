import { prefs } from "../state/store";
import { en } from "./en";
import { fr } from "./fr";
import type { LocaleId, MessageKey, Messages } from "./types";

export type { LocaleId, MessageKey, Messages };

const CATALOG: Record<LocaleId, Messages> = { en, fr };

export function activeLocale(): LocaleId {
  const loc = prefs.value.locale;
  return loc === "en" || loc === "fr" ? loc : "en";
}

/** Translate a chrome string. Falls back to English, then the key. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const locale = activeLocale();
  let text = CATALOG[locale][key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}

export function localeLabel(id: LocaleId): string {
  return id === "fr" ? "Français" : "English";
}

/** Keep <html lang> in sync with UI locale. */
export function syncDocumentLocale(locale?: LocaleId): void {
  const id = locale ?? activeLocale();
  if (typeof document !== "undefined") {
    document.documentElement.lang = id;
  }
}
