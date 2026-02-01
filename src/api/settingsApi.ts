/**
 * Settings API Service
 * Handles all school settings-related backend operations
 * Falls back to local storage when in local mode
 */

import type { SchoolSettings } from "../types";
import { httpClient } from "./client";
import { getEndpoint, isLocalMode } from "./config";
import { loadFromStorage, saveToStorage, IDB_KEYS } from "../utils/idbStorage";

export interface SettingsApiResponse {
  settings: SchoolSettings;
  timestamp: string;
}

export interface UpdateSettingsResponse {
  settings: SchoolSettings;
  message: string;
}

/**
 * Fetch school settings
 */
export async function fetchSettings(): Promise<SchoolSettings | null> {
  if (isLocalMode()) {
    // Local mode - load from IndexedDB
    const settings = await loadFromStorage<SchoolSettings>(IDB_KEYS.SETTINGS);
    return settings;
  }

  // Backend mode
  const endpoint = getEndpoint("/settings");
  if (!endpoint) throw new Error("Invalid endpoint");

  const response = await httpClient.get<SettingsApiResponse>(endpoint);
  return response.settings;
}

/**
 * Update school settings
 */
export async function updateSettings(settings: SchoolSettings): Promise<SchoolSettings> {
  if (isLocalMode()) {
    // Local mode - handled by SchoolContext directly
    return settings;
  }

  // Backend mode
  const endpoint = getEndpoint("/settings");
  if (!endpoint) throw new Error("Invalid endpoint");

  const response = await httpClient.put<UpdateSettingsResponse>(endpoint, settings);
  return response.settings;
}

/**
 * Save settings to storage (local mode helper)
 * Called by SchoolContext after updates
 */
export async function saveSettingsLocal(settings: SchoolSettings): Promise<void> {
  await saveToStorage(IDB_KEYS.SETTINGS, settings);
}
