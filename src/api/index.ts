/**
 * API Module Index
 * Central export point for all API services
 */

// Configuration
export { API_CONFIG, isLocalMode, isBackendMode, getEndpoint } from "./config";

// HTTP Client
export { httpClient, ApiError } from "./client";

// Service APIs
export * from "./studentApi";
export * from "./settingsApi";
export * from "./analyticsApi";
