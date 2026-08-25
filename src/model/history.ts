import type { Project } from "./document";

const MAX_HISTORY = 40;

export interface EditHistorySnapshot {
  past: Project[];
  future: Project[];
  pastLabels: string[];
  futureLabels: string[];
}

export type HistoryActionKind = "past" | "current" | "future";

export interface HistoryActionRow {
  label: string;
  kind: HistoryActionKind;
}

export function isEditHistorySnapshot(value: unknown): value is EditHistorySnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as EditHistorySnapshot;
  return (
    Array.isArray(snap.past) &&
    Array.isArray(snap.future) &&
    Array.isArray(snap.pastLabels) &&
    Array.isArray(snap.futureLabels)
  );
}

export class EditHistory {
  private past: Project[] = [];
  private future: Project[] = [];
  private pastLabels: string[] = [];
  private futureLabels: string[] = [];

  push(current: Project, label = "Edit document"): void {
    this.past.push(structuredClone(current));
    this.pastLabels.push(label);
    if (this.past.length > MAX_HISTORY) {
      this.past.shift();
      this.pastLabels.shift();
    }
    this.future = [];
    this.futureLabels = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(current: Project): Project | null {
    if (!this.past.length) return null;
    this.future.push(structuredClone(current));
    this.futureLabels.push(this.pastLabels.pop() ?? "Edit document");
    return this.past.pop() ?? null;
  }

  redo(current: Project): Project | null {
    if (!this.future.length) return null;
    this.past.push(structuredClone(current));
    this.pastLabels.push(this.futureLabels.pop() ?? "Edit document");
    return this.future.pop() ?? null;
  }

  actionLog(currentLabel = "Current state"): HistoryActionRow[] {
    const rows: HistoryActionRow[] = this.pastLabels.map((label) => ({
      label,
      kind: "past",
    }));
    rows.push({ label: currentLabel, kind: "current" });
    for (let i = this.futureLabels.length - 1; i >= 0; i -= 1) {
      rows.push({ label: this.futureLabels[i]!, kind: "future" });
    }
    return rows;
  }

  toSnapshot(): EditHistorySnapshot | null {
    if (!this.past.length && !this.future.length) return null;
    return {
      past: this.past.map((entry) => structuredClone(entry)),
      future: this.future.map((entry) => structuredClone(entry)),
      pastLabels: [...this.pastLabels],
      futureLabels: [...this.futureLabels],
    };
  }

  loadSnapshot(snapshot: EditHistorySnapshot | null | undefined): void {
    if (!snapshot) {
      this.clear();
      return;
    }
    this.past = snapshot.past.map((entry) => structuredClone(entry));
    this.future = snapshot.future.map((entry) => structuredClone(entry));
    this.pastLabels = [...snapshot.pastLabels];
    this.futureLabels = [...snapshot.futureLabels];
    while (this.pastLabels.length < this.past.length) {
      this.pastLabels.unshift("Edit document");
    }
    while (this.pastLabels.length > this.past.length) {
      this.pastLabels.shift();
    }
    while (this.futureLabels.length < this.future.length) {
      this.futureLabels.push("Edit document");
    }
    while (this.futureLabels.length > this.future.length) {
      this.futureLabels.pop();
    }
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.pastLabels = [];
    this.futureLabels = [];
  }
}
