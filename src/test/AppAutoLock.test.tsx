import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SchoolContextType } from "../context/SchoolContextDefinition";

const state = vi.hoisted(() => ({
  context: {
    settings: { autoLockTimeout: 12 },
  } as Partial<SchoolContextType>,
  idleOptions: [] as Array<{ timeout: number }>,
  pinConfigured: false,
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
  isPinConfigured: () => state.pinConfigured,
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
vi.mock("../components/LockScreen", () => ({
  LockScreen: () => <div>Locked</div>,
}));

import App, { HIDDEN_LOCK_GRACE_MS, PRINT_LOCK_SUPPRESSION_MS } from "../App";

describe("App auto-lock timeout", () => {
  beforeEach(() => {
    state.context = { settings: { autoLockTimeout: 12 } };
    state.idleOptions = [];
    state.pinConfigured = false;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("does not lock when a hidden page returns within the grace period", () => {
    render(<App />);
    state.pinConfigured = true;

    act(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(29_999);
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.queryByText("Locked")).not.toBeInTheDocument();
  });

  it("locks when a PIN-protected page stays hidden for the grace period", () => {
    render(<App />);
    state.pinConfigured = true;

    act(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(30_000);
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByText("Locked")).toBeInTheDocument();
  });

  it("does not lock on return while print suppression is active", async () => {
    const { PRINT_STARTED_EVENT } = await import("../utils/printHandler");
    render(<App />);
    state.pinConfigured = true;

    act(() => {
      window.dispatchEvent(new Event(PRINT_STARTED_EVENT));
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(60_000);
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.queryByText("Locked")).not.toBeInTheDocument();
  });

  it("allows the hidden-page lock after print suppression expires", async () => {
    const { PRINT_STARTED_EVENT } = await import("../utils/printHandler");
    render(<App />);
    state.pinConfigured = true;

    act(() => {
      window.dispatchEvent(new Event(PRINT_STARTED_EVENT));
      vi.advanceTimersByTime(PRINT_LOCK_SUPPRESSION_MS);
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(30_000);
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByText("Locked")).toBeInTheDocument();
  });

  it("clears print suppression when afterprint fires", async () => {
    const { PRINT_STARTED_EVENT } = await import("../utils/printHandler");
    render(<App />);
    state.pinConfigured = true;

    act(() => {
      window.dispatchEvent(new Event(PRINT_STARTED_EVENT));
      window.dispatchEvent(new Event("afterprint"));
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(HIDDEN_LOCK_GRACE_MS);
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByText("Locked")).toBeInTheDocument();
  });
});
