import { use, useContext } from "react";
import {
  SchoolActionsContext,
  SchoolContext,
  SchoolLifecycleContext,
  SchoolSettingsContext,
  SchoolStudentsContext,
  type SchoolActionsType,
  type SchoolContextType,
  type SchoolLifecycleType,
} from "../context/SchoolContextDefinition";
import type { ProcessedStudent, SchoolSettings } from "../types";

export function useSchoolData(): SchoolContextType {
  const context = useContext(SchoolContext);

  if (context === undefined) {
    throw new Error("useSchoolData must be used within a SchoolProvider");
  }

  return context;
}

export function useSchoolStudents(): ProcessedStudent[] {
  const slice = useContext(SchoolStudentsContext);
  if (slice !== undefined) return slice;
  // Conditional fallback via React 19 `use()` prevents subscribing to SchoolContext when SchoolProvider is present
  const fallback = use(SchoolContext);
  if (fallback !== undefined) return fallback.students;
  throw new Error("useSchoolStudents must be used within a SchoolProvider");
}

export function useSchoolSettings(): SchoolSettings {
  const slice = useContext(SchoolSettingsContext);
  if (slice !== undefined) return slice;
  const fallback = use(SchoolContext);
  if (fallback !== undefined) return fallback.settings;
  throw new Error("useSchoolSettings must be used within a SchoolProvider");
}

export function useSchoolActions(): SchoolActionsType {
  const slice = useContext(SchoolActionsContext);
  if (slice !== undefined) return slice;
  const fallback = use(SchoolContext);
  if (fallback !== undefined) return fallback;
  throw new Error("useSchoolActions must be used within a SchoolProvider");
}

export function useSchoolLifecycle(): SchoolLifecycleType {
  const slice = useContext(SchoolLifecycleContext);
  if (slice !== undefined) return slice;
  const fallback = use(SchoolContext);
  if (fallback !== undefined) return fallback;
  throw new Error("useSchoolLifecycle must be used within a SchoolProvider");
}
