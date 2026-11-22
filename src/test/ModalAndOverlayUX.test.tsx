import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { BulkAttendanceModal } from "../components/BulkAttendanceModal";
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { WelcomeTour } from "../components/WelcomeTour";
import { Modal } from "../components/ui/Modal";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { ToastContext } from "../context/ToastContextDefinition";
import { createAppRouter } from "../router";
import type { ProcessedStudent } from "../types";

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

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

  it("PwaInstallPrompt renders with semantic surface tokens matching the app theme", () => {
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
    expect(container.innerHTML).toContain("bg-elevated");
    expect(container.innerHTML).toContain("text-main");
    expect(container.innerHTML).not.toMatch(/\bbg-white\b|\bdark:bg-gray-900\b/);
  });

  it("Modal closes on Escape when closeOnBackdrop is false, and ScoreEntryModal closes on Escape", () => {
    const onModalClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onModalClose} closeOnBackdrop={false}>
        <div>Locked Backdrop Content</div>
      </Modal>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onModalClose).toHaveBeenCalledTimes(1);

    const onScoreClose = vi.fn();
    const student: ProcessedStudent = {
      id: "stu-1",
      name: "Ama Mensah",
      className: "Basic 5",
      gender: "Female",
      subjects: [],
      totalScore: 0,
      averageScore: 0,
      classPosition: "Pending...",
      aggregate: undefined,
    };
    const ctx = {
      students: [student],
      settings: DEFAULT_SETTINGS,
      clearStudentScores: vi.fn(),
      detectComponentMismatches: () => ({
        hasOutdated: false,
        hasMissing: false,
        outdatedStudents: [],
        missingStudents: [],
      }),
      syncSubjectComponentsFromSettings: vi.fn(),
    } as unknown as SchoolContextType;

    render(
      <SchoolContext.Provider value={ctx}>
        <ScoreEntryModal
          student={student}
          level="PRIMARY"
          isOpen={true}
          onClose={onScoreClose}
          onUpdateStudent={vi.fn()}
        />
      </SchoolContext.Provider>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onScoreClose).toHaveBeenCalledTimes(1);
  });

  it("BulkAttendanceModal initializes fresh student attendance whenever reopened", () => {
    const studentOne: ProcessedStudent = {
      id: "stu-1",
      name: "Kofi Boateng",
      className: "Basic 5",
      attendancePresent: 40,
      subjects: [],
      totalScore: 0,
      averageScore: 0,
      classPosition: "Pending...",
      aggregate: undefined,
    };

    const makeCtx = (attendance: number) =>
      ({
        students: [{ ...studentOne, attendancePresent: attendance }],
        settings: DEFAULT_SETTINGS,
        updateStudent: vi.fn(),
      }) as unknown as SchoolContextType;

    const { rerender } = render(
      <ToastContext.Provider value={{ showToast: vi.fn() }}>
        <SchoolContext.Provider value={makeCtx(40)}>
          <BulkAttendanceModal isOpen={true} onClose={vi.fn()} />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    expect(screen.getByLabelText("Kofi Boateng Attendance")).toHaveValue(40);

    // Close modal while underlying student changes to 55 days
    rerender(
      <ToastContext.Provider value={{ showToast: vi.fn() }}>
        <SchoolContext.Provider value={makeCtx(55)}>
          <BulkAttendanceModal isOpen={false} onClose={vi.fn()} />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    // Reopen -> shows updated 55 rather than stale 40
    rerender(
      <ToastContext.Provider value={{ showToast: vi.fn() }}>
        <SchoolContext.Provider value={makeCtx(55)}>
          <BulkAttendanceModal isOpen={true} onClose={vi.fn()} />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    expect(screen.getByLabelText("Kofi Boateng Attendance")).toHaveValue(55);
  });

  it("renders helpful Page not found fallback with Back to Home link on unknown routes", async () => {
    const router = createAppRouter(createMemoryHistory({ initialEntries: ["/unknown-page"] }));
    const ctx = {
      isDataLoaded: true,
      loadError: false,
      isRollbackIncomplete: false,
      isSaving: false,
      lastSaved: null,
      students: [],
      settings: DEFAULT_SETTINGS,
      retryLoad: vi.fn(),
      startFresh: vi.fn(),
      activeRecoveryAction: null,
      setActiveRecoveryAction: vi.fn(),
    } as unknown as SchoolContextType;

    render(
      <SchoolContext.Provider value={ctx}>
        <RouterProvider router={router} />
      </SchoolContext.Provider>,
    );

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Home/i })).toHaveAttribute("href", "/");
  });
});
