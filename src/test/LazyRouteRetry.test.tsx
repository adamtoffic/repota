import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import {
  CHUNK_RELOAD_KEY,
  isChunkLoadError,
  lazyWithRetry,
  RouteErrorFallback,
} from "../router";
import { setupVitePreloadErrorHandler } from "../utils/preloadErrorHandler";

describe("Lazy Route Retry & MIME Protection", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    // Mock window.location.reload
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        reload: vi.fn(),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  describe("isChunkLoadError", () => {
    it("identifies dynamic import module fetch failure", () => {
      const err = new TypeError(
        "Failed to fetch dynamically imported module: https://repota.app/assets/Settings-ABC12345.js",
      );
      expect(isChunkLoadError(err)).toBe(true);
    });

    it("identifies HTML MIME type module errors", () => {
      const err = new TypeError(
        'Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html".',
      );
      expect(isChunkLoadError(err)).toBe(true);
    });

    it("identifies ChunkLoadError by name and message", () => {
      const chunkErr = new Error("Loading chunk 42 failed");
      chunkErr.name = "ChunkLoadError";
      expect(isChunkLoadError(chunkErr)).toBe(true);
    });

    it("identifies CSS chunk errors", () => {
      const cssErr = new Error("loading css chunk 5 failed");
      expect(isChunkLoadError(cssErr)).toBe(true);
    });

    it("returns false for regular application or network errors", () => {
      expect(isChunkLoadError(new Error("Network Error 500"))).toBe(false);
      expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'foo')"))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
    });
  });

  describe("lazyWithRetry", () => {
    it("resolves the component and clears the reload flag on successful load", async () => {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");
      const MockComponent = () => <div>Lazy Loaded Content</div>;
      const factory = vi.fn().mockResolvedValue({ default: MockComponent });

      const LazyComp = lazyWithRetry(factory);

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComp />
        </Suspense>,
      );

      expect(await screen.findByText("Lazy Loaded Content")).toBeInTheDocument();
      expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
      expect(window.location.reload).not.toHaveBeenCalled();
    });

    it("triggers a single reload when a chunk load error occurs and guard is not set", async () => {
      const chunkErr = new TypeError("Failed to fetch dynamically imported module: /assets/Chunk.js");
      const factory = vi.fn().mockRejectedValue(chunkErr);

      const LazyComp = lazyWithRetry(factory);

      render(
        <Suspense fallback={<div>Suspense Fallback</div>}>
          <LazyComp />
        </Suspense>,
      );

      await waitFor(() => {
        expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe("true");
        expect(window.location.reload).toHaveBeenCalledTimes(1);
      });

      // Suspense fallback remains rendered while reload is triggered
      expect(screen.getByText("Suspense Fallback")).toBeInTheDocument();
    });

    it("rethrows the error and does not reload if reload was already attempted", async () => {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");
      const chunkErr = new TypeError("Failed to fetch dynamically imported module: /assets/Chunk.js");
      const factory = vi.fn().mockRejectedValue(chunkErr);

      // Prevent console.error noise from uncaught React boundary test errors
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      class TestErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { error: Error | null }
      > {
        state = { error: null };
        static getDerivedStateFromError(error: Error) {
          return { error };
        }
        render() {
          if (this.state.error) {
            return <div>Boundary Caught: {(this.state.error as Error).message}</div>;
          }
          return this.props.children;
        }
      }

      const LazyComp = lazyWithRetry(factory);

      render(
        <TestErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <LazyComp />
          </Suspense>
        </TestErrorBoundary>,
      );

      expect(
        await screen.findByText(/Boundary Caught: Failed to fetch dynamically imported module/),
      ).toBeInTheDocument();
      expect(window.location.reload).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("rethrows immediately without reloading for non-chunk errors", async () => {
      const appErr = new Error("Application logic failed during initialization");
      const factory = vi.fn().mockRejectedValue(appErr);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      class TestErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { error: Error | null }
      > {
        state = { error: null };
        static getDerivedStateFromError(error: Error) {
          return { error };
        }
        render() {
          if (this.state.error) {
            return <div>Boundary Caught: {(this.state.error as Error).message}</div>;
          }
          return this.props.children;
        }
      }

      const LazyComp = lazyWithRetry(factory);

      render(
        <TestErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <LazyComp />
          </Suspense>
        </TestErrorBoundary>,
      );

      expect(
        await screen.findByText("Boundary Caught: Application logic failed during initialization"),
      ).toBeInTheDocument();
      expect(window.location.reload).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
      consoleSpy.mockRestore();
    });

    it("rethrows and suppresses reload when sessionStorage throws", async () => {
      const storageSpy = vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
        throw new DOMException("Access denied", "SecurityError");
      });
      const chunkErr = new TypeError("Failed to fetch dynamically imported module: /assets/Chunk.js");
      const factory = vi.fn().mockRejectedValue(chunkErr);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      class TestErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { error: Error | null }
      > {
        state = { error: null };
        static getDerivedStateFromError(error: Error) {
          return { error };
        }
        render() {
          if (this.state.error) {
            return <div>Boundary Caught: {(this.state.error as Error).message}</div>;
          }
          return this.props.children;
        }
      }

      const LazyComp = lazyWithRetry(factory);

      render(
        <TestErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <LazyComp />
          </Suspense>
        </TestErrorBoundary>,
      );

      expect(
        await screen.findByText(/Boundary Caught: Failed to fetch dynamically imported module/),
      ).toBeInTheDocument();
      expect(window.location.reload).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
      storageSpy.mockRestore();
    });

    it("rethrows and suppresses reload when sessionStorage.setItem throws", async () => {
      const storageSpy = vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });
      const chunkErr = new TypeError("Failed to fetch dynamically imported module: /assets/Chunk.js");
      const factory = vi.fn().mockRejectedValue(chunkErr);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      class TestErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { error: Error | null }
      > {
        state = { error: null };
        static getDerivedStateFromError(error: Error) {
          return { error };
        }
        render() {
          if (this.state.error) {
            return <div>Boundary Caught: {(this.state.error as Error).message}</div>;
          }
          return this.props.children;
        }
      }

      const LazyComp = lazyWithRetry(factory);

      render(
        <TestErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <LazyComp />
          </Suspense>
        </TestErrorBoundary>,
      );

      expect(
        await screen.findByText(/Boundary Caught: Failed to fetch dynamically imported module/),
      ).toBeInTheDocument();
      expect(window.location.reload).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
      storageSpy.mockRestore();
    });
  });

  describe("RouteErrorFallback", () => {
    it("renders fallback UI with heading and description", () => {
      render(<RouteErrorFallback error={new Error("Chunk failed")} />);

      expect(screen.getByText("Unable to load this page")).toBeInTheDocument();
      expect(
        screen.getByText("Unable to load this page — check your connection and reload"),
      ).toBeInTheDocument();
      expect(screen.getByText("Chunk failed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reload app/i })).toBeInTheDocument();
    });

    it("resets chunk reload key and reloads when Reload App button is clicked", () => {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");

      render(<RouteErrorFallback error={new Error("Chunk failed")} />);

      const button = screen.getByRole("button", { name: /reload app/i });
      fireEvent.click(button);

      expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe("vite:preloadError listener", () => {
    let cleanupPreload: (() => void) | undefined;

    beforeEach(() => {
      cleanupPreload = setupVitePreloadErrorHandler();
    });

    afterEach(() => {
      cleanupPreload?.();
    });

    it("reloads when vite:preloadError fires and reload key is not set", () => {
      window.dispatchEvent(new CustomEvent("vite:preloadError"));

      expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe("true");
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it("does not reload again if vite:preloadError fires and reload key is already set", () => {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");
      window.dispatchEvent(new CustomEvent("vite:preloadError"));

      expect(window.location.reload).not.toHaveBeenCalled();
    });

    it("suppresses reload when sessionStorage throws during vite:preloadError", () => {
      const storageSpy = vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
        throw new DOMException("Access denied", "SecurityError");
      });

      window.dispatchEvent(new CustomEvent("vite:preloadError"));

      expect(window.location.reload).not.toHaveBeenCalled();
      storageSpy.mockRestore();
    });
  });
});
