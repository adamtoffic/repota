/**
 * Analytics API Service
 * Handles analytics data tracking and aggregation
 * Queues events when offline, syncs when online
 */

import { httpClient } from "./client";
import { getEndpoint, isLocalMode } from "./config";

export interface AnalyticsEvent {
  eventType: string;
  data: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
}

export interface AnalyticsStats {
  totalStudents: number;
  averageScore: number;
  topPerformers: number;
  needsImprovement: number;
  timestamp: string;
}

// Offline queue for analytics events
let eventQueue: AnalyticsEvent[] = [];

/**
 * Track an analytics event
 */
export async function trackEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
  const event: AnalyticsEvent = {
    eventType,
    data,
    timestamp: new Date().toISOString(),
  };

  if (isLocalMode()) {
    // In local mode, just log for development
    console.log("[Analytics]", eventType, data);
    return;
  }

  // Queue event
  eventQueue.push(event);

  // Try to sync immediately
  await syncEvents();
}

/**
 * Sync queued events to backend
 */
export async function syncEvents(): Promise<void> {
  if (isLocalMode() || eventQueue.length === 0) {
    return;
  }

  const endpoint = getEndpoint("/analytics/events");
  if (!endpoint) return;

  try {
    // Send events in batch
    await httpClient.post(endpoint, { events: eventQueue });

    // Clear queue on success
    eventQueue = [];
  } catch (error) {
    // Keep events in queue for next sync
    console.error("Failed to sync analytics events:", error);
  }
}

/**
 * Fetch aggregated analytics stats
 */
export async function fetchAnalyticsStats(): Promise<AnalyticsStats | null> {
  if (isLocalMode()) {
    // Local mode - no backend stats
    return null;
  }

  const endpoint = getEndpoint("/analytics/stats");
  if (!endpoint) throw new Error("Invalid endpoint");

  const response = await httpClient.get<AnalyticsStats>(endpoint);
  return response;
}

/**
 * Get queued events count (for debugging)
 */
export function getQueuedEventsCount(): number {
  return eventQueue.length;
}
