// src/router.tsx
import { createRouter, createRoute, createRootRoute, Outlet } from "@tanstack/react-router"; // 1. Added Outlet
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { PrintPreview } from "./pages/PrintPreview";

// 2. Define the Root Layout (The Shell)
const rootRoute = createRootRoute({
  component: () => (
    <>
      {/* This is where the children (Dashboard, Settings, etc.) will appear */}
      <Outlet />
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

// 4. Build the Tree
const routeTree = rootRoute.addChildren([indexRoute, settingsRoute, printRoute]);

// 5. Create the Router
export const router = createRouter({ routeTree });

// 6. Register types
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
