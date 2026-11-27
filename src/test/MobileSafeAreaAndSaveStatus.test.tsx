import { useRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { AppShell } from "../components/navigation/AppShell";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { useDialogA11y } from "../hooks/useDialogA11y";
import type { ProcessedStudent } from "../types";

function makeSchoolCtx(overrides: Partial<SchoolContextType> = {}): SchoolContextType {
  return {
    students: [],
    settings: DEFAULT_SETTINGS,
    isDataLoaded: true,
    isStorageReady: true,
    loadStatus: { students: "ok", settings: "ok" },
    loadError: false,
    isPersistenceSuspended: false,
    isRollbackIncomplete: false,
    isSaving: false,
    lastSaved: undefined,
    saveError: null,
    setSettings: vi.fn(),
    addStudent: vi.fn(),
    deleteStudent: vi.fn(),
    deletePendingStudents: vi.fn(),
    updateStudent: vi.fn(),
    clearAllScores: vi.fn(),
    clearStudentScores: vi.fn(),
    removeAllStudentPhotos: vi.fn(),
    updateClassNameForAll: vi.fn(),
    clearAllStudents: vi.fn(),
    restoreDefaults: vi.fn(),
    resetAllAppData: vi.fn(async () => true),
    loadDemoData: vi.fn(),
    detectComponentMismatches: vi.fn(() => ({ hasOutdated: false, hasMissing: false })),
    syncSubjectComponentsFromSettings: vi.fn(),
    applySbaConfig: vi.fn(() => DEFAULT_SETTINGS),
    updateAssessmentWeights: vi.fn(() => DEFAULT_SETTINGS),
    checkDuplicateName: vi.fn(() => false),
    autoGenerateRemarks: vi.fn(),
    retryLoad: vi.fn(),
    startFresh: vi.fn(),
    suspendPersistence: vi.fn(),
    resumePersistence: vi.fn(),
    markIncompleteRollback: vi.fn(),
    clearIncompleteRollback: vi.fn(),
    waitForMigration: vi.fn(async () => {}),
    ...overrides,
  };
}

const sampleStudent: ProcessedStudent = {
  id: "stu-1",
  name: "Ama Mensah",
  className: "Basic 4",
  gender: "Female",
  attendancePresent: 65,
  subjects: [{ id: "sub-1", name: "English Language", classScore: 40, examScore: 42 }],
  totalScore: 82,
  averageScore: 82,
  classPosition: "1st",
  aggregate: null,
};

function DialogFocusHarness() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ isOpen: open, onClose: () => setOpen(false), dialogRef });

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open Dialog
      </button>
      {open && (
        <div ref={dialogRef} role="dialog" tabIndex={-1}>
          <button type="button">First Control</button>
        </div>
      )}
    </div>
  );
}

describe("Mobile Sheet Safe Area & Docked Save Status", () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", { value: originalOnLine, configurable: true });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("calls focus({ preventScroll: true }) in useDialogA11y on open and close", () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    render(<DialogFocusHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Dialog" }));
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("adds safe-area top and bottom padding to Modal backdrop", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} ariaLabel="Safe modal">
        <div>Modal Body</div>
      </Modal>,
    );

    const backdrop = document.body.querySelector(".modal-backdrop") as HTMLElement;
    expect(backdrop.className).toContain("pt-[max(0.75rem,env(safe-area-inset-top,0px))]");
    expect(backdrop.className).toContain("pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]");
  });

  it("bakes top safe-area inset into ScoreEntryModal sticky mobile header and drops detached spacer", () => {
    const { container } = render(
      <SchoolContext.Provider value={makeSchoolCtx()}>
        <ScoreEntryModal
          student={sampleStudent}
          level="JHS"
          isOpen={true}
          onClose={vi.fn()}
          onUpdateStudent={vi.fn()}
        />
      </SchoolContext.Provider>,
    );

    expect(container.querySelector(".safe-top")).toBeNull();
    const header = screen.getByTestId("score-modal-header");
    expect(header.className).toContain("pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]");
    expect(header.className).toContain("max-sm:sticky");
    expect(header.className).toContain("max-sm:top-0");

    const classScoreInput = screen.getByLabelText("English Language Class Score");
    fireEvent.focusIn(classScoreInput);
    expect(header.className).toContain("relative");
    expect(header.className).not.toContain("max-sm:sticky");
  });

  it("renders inline header and sidebar AutoSaveIndicator variants cleanly without floating bottom-safe-nav classes", () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });

    const { container: idleHeader } = render(
      <AutoSaveIndicator variant="header" isSaving={false} />,
    );
    expect(idleHeader.innerHTML).toBe("");

    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const savedAt = new Date();
    const { container: headerBox, rerender: rerenderHeader } = render(
      <AutoSaveIndicator variant="header" isSaving={true} lastSaved={savedAt} />,
    );
    expect(headerBox.firstElementChild?.className).not.toContain("fixed");
    expect(headerBox.firstElementChild?.className).not.toContain("bottom-safe-nav");
    expect(screen.getByRole("status")).toHaveTextContent("Saving...");

    rerenderHeader(<AutoSaveIndicator variant="header" isSaving={false} lastSaved={savedAt} />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Offline");

    const { container: sidebarBox } = render(
      <AutoSaveIndicator variant="sidebar" isSaving={false} error="Disk full" />,
    );
    expect(sidebarBox.firstElementChild?.className).not.toContain("fixed");
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
  });

  it("removes floating bottom-safe-nav AutoSaveIndicator from AppShell and docks offline status into Sidebar and mobile PageHeader", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    const rootRoute = createRootRoute({ component: () => <Outlet /> });
    const homeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => (
        <AppShell>
          <PageHeader schoolName="Demo Academy" />
          <main id="main-content">Shell Child</main>
        </AppShell>
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([homeRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });

    const { container: shellContainer } = render(
      <SchoolContext.Provider value={makeSchoolCtx()}>
        <RouterProvider router={router} />
      </SchoolContext.Provider>,
    );

    expect(await screen.findByText("Shell Child")).toBeInTheDocument();
    expect(shellContainer.querySelector(".bottom-safe-nav")).toBeNull();
    expect(screen.getByText("Offline · Saved locally")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });
});
