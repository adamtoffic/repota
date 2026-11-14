/* eslint-disable react-refresh/only-export-components */
// src/router.tsx
import { lazy, Suspense, type ComponentType } from "react";
import { createRouter, createRoute, createRootRoute, Outlet } from "@tanstack/react-router";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Dashboard } from "./pages/Dashboard";
import { PageLoader } from "./components/PageLoader";
import { DataGate } from "./components/DataGate";
import { CHUNK_RELOAD_KEY } from "./utils/preloadErrorHandler";

export { CHUNK_RELOAD_KEY };

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  return (
    name === "ChunkLoadError" ||
    /chunkloaderror/i.test(name) ||
    /failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /javascript mime type/i.test(msg) ||
    /mime type/i.test(msg) ||
    /loading (chunk|css chunk)/i.test(msg)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const module = await factory();
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      } catch {
        // ignore storage access errors
      }
      return module;
    } catch (error) {
      const isChunk = isChunkLoadError(error);
      if (isChunk) {
        let canReload = false;
        try {
          const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "true";
          if (!alreadyReloaded) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");
            canReload = true;
          }
        } catch {
          // If sessionStorage throws or is blocked, do not reload to prevent infinite loops
          canReload = false;
        }

        if (canReload) {
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }

      throw error;
    }
  });
}

export function RouteErrorFallback({ error }: { error?: unknown }) {
  const handleReload = () => {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    } catch {
      // ignore storage access errors
    }
    window.location.reload();
  };

  const errorMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  return (
    <div className="bg-background flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-lg sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-main text-xl font-bold">Unable to load this page</h2>
        <p className="mt-2 text-sm text-gray-600">
          Unable to load this page — check your connection and reload
        </p>
        {errorMessage && (
          <div className="mt-4 max-h-24 overflow-auto rounded-lg bg-gray-50 p-2 text-left">
            <p className="font-mono text-xs break-all text-gray-500">{errorMessage}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleReload}
          className="bg-primary hover:bg-primary/90 mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-sm transition active:scale-95"
        >
          <RefreshCcw className="h-4 w-4" />
          Reload App
        </button>
      </div>
    </div>
  );
}

// Code-split heavy pages with auto-reload retry on chunk failures
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const PrintPreview = lazyWithRetry(() =>
  import("./pages/PrintPreview").then((module) => ({ default: module.PrintPreview })),
);
const Analytics = lazyWithRetry(() => import("./pages/Analytics"));

// 2. Define the Root Layout (The Shell)
const rootRoute = createRootRoute({
  component: () => (
    <>
      {/* Suspense boundary for lazy-loaded routes */}
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </>
  ),
});

// 3. Define the Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <DataGate>
      <Dashboard />
    </DataGate>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <DataGate>
      <Settings />
    </DataGate>
  ),
});

const printRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/print",
  component: () => (
    <DataGate>
      <PrintPreview />
    </DataGate>
  ),
  // This tells TypeScript: "Hey, we accept an optional 'id' in the URL"
  validateSearch: (search: Record<string, unknown>): { id?: string } => {
    return {
      id: (search.id as string) || undefined,
    };
  },
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: () => (
    <DataGate>
      <Analytics />
    </DataGate>
  ),
});

// 4. Build the Tree
const routeTree = rootRoute.addChildren([indexRoute, settingsRoute, printRoute, analyticsRoute]);

// 5. Create the Router
export const router = createRouter({
  routeTree,
  defaultErrorComponent: RouteErrorFallback,
});

// 6. Register types
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
