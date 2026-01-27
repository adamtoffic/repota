// src/router.tsx
import { lazy, Suspense } from "react";
import { createRouter, createRoute, createRootRoute, Outlet } from "@tanstack/react-router";
import { Dashboard } from "./pages/Dashboard";
import { PageLoader } from "./components/PageLoader";

// Code-split heavy pages
const Settings = lazy(() => import("./pages/Settings"));
const PrintPreview = lazy(() => import("./pages/PrintPreview"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SubjectEntry = lazy(() => import("./pages/SubjectEntry"));

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
  component: Dashboard,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});

const printRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/print",
  component: PrintPreview,
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
  component: Analytics,
});

const subjectEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/subject-entry",
  component: SubjectEntry,
});

// 4. Build the Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute,
  printRoute,
  analyticsRoute,
  subjectEntryRoute,
]);

// 5. Create the Router
export const router = createRouter({ routeTree });

// 6. Register types
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
