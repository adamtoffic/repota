import type { SchoolSettings } from "../types";

function arePlainValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!arePlainValuesEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  // Compare key presence ignoring explicit undefined keys to match JSON.stringify semantics without serializing large strings
  for (const key of keysA) {
    const valA = objA[key];
    if (valA === undefined) continue;
    if (!(key in objB) || !arePlainValuesEqual(valA, objB[key])) return false;
  }
  for (const key of keysB) {
    const valB = objB[key];
    if (valB === undefined) continue;
    if (!(key in objA) || objA[key] === undefined) return false;
  }

  return true;
}

/**
 * Compares two `SchoolSettings` objects structurally without `JSON.stringify`, avoiding
 * multi-megabyte allocations on base64 `logoUrl` and signature fields via `Object.is`.
 */
export function areSettingsEqual(a: SchoolSettings, b: SchoolSettings): boolean {
  return arePlainValuesEqual(a, b);
}
