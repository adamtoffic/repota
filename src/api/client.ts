/**
 * HTTP Client with retry logic and error handling
 * Handles network requests, timeouts, and offline scenarios
 */

import { API_CONFIG, isLocalMode } from "./config";

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url: string, options: RequestOptions = {}): Promise<Response> {
  const { timeout = API_CONFIG.TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Request timeout", undefined, "TIMEOUT");
    }
    throw error;
  }
}

/**
 * Make HTTP request with retry logic
 */
async function requestWithRetry<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { retries = API_CONFIG.MAX_RETRIES, ...requestOptions } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, requestOptions);

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code,
        );
      }

      // Parse response
      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      // Don't retry on client errors (4xx)
      if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Don't retry if out of attempts
      if (attempt === retries) {
        break;
      }

      // Wait before retrying
      await sleep(API_CONFIG.RETRY_DELAY * (attempt + 1));
    }
  }

  throw lastError || new ApiError("Request failed after retries");
}

/**
 * HTTP Client
 */
export const httpClient = {
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    if (isLocalMode()) {
      throw new ApiError("Backend calls disabled in local mode", undefined, "LOCAL_MODE");
    }

    return requestWithRetry<T>(endpoint, {
      ...options,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  },

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    if (isLocalMode()) {
      throw new ApiError("Backend calls disabled in local mode", undefined, "LOCAL_MODE");
    }

    return requestWithRetry<T>(endpoint, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    if (isLocalMode()) {
      throw new ApiError("Backend calls disabled in local mode", undefined, "LOCAL_MODE");
    }

    return requestWithRetry<T>(endpoint, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    if (isLocalMode()) {
      throw new ApiError("Backend calls disabled in local mode", undefined, "LOCAL_MODE");
    }

    return requestWithRetry<T>(endpoint, {
      ...options,
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  },
};

export { ApiError };
