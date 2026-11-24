// src/utils/componentRegistry.ts
/**
 * 🗂️ COMPONENT REGISTRY UTILITIES
 *
 * Pure functions for managing the SBA component library and
 * subject-component assignments. Framework-agnostic — no React,
 * no context — so they can be unit-tested independently and
 * consumed by both SchoolContext and any settings UI.
 */

import type { ClassScoreComponentConfig } from "../types";
import { normalizeTaskKey } from "./sbaReconciliation";

// ─────────────────────────────────────────────────────────────────────────────
// Library management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a new component config to the library.
 * Prevents duplicate names (case-insensitive, whitespace-normalized).
 * Returns the updated library and an `error` string if a duplicate was found.
 */
export function addToLibrary(
  library: ClassScoreComponentConfig[],
  config: ClassScoreComponentConfig,
): { library: ClassScoreComponentConfig[]; error?: string } {
  const targetKey = normalizeTaskKey(config.name);
  const duplicate = library.find((c) => normalizeTaskKey(c.name) === targetKey);
  if (duplicate) {
    return { library, error: `A component named "${config.name}" already exists in the library.` };
  }
  return { library: [...library, config] };
}

/**
 * Remove a component from the library by name.
 * Also cascades — removes the same component from every subject assignment,
 * and removes the subject key entirely if it ends up with zero assignments.
 *
 * Returns the updated library and the updated subjectComponentMap.
 */
export function removeFromLibrary(
  library: ClassScoreComponentConfig[],
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>,
  name: string,
): {
  library: ClassScoreComponentConfig[];
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>;
} {
  const targetKey = normalizeTaskKey(name);
  const updatedLibrary = library.filter((c) => normalizeTaskKey(c.name) !== targetKey);

  const updatedMap: Record<string, ClassScoreComponentConfig[]> = {};
  for (const [subject, components] of Object.entries(subjectComponentMap)) {
    const filtered = components.filter((c) => normalizeTaskKey(c.name) !== targetKey);
    if (filtered.length > 0) {
      updatedMap[subject] = filtered;
    }
    // if filtered is empty, drop the key entirely
  }

  return { library: updatedLibrary, subjectComponentMap: updatedMap };
}

/**
 * Replace a component's config in the library (by original name).
 * Also propagates the updated config to every subject that had it assigned —
 * preserving the subject's assignment list, just updating the config object.
 *
 * Returns the updated library and the updated subjectComponentMap.
 */
export function updateInLibrary(
  library: ClassScoreComponentConfig[],
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>,
  originalName: string,
  updated: ClassScoreComponentConfig,
): {
  library: ClassScoreComponentConfig[];
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>;
  error?: string;
} {
  const originalKey = normalizeTaskKey(originalName);
  const updatedKey = normalizeTaskKey(updated.name);

  // Check for name collision (only if the normalized key actually changed)
  if (originalKey !== updatedKey) {
    const collision = library.find(
      (c) =>
        normalizeTaskKey(c.name) !== originalKey && normalizeTaskKey(c.name) === updatedKey,
    );
    if (collision) {
      return {
        library,
        subjectComponentMap,
        error: `A component named "${updated.name}" already exists.`,
      };
    }
  }

  const updatedLibrary = library.map((c) =>
    normalizeTaskKey(c.name) === originalKey ? updated : c,
  );

  const updatedMap: Record<string, ClassScoreComponentConfig[]> = {};
  for (const [subject, components] of Object.entries(subjectComponentMap)) {
    updatedMap[subject] = components.map((c) =>
      normalizeTaskKey(c.name) === originalKey ? updated : c,
    );
  }

  return { library: updatedLibrary, subjectComponentMap: updatedMap };
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject ↔ component assignment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assign a list of component configs to a subject.
 * Replaces any previous assignment for that subject.
 * Pass an empty array to clear the subject's assignment (same as unassign).
 */
export function assignToSubject(
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>,
  subjectName: string,
  configs: ClassScoreComponentConfig[],
): Record<string, ClassScoreComponentConfig[]> {
  if (configs.length === 0) {
    return unassignFromSubject(subjectComponentMap, subjectName);
  }
  return { ...subjectComponentMap, [subjectName]: configs };
}

/**
 * Remove all component assignments for a subject.
 * Drops the key from the map entirely.
 */
export function unassignFromSubject(
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>,
  subjectName: string,
): Record<string, ClassScoreComponentConfig[]> {
  const updated = { ...subjectComponentMap };
  delete updated[subjectName];
  return updated;
}

/**
 * Get the assigned component configs for a subject.
 * Returns an empty array if no assignment exists.
 */
export function getSubjectComponents(
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>,
  subjectName: string,
): ClassScoreComponentConfig[] {
  return subjectComponentMap[subjectName] ?? [];
}

/**
 * Toggle a single library component on/off for a specific subject.
 * If the component is currently assigned, it is removed; otherwise it is added.
 */
export function toggleComponentForSubject(
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>,
  subjectName: string,
  config: ClassScoreComponentConfig,
): Record<string, ClassScoreComponentConfig[]> {
  const current = getSubjectComponents(subjectComponentMap, subjectName);
  const configKey = normalizeTaskKey(config.name);
  const isAssigned = current.some((c) => normalizeTaskKey(c.name) === configKey);
  const updated = isAssigned
    ? current.filter((c) => normalizeTaskKey(c.name) !== configKey)
    : [...current, config];
  return assignToSubject(subjectComponentMap, subjectName, updated);
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation & diagnostics
// ─────────────────────────────────────────────────────────────────────────────

export interface OrphanedAssignment {
  subjectName: string;
  componentName: string;
}

/**
 * Validate the subject-component map against the library.
 * Returns a list of assignments whose component no longer exists in the library.
 * An empty array means everything is in sync.
 */
export function validateMapAgainstLibrary(
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>,
  library: ClassScoreComponentConfig[],
): OrphanedAssignment[] {
  const libraryNames = new Set(library.map((c) => normalizeTaskKey(c.name)));
  const orphans: OrphanedAssignment[] = [];

  for (const [subjectName, components] of Object.entries(subjectComponentMap)) {
    for (const comp of components) {
      if (!libraryNames.has(normalizeTaskKey(comp.name))) {
        orphans.push({ subjectName, componentName: comp.name });
      }
    }
  }

  return orphans;
}

/**
 * Returns a summary of the library and map state — useful for debugging
 * or showing a settings overview badge.
 */
export function getRegistrySummary(
  library: ClassScoreComponentConfig[],
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>,
): {
  libraryCount: number;
  assignedSubjectCount: number;
  totalAssignments: number;
  orphanedAssignments: OrphanedAssignment[];
} {
  const orphanedAssignments = validateMapAgainstLibrary(subjectComponentMap, library);
  const totalAssignments = Object.values(subjectComponentMap).reduce(
    (sum, components) => sum + components.length,
    0,
  );

  return {
    libraryCount: library.length,
    assignedSubjectCount: Object.keys(subjectComponentMap).length,
    totalAssignments,
    orphanedAssignments,
  };
}
