import type { Project } from "./document";

const MAX_HISTORY = 40;

export class EditHistory {
  private past: Project[] = [];
  private future: Project[] = [];

  push(current: Project): void {
    this.past.push(structuredClone(current));
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.future = [];
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
    return this.past.pop() ?? null;
  }

  redo(current: Project): Project | null {
    if (!this.future.length) return null;
    this.past.push(structuredClone(current));
    return this.future.pop() ?? null;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
