import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";
import { WelcomeTour } from "../components/WelcomeTour";

describe("Modal and Overlay UX", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("WelcomeTour places close control cleanly in header bar, supports Back, and closes on Escape", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(
      <WelcomeTour
        steps={[
          { title: "Step One Title", description: "First description" },
          { title: "Step Two Title", description: "Second description" },
        ]}
        onComplete={onComplete}
        storageKey="test_tour_key"
      />,
    );

    act(() => {
      vi.advanceTimersByTime(800);
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const closeBtn = screen.getByRole("button", { name: "Close tour" });
    const title = screen.getByRole("heading", { name: "Step One Title" });
    expect(closeBtn.className).not.toContain("absolute");
    expect(title.parentElement).not.toContainElement(closeBtn);

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByRole("heading", { name: "Step Two Title" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(screen.getByRole("heading", { name: "Step One Title" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("test_tour_key")).toBe("true");
  });

  it("AutoSaveIndicator displays accurate offline copy", () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    try {
      render(<AutoSaveIndicator isSaving={false} />);
      expect(screen.getByText("Offline · Saved locally")).toBeInTheDocument();
      expect(screen.queryByText(/changes will sync/i)).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(navigator, "onLine", { value: originalOnLine, configurable: true });
    }
  });

  it("PwaInstallPrompt renders light-mode card without dark: overrides", () => {
    const { container } = render(<PwaInstallPrompt />);

    const promptEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    promptEvent.prompt = vi.fn().mockResolvedValue(undefined);
    promptEvent.userChoice = Promise.resolve({ outcome: "dismissed" });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(screen.getByText("Install Repota")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss install prompt" })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/\bdark:/);
  });
});
