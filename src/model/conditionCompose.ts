/**
 * Compose / toggle condition clauses joined with &&.
 * Used by Data + page Visibility chips so presets don't overwrite each other.
 */

const CLAUSE_SPLIT = /\s*&&\s*/;

/** Normalize whitespace inside a single comparison clause. */
export function normalizeConditionClause(clause: string): string {
  return clause.trim().replace(/\s+/g, " ");
}

/** Split an expression into &&-joined clauses (empty → []). */
export function splitConditionClauses(expr: string | undefined | null): string[] {
  if (!expr?.trim()) return [];
  return expr
    .split(CLAUSE_SPLIT)
    .map(normalizeConditionClause)
    .filter(Boolean);
}

export function joinConditionClauses(clauses: string[]): string {
  return clauses.map(normalizeConditionClause).filter(Boolean).join(" && ");
}

/**
 * Toggle a clause in an expression.
 * If an equivalent clause is present, remove it; otherwise append with &&.
 * Matching is by normalized text (exact clause).
 */
export function toggleConditionClause(
  expr: string | undefined | null,
  clause: string,
): string {
  const target = normalizeConditionClause(clause);
  if (!target) return expr?.trim() ?? "";
  const parts = splitConditionClauses(expr);
  const idx = parts.findIndex((p) => p === target);
  if (idx >= 0) {
    parts.splice(idx, 1);
  } else {
    parts.push(target);
  }
  return joinConditionClauses(parts);
}

/** True when the expression contains this clause (normalized). */
export function conditionHasClause(
  expr: string | undefined | null,
  clause: string,
): boolean {
  const target = normalizeConditionClause(clause);
  return splitConditionClauses(expr).some((p) => p === target);
}
