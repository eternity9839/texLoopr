import { signal } from "@preact/signals";
import {
  createErrorReport,
  type AppErrorReport,
  type ErrorCode,
  type ErrorSection,
} from "../model/appErrors";
import { log } from "../debug/logger";

export type LoadingKind = "boot" | "render" | "import" | "generic";

export type LoadingState = {
  kind: LoadingKind;
  message?: string;
};

export const appLoading = signal<LoadingState | null>(null);
export const appError = signal<AppErrorReport | null>(null);

export function showLoading(kind: LoadingKind, message?: string): void {
  appLoading.value = { kind, message };
}

export function hideLoading(): void {
  appLoading.value = null;
}

export function clearAppError(): void {
  appError.value = null;
}

export function reportAppError(input: {
  code: ErrorCode;
  message: string;
  detail?: string;
  section?: ErrorSection;
  cause?: unknown;
  /** When false, log only — no modal (default true). */
  showDialog?: boolean;
}): AppErrorReport {
  const report = createErrorReport(input);
  log.error(report.section, report.message, {
    code: String(report.code),
    id: report.id,
    detail: report.detail,
  });
  if (input.showDialog !== false) {
    appError.value = report;
  }
  return report;
}
