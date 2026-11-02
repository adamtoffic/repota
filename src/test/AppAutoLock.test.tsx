import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SchoolContextType } from "../context/SchoolContextDefinition";

const state = vi.hoisted(() => ({
  context: {
    settings: { autoLockTimeout: 12 },
  } as Partial<SchoolContextType>,
  idleOptions: [] as Array<{ timeout: number }>,
}));

vi.mock("../context/SchoolContext", () => ({
  SchoolProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../hooks/useSchoolData", () => ({
  useSchoolData: () => state.context,
}));

vi.mock("../hooks/useIdleTimer", () => ({
  useIdleTimer: (options: { timeout: number }) => {
    state.idleOptions.push(options);
  },
}));

vi.mock("../utils/pinSecurity", () => ({
  isPinConfigured: () => false,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, RouterProvider: () => null };
});

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

vi.mock("../components/OfflineDetector", () => ({ OfflineDetector: () => null }));
vi.mock("../components/PwaInstallPrompt", () => ({ PwaInstallPrompt: () => null }));

import App from "../App";

describe("App auto-lock timeout", () => {
  beforeEach(() => {
    state.context = { settings: { autoLockTimeout: 12 } };
    state.idleOptions = [];
  });

  it("uses the saved timeout in minutes", () => {
    render(<App />);

    expect(state.idleOptions.at(-1)?.timeout).toBe(12 * 60 * 1000);
  });

  it("uses five minutes when the setting is missing", () => {
    state.context = { settings: {} };
    render(<App />);

    expect(state.idleOptions.at(-1)?.timeout).toBe(5 * 60 * 1000);
  });

  it("applies a changed setting without remounting App", () => {
    const view = render(<App />);
    state.context = { settings: { autoLockTimeout: 2 } };

    view.rerender(<App />);

    expect(state.idleOptions.at(-1)?.timeout).toBe(2 * 60 * 1000);
  });
});
