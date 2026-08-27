import type { ProjectSummary } from "../storage/types";

export const TEMP_DRAFT_KEYS = [
  "texlooper.temp.active.v1",
  "texloopr.temp.active.v1",
  "texlooper.draft.v1",
  "texloopr.draft.v1",
] as const;

/** True when a persisted session draft exists in localStorage. */
export function hasLocalDraftSnapshot(
  storage: Pick<Storage, "getItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): boolean {
  if (!storage) return false;
  try {
    return TEMP_DRAFT_KEYS.some((key) => Boolean(storage.getItem(key)));
  } catch {
    return false;
  }
}

export function canContinueFrom(
  projects: ProjectSummary[],
  hasDraft: boolean,
): boolean {
  return projects.length > 0 || hasDraft;
}

/** Prefer active catalog project, else most recently updated. */
export function pickContinueProjectId(
  projects: ProjectSummary[],
  currentCatalogId: string | null,
): string | null {
  if (currentCatalogId && projects.some((p) => p.id === currentCatalogId)) {
    return currentCatalogId;
  }
  const active = projects.find((p) => p.isActive);
  if (active) return active.id;
  if (projects.length === 0) return null;
  const sorted = [...projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return sorted[0]?.id ?? null;
}

export function continueLabelTitle(
  projects: ProjectSummary[],
  currentCatalogId: string | null,
  currentProjectName: string | null,
  hasDraft: boolean,
): string | null {
  const id = pickContinueProjectId(projects, currentCatalogId);
  if (id) {
    const hit = projects.find((p) => p.id === id);
    return hit?.name ?? currentProjectName;
  }
  if (hasDraft) return currentProjectName;
  return null;
}
