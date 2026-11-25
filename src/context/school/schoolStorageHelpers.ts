import { z } from "zod";
import type { SchoolSettings, StudentRecord } from "../../types";
import { compatibleStudentSchema, mergeSettings } from "../../utils/backupValidation";
import { IDB_KEYS, getStorageType } from "../../utils/idbStorage";
import { disablePinLock } from "../../utils/pinSecurity";
import { CHUNK_RELOAD_KEY } from "../../utils/preloadErrorHandler";
import { REPORT_LEDGER_STORAGE_KEY } from "../../utils/reportAnalytics";
import { stripDerivedStudentFields } from "../../utils/studentSanitizer";
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  resolveTheme,
} from "../../utils/theme";

/** Maximum wait before startup storage hydration fails over to recovery UI. */
export const LOAD_TIMEOUT_MS = 10_000;
/** Maximum wait before `waitForMigration` rejects during backup import or fresh recovery. */
export const MIGRATION_WAIT_TIMEOUT_MS = 10_000;
export type LoadKeyStatus = "ok" | "error";
export type LoadStatus = { students: LoadKeyStatus; settings: LoadKeyStatus };

export function readIncompleteRollbackFlag(): boolean {
  try {
    return localStorage.getItem("repota_incomplete_rollback") === "true";
  } catch {
    return false;
  }
}

export function writeIncompleteRollbackFlag(active: boolean): void {
  try {
    if (active) {
      localStorage.setItem("repota_incomplete_rollback", "true");
    } else {
      localStorage.removeItem("repota_incomplete_rollback");
    }
  } catch {
    // ignore storage access errors
  }
}

export function parseHydratedStudentsValue(value: unknown, stripDerived = false): StudentRecord[] | null {
  const parsed = z.array(compatibleStudentSchema).safeParse(value);
  if (!parsed.success) {
    console.error("Corrupted student records in storage:", parsed.error);
    return null;
  }
  const records = parsed.data as StudentRecord[];
  return stripDerived ? records.map(stripDerivedStudentFields) : records;
}

export function parseHydratedSettingsValue(value: unknown, contextLabel = "storage"): SchoolSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    console.error(`Corrupted settings in ${contextLabel} (not an object):`, value);
    return null;
  }
  try {
    const validated = mergeSettings(value as Record<string, unknown>);
    return validated as unknown as SchoolSettings;
  } catch (err) {
    console.error(`Corrupted settings in ${contextLabel}:`, err);
    return null;
  }
}

export function clearResetDevicePreferences(): void {
  try {
    disablePinLock();
  } catch {
    // ignore storage access errors
  }

  const keysToRemove = [
    "app_pin_lockout",
    "repota_backup_check",
    "repota_last_backup",
    "repota_had_data",
    "repota_incomplete_rollback",
    "repota_idb_migrated",
    "welcome_tour_completed",
    "repota_welcome_tour_v2",
    "pwa-install-dismissed",
    THEME_STORAGE_KEY,
    REPORT_LEDGER_STORAGE_KEY,
    ...(getStorageType() === "indexeddb" ? [IDB_KEYS.STUDENTS, IDB_KEYS.SETTINGS] : []),
  ];
  try {
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage access errors
  }

  try {
    sessionStorage.removeItem("repota_backup_reminder_shown");
    sessionStorage.removeItem("repota_dismiss_photo_warning");
    sessionStorage.removeItem("data_loss_checked");
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // ignore storage access errors
  }

  const resolvedTheme = resolveTheme("system");
  applyThemeToDocument(resolvedTheme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { preference: "system", resolved: resolvedTheme },
      }),
    );
  }
}
