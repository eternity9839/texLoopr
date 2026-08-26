import { signal } from "@preact/signals";
import {
  normalizeIssue,
  upsertIssue,
  type AppIssue,
  type IssueSource,
  type NewAppIssue,
} from "../model/issueLog";

/**
 * Pass buffer: filled during canvas/resolve render; committed in useLayoutEffect.
 * Sticky: data-parse / manual — survives preview passes until cleared.
 */
let passBuffer: AppIssue[] = [];
let sticky: AppIssue[] = [];

export const appIssues = signal<AppIssue[]>([]);
export const issuesPanelOpen = signal(false);

const PASS_SOURCES: IssueSource[] = ["preview", "resolve", "workflow"];

function publish(): void {
  appIssues.value = [...sticky, ...passBuffer];
}

/** Start a canvas/preview collection pass (clears prior pass issues). */
export function beginIssuePass(): void {
  passBuffer = [];
}

/** Commit the current pass into the published list. */
export function endIssuePass(): void {
  publish();
}

/** Note an issue during resolve/preview (buffered until endIssuePass). */
export function noteIssue(raw: NewAppIssue): void {
  const issue = normalizeIssue(raw);
  if (PASS_SOURCES.includes(issue.source)) {
    passBuffer = upsertIssue(passBuffer, issue);
    return;
  }
  sticky = upsertIssue(sticky, issue);
  publish();
}

/** Sticky issue (data studio parse, etc.) — published immediately. */
export function reportStickyIssue(raw: NewAppIssue): void {
  sticky = upsertIssue(sticky, normalizeIssue({ ...raw, source: raw.source }));
  publish();
}

export function clearStickyIssues(source?: IssueSource): void {
  sticky = source ? sticky.filter((i) => i.source !== source) : [];
  publish();
}

/** Clear merge-assert sticky issues for one block (or all merge-asserts). */
export function clearMergeAssertIssues(blockId?: string): void {
  sticky = sticky.filter((i) => {
    if (i.category !== "merge-assert") return true;
    if (blockId && i.blockId !== blockId) return true;
    return false;
  });
  publish();
}

export function dismissIssue(id: string): void {
  passBuffer = passBuffer.filter((i) => i.id !== id);
  sticky = sticky.filter((i) => i.id !== id);
  publish();
}

export function clearAllIssues(): void {
  passBuffer = [];
  sticky = [];
  publish();
}

export function openIssuesPanel(open = true): void {
  issuesPanelOpen.value = open;
}

/** Test helper — reset module state. */
export function __resetIssueLogForTests(): void {
  passBuffer = [];
  sticky = [];
  appIssues.value = [];
  issuesPanelOpen.value = false;
}
