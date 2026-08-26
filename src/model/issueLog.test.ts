import { describe, expect, it, beforeEach } from "vitest";
import {
  issueId,
  normalizeIssue,
  upsertIssue,
} from "./issueLog";
import {
  __resetIssueLogForTests,
  appIssues,
  beginIssuePass,
  endIssuePass,
  noteIssue,
  reportStickyIssue,
  dismissIssue,
  clearAllIssues,
} from "../state/issueLog";

describe("issueLog", () => {
  beforeEach(() => {
    __resetIssueLogForTests();
  });

  it("dedupes by stable id", () => {
    const a = normalizeIssue({
      category: "missing-data",
      severity: "warning",
      message: "Missing field",
      detail: "email",
      source: "preview",
    });
    const b = normalizeIssue({
      category: "missing-data",
      severity: "warning",
      message: "Missing field",
      detail: "email",
      source: "preview",
    });
    expect(a.id).toBe(b.id);
    expect(upsertIssue([a], b)).toHaveLength(1);
  });

  it("buffers pass issues until endIssuePass", () => {
    beginIssuePass();
    noteIssue({
      category: "missing-data",
      severity: "warning",
      message: "Missing field «name»",
      detail: "name",
      source: "preview",
    });
    expect(appIssues.value).toHaveLength(0);
    endIssuePass();
    expect(appIssues.value).toHaveLength(1);
    expect(appIssues.value[0]!.detail).toBe("name");
  });

  it("publishes sticky issues immediately", () => {
    reportStickyIssue({
      category: "data-parse",
      severity: "error",
      message: "Invalid CSV",
      source: "data",
    });
    expect(appIssues.value).toHaveLength(1);
    beginIssuePass();
    endIssuePass();
    expect(appIssues.value).toHaveLength(1);
  });

  it("dismisses and clears", () => {
    reportStickyIssue({
      category: "data-parse",
      severity: "error",
      message: "Bad JSON",
      source: "data",
    });
    const id = appIssues.value[0]!.id;
    dismissIssue(id);
    expect(appIssues.value).toHaveLength(0);
    reportStickyIssue({
      category: "data-parse",
      severity: "error",
      message: "Bad JSON",
      source: "data",
    });
    clearAllIssues();
    expect(appIssues.value).toHaveLength(0);
    expect(issueId({ category: "dataset", message: "x" })).toContain("dataset");
  });
});
