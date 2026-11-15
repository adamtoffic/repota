/* eslint-disable react-refresh/only-export-components */
// src/router.tsx
import { lazy, Suspense, type ComponentType } from "react";
import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  type RouterHistory,
} from "@tanstack/react-router";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Dashboard } from "./pages/Dashboard";
import { SbaPage } from "./pages/SbaPage";
import { SettingsHub } from "./pages/settings/SettingsHub";
import { Analytics } from "./pages/Analytics";
import { PageLoader } from "./components/PageLoader";
import { DataGate } from "./components/DataGate";
import { SettingsFormProvider } from "./context/SettingsFormContext";
import { AppShell } from "./components/navigation/AppShell";
import {
  CHUNK_RELOAD_KEY,
  hasUnsavedChanges,
  isChunkLoadError,
  setUnsavedChanges,
} from "./utils/preloadErrorHandler";

export { CHUNK_RELOAD_KEY, hasUnsavedChanges, isChunkLoadError, setUnsavedChanges };

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
        if (hasUnsavedChanges()) {
          throw error;
        }

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
    if (
      hasUnsavedChanges() &&
      !window.confirm("You have unsaved changes that may be lost. Reload anyway?")
    ) {
      return;
    }
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

// Code-split heavy secondary pages with auto-reload retry on chunk failures
const SettingsSchoolPage = lazyWithRetry(() => import("./pages/settings/SettingsSchoolPage"));
const SettingsAcademicPage = lazyWithRetry(() => import("./pages/settings/SettingsAcademicPage"));
const SettingsTemplatesPage = lazyWithRetry(() => import("./pages/settings/SettingsTemplatesPage"));
const SettingsSecurityPage = lazyWithRetry(() => import("./pages/settings/SettingsSecurityPage"));
const PrintPreview = lazyWithRetry(() =>
  import("./pages/PrintPreview").then((module) => ({ default: module.PrintPreview })),
);

// 2. Define the Root Layout
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

// 3. Navigation Shell Layout Route (Excluded on /print and DataGate error/recovery screens)
function ShellLayout() {
  return (
    <DataGate>
      <AppShell>
        <Outlet />
      </AppShell>
    </DataGate>
  );
}

// Shared draft & auto-save provider scoped strictly to SBA and Settings routes
function SettingsFormLayout() {
  return (
    <SettingsFormProvider>
      <Outlet />
    </SettingsFormProvider>
  );
}

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "shell",
  component: ShellLayout,
});

const settingsFormRoute = createRoute({
  getParentRoute: () => shellRoute,
  id: "settings-form",
  component: SettingsFormLayout,
});

// 4. Define the Routes
const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/",
  component: Dashboard,
});

const sbaRoute = createRoute({
  getParentRoute: () => settingsFormRoute,
  path: "/sba",
  component: SbaPage,
});

const analyticsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/analytics",
  component: Analytics,
});

const settingsRoute = createRoute({
  getParentRoute: () => settingsFormRoute,
  path: "/settings",
  component: SettingsHub,
});

const settingsSchoolRoute = createRoute({
  getParentRoute: () => settingsFormRoute,
  path: "/settings/school",
  component: SettingsSchoolPage,
});

const settingsAcademicRoute = createRoute({
  getParentRoute: () => settingsFormRoute,
  path: "/settings/academic",
  component: SettingsAcademicPage,
});

const settingsTemplatesRoute = createRoute({
  getParentRoute: () => settingsFormRoute,
  path: "/settings/templates",
  component: SettingsTemplatesPage,
});

const settingsSecurityRoute = createRoute({
  getParentRoute: () => settingsFormRoute,
  path: "/settings/security",
  component: SettingsSecurityPage,
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

// 5. Build the Tree
export const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([
    indexRoute,
    analyticsRoute,
    settingsFormRoute.addChildren([
      sbaRoute,
      settingsRoute,
      settingsSchoolRoute,
      settingsAcademicRoute,
      settingsTemplatesRoute,
      settingsSecurityRoute,
    ]),
  ]),
  printRoute,
]);

// 6. Create the Router
export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultErrorComponent: RouteErrorFallback,
  });
}

export const router = createAppRouter();

// 7. Register types
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
