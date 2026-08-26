/** In-app diagnostics — session-only, not persisted with the project. */

export type IssueCategory =
  | "missing-data"
  | "impossible-condition"
  | "dataset"
  | "data-parse"
  | "runtime"
  | "merge-assert";

export type IssueSeverity = "error" | "warning";

export type IssueSource =
  | "preview"
  | "resolve"
  | "workflow"
  | "data"
  | "manual";

export interface AppIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  /** Merge path, expression, or dataset name */
  detail?: string;
  blockId?: string;
  rowIndex?: number;
  source: IssueSource;
  at: number;
}

export type NewAppIssue = Omit<AppIssue, "id" | "at"> & {
  id?: string;
  at?: number;
};

export function issueId(parts: {
  category: IssueCategory;
  message: string;
  detail?: string;
  blockId?: string;
  rowIndex?: number;
}): string {
  return [
    parts.category,
    parts.detail ?? "",
    parts.message,
    parts.blockId ?? "",
    parts.rowIndex ?? "",
  ].join("|");
}

export function normalizeIssue(raw: NewAppIssue): AppIssue {
  const id =
    raw.id ??
    issueId({
      category: raw.category,
      message: raw.message,
      detail: raw.detail,
      blockId: raw.blockId,
      rowIndex: raw.rowIndex,
    });
  return {
    id,
    category: raw.category,
    severity: raw.severity,
    message: raw.message,
    detail: raw.detail,
    blockId: raw.blockId,
    rowIndex: raw.rowIndex,
    source: raw.source,
    at: raw.at ?? Date.now(),
  };
}

export function upsertIssue(list: AppIssue[], issue: AppIssue): AppIssue[] {
  const i = list.findIndex((x) => x.id === issue.id);
  if (i < 0) return [...list, issue];
  const next = list.slice();
  next[i] = issue;
  return next;
}

export function categoryLabel(category: IssueCategory): string {
  switch (category) {
    case "missing-data":
      return "Missing data";
    case "impossible-condition":
      return "Impossible condition";
    case "dataset":
      return "Dataset";
    case "data-parse":
      return "Data parse";
    case "runtime":
      return "Runtime";
    case "merge-assert":
      return "Merge check";
  }
}
