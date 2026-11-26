import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: {
    STUDENTS: "ges_v1_students",
    SETTINGS: "ges_v1_settings",
  },
  getStorageType: vi.fn(() => "indexeddb"),
  subscribeToStorageSync: vi.fn(() => () => {}),
  ...storage,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
  getTimeSinceBackup: vi.fn(() => null),
}));

import { ConfirmModal } from "../components/ConfirmModal";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { LockScreen } from "../components/LockScreen";
import { FilterPanel } from "../components/analytics/FilterPanel";
import { SbaMarkbookMobileView } from "../components/sba/SbaMarkbookMobileView";
import { DetailsTab } from "../components/tabs/DetailsTab";
import { Alert, Input, Modal, Select, Textarea, Tooltip } from "../components/ui";
import { SchoolProvider } from "../context/SchoolContext";
import { createAppRouter } from "../router";
import { setUnsavedChanges } from "../utils/preloadErrorHandler";
import { setupPin } from "../utils/pinSecurity";

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const demoSettings: SchoolSettings = {
  schoolName: "A11y Interactive Academy",
  academicYear: "2026/2027",
  term: "First Term",
  level: "JHS",
  defaultSubjects: ["English", "Mathematics"],
  totalAttendanceDays: 80,
  classScoreMax: 50,
  examScoreMax: 50,
  classSize: 30,
  nextTermStarts: "2027-01-12",
  headTeacherName: "Head Teacher",
  classTeacherName: "Class Teacher",
  className: "JHS 1",
  phoneNumber: "0200000000",
  address: "Accra",
  email: "a11y@example.com",
  schoolMotto: "Access For All",
  logoUrl: "",
  headTeacherSignature: "",
  teacherSignature: "",
  schoolType: "STANDARD",
  examType: "TERMLY",
  componentLibrary: [],
  subjectComponentMap: {},
};

const demoStudents: StudentRecord[] = [
  {
    id: "stu-1",
    name: "Ama Mensah",
    className: "JHS 1",
    gender: "Female",
    attendancePresent: 75,
    subjects: [
      { id: "s1", name: "English", classScore: 40, examScore: 42 },
      { id: "s2", name: "Mathematics", classScore: 38, examScore: 40 },
    ],
  },
];

const processedStudent: ProcessedStudent = {
  ...demoStudents[0],
  totalScore: 162,
  averageScore: 81,
  classPosition: "1st",
  aggregate: 6,
};

function renderAppAt(initialPath: string) {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const testRouter = createAppRouter(history);

  const utils = render(
    <SchoolProvider>
      <RouterProvider router={testRouter} />
    </SchoolProvider>,
  );

  return { ...utils, router: testRouter };
}

describe("Interactive accessibility (WCAG Branch 2)", () => {
  beforeAll(async () => {
    await Promise.all([
      import("../pages/Dashboard"),
      import("../pages/Analytics"),
      import("../pages/settings/SettingsAcademicPage"),
    ]);
  }, 30000);

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.style.overflow = "";
    setUnsavedChanges(false);
    storage.initStorage.mockReset().mockResolvedValue(undefined);
    storage.migrateFromLocalStorage
      .mockReset()
      .mockResolvedValue({ success: true, studentsCount: 0 });
    storage.saveToStorage.mockReset().mockResolvedValue(true);
    storage.saveEntriesToStorage.mockReset().mockResolvedValue(true);
    storage.loadFromStorageResult.mockReset().mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: demoStudents };
      }
      if (key === "ges_v1_settings") {
        return { status: "found", value: demoSettings };
      }
      return { status: "empty" };
    });
  });

  afterEach(() => {
    document.body.style.overflow = "";
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("portals Modal to document.body, traps Tab focus, locks scroll, restores trigger focus, and pops only top stacked dialog on Escape", () => {
    function StackedModalHarness() {
      const [outerOpen, setOuterOpen] = useState(false);
      const [confirmOpen, setConfirmOpen] = useState(false);

      return (
        <div>
          <button type="button" onClick={() => setOuterOpen(true)}>
            Launch Dialog
          </button>

          <Modal
            isOpen={outerOpen}
            onClose={() => setOuterOpen(false)}
            ariaLabel="Outer Dialog"
          >
            <div>
              <button type="button" onClick={() => setConfirmOpen(true)}>
                Open Confirm
              </button>
              <button type="button" onClick={() => setOuterOpen(false)}>
                Close Outer
              </button>
            </div>
          </Modal>

          <ConfirmModal
            isOpen={confirmOpen}
            title="Confirm Action"
            message="Are you sure?"
            onConfirm={() => setConfirmOpen(false)}
            onClose={() => setConfirmOpen(false)}
          />
        </div>
      );
    }

    const { container } = render(<StackedModalHarness />);
    const trigger = screen.getByRole("button", { name: "Launch Dialog" });
    trigger.focus();

    fireEvent.click(trigger);

    // Portaled to document.body, not inside inline container
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe("hidden");

    const openConfirmBtn = screen.getByRole("button", { name: "Open Confirm" });
    const closeOuterBtn = screen.getByRole("button", { name: "Close Outer" });
    expect(openConfirmBtn).toHaveFocus();

    // Tabbing wraps inside modal
    fireEvent.keyDown(window, { key: "Tab" });
    // Dispatch focus transition simulated check: Shift+Tab on first moves to last, Tab on last moves to first
    closeOuterBtn.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(openConfirmBtn).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(closeOuterBtn).toHaveFocus();

    // Open stacked ConfirmModal -> Escape closes ONLY ConfirmModal
    fireEvent.click(openConfirmBtn);
    expect(screen.getAllByRole("dialog")).toHaveLength(2);

    // Backdrop click works even without onCancel prop
    const dialogs = screen.getAllByRole("dialog");
    fireEvent.click(dialogs[1].parentElement!);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    // Re-open ConfirmModal and press Escape -> only ConfirmModal closes
    fireEvent.click(openConfirmBtn);
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(document.body.style.overflow).toBe("hidden");

    // Second Escape closes outer Modal, unlocks body scroll, and restores trigger focus
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
  });

  it("links labels, aria-invalid, aria-describedby, and role=alert on Input, Select, and Textarea, and separates DetailsTab shuffle actions", () => {
    render(
      <div>
        <Input
          label="Student Name"
          labelAction={<button type="button">Randomize</button>}
          error="Name is required"
        />
        <Select label="Academic Term" error="Pick a term">
          <option value="1">First Term</option>
        </Select>
        <Textarea label="Teacher Remark" error="Remark too long" />
      </div>,
    );

    const nameInput = screen.getByLabelText(/Student Name/i);
    const randomizeBtn = screen.getByRole("button", { name: "Randomize" });
    expect(randomizeBtn.closest("label")).toBeNull();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    const nameError = screen.getByText("Name is required");
    expect(nameError).toHaveAttribute("role", "alert");
    expect(nameInput).toHaveAttribute("aria-describedby", nameError.id);

    const termSelect = screen.getByLabelText("Academic Term");
    expect(termSelect).toHaveAttribute("aria-invalid", "true");
    const selectError = screen.getByText("Pick a term");
    expect(selectError).toHaveAttribute("role", "alert");
    expect(termSelect).toHaveAttribute("aria-describedby", selectError.id);

    const remarkBox = screen.getByLabelText("Teacher Remark");
    expect(remarkBox).toHaveAttribute("aria-invalid", "true");
    const textareaError = screen.getByText("Remark too long");
    expect(textareaError).toHaveAttribute("role", "alert");
    expect(remarkBox).toHaveAttribute("aria-describedby", textareaError.id);
  });

  it("separates Shuffle buttons from <label> in DetailsTab and labels all Settings/Filter selects", async () => {
    const academic = renderAppAt("/settings/academic");
    const termSelect = await screen.findByLabelText("Term / Semester");
    expect(termSelect.tagName).toBe("SELECT");
    const classNameInput = screen.getByLabelText("Class Name");
    expect(classNameInput.tagName).toBe("INPUT");
    academic.unmount();

    const filterRender = render(
      <FilterPanel
        filters={{
          gender: "All",
          performanceLevel: "All",
          subjectFilter: "All",
          scoreRange: { min: 0, max: 100 },
        }}
        onFilterChange={vi.fn()}
        availableSubjects={["Mathematics"]}
      />,
    );
    expect(screen.getByLabelText("Gender").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Performance Level").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Subject Focus").tagName).toBe("SELECT");
    filterRender.unmount();

    render(
      <SchoolProvider>
        <DetailsTab student={processedStudent} onUpdate={vi.fn()} />
      </SchoolProvider>,
    );
    const conductShuffle = await screen.findByRole("button", { name: "Shuffle conduct trait" });
    const interestShuffle = screen.getByRole("button", { name: "Shuffle interest or talent" });
    expect(conductShuffle.closest("label")).toBeNull();
    expect(interestShuffle.closest("label")).toBeNull();
  });

  it("assigns semantic roles on Alert and makes Tooltip hoverable and Escape-dismissible", () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <div>
        <Alert variant="info">Static info</Alert>
        <Alert variant="success">Saved successfully</Alert>
        <Alert variant="warning">Watch out</Alert>
        <Tooltip content="SBA weight tip" />
      </div>,
    );

    expect(screen.getByText("Static info").closest('[role="note"]')).not.toBeNull();
    expect(screen.getByText("Saved successfully").closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText("Watch out").closest('[role="alert"]')).not.toBeNull();

    const trigger = screen.getByLabelText("More information");
    expect(trigger).not.toHaveAttribute("role", "tooltip");

    fireEvent.mouseEnter(trigger.parentElement!);
    const popup = screen.getByRole("tooltip");
    expect(popup).toHaveTextContent("SBA weight tip");
    expect(trigger).toHaveAttribute("aria-describedby", popup.id);

    // Leaving to enter popup keeps tooltip open past 120ms close timer
    fireEvent.mouseLeave(trigger.parentElement!);
    fireEvent.mouseEnter(trigger.parentElement!);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    // Escape dismisses tooltip
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    rerender(<div />);
  });

  it("exposes live status and alert regions in AutoSaveIndicator and LockScreen", async () => {
    const savingRender = render(<AutoSaveIndicator isSaving={true} />);
    expect(screen.getByRole("status")).toHaveTextContent("Saving...");
    savingRender.unmount();

    const errorRender = render(<AutoSaveIndicator isSaving={false} error="Write failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    errorRender.unmount();

    await setupPin("1234", "999888");
    render(<LockScreen onUnlock={vi.fn()} onForgotPin={vi.fn()} />);
    for (const d of ["9", "9", "9", "9"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    expect(await screen.findByRole("alert")).toHaveTextContent(/Incorrect PIN/i);
  });

  it("implements keyboard-navigable ARIA tablists in Analytics and SbaMarkbookMobileView, and keyboard row triggers in StudentList", async () => {
    const analyticsRender = renderAppAt("/analytics");
    const analyticsTablist = await screen.findByRole("tablist", { name: "Analytics views" });
    const overviewTab = within(analyticsTablist).getByRole("tab", { name: /Overview/i });
    const subjectsTab = within(analyticsTablist).getByRole("tab", { name: /Subjects/i });
    expect(overviewTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", overviewTab.id);

    overviewTab.focus();
    fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
    expect(subjectsTab).toHaveAttribute("aria-selected", "true");
    expect(subjectsTab).toHaveFocus();
    analyticsRender.unmount();

    const onSelectPill = vi.fn();
    const sbaRender = render(
      <SbaMarkbookMobileView
        visibleStudents={[processedStudent]}
        totalStudentCount={1}
        activeSubject="Mathematics"
        tasks={[
          { name: "CAT 1", maxScore: 15 },
          { name: "Group Work", maxScore: 15 },
        ]}
        taskStats={new Map()}
        activeMobilePill="CAT 1"
        activeMobileTask={{ name: "CAT 1", maxScore: 15 }}
        isHeaderSticky={false}
        maxClassScore={50}
        idPrefix="sba"
        disabled={false}
        cellErrors={{}}
        cellDrafts={{}}
        onSelectMobilePill={onSelectPill}
        onRegisterMobileInput={vi.fn()}
        onScoreEdit={vi.fn()}
        onClearCellDraft={vi.fn()}
        onFocusMobileRow={vi.fn()}
        onAddSubjectToStudent={vi.fn()}
      />,
    );
    const sbaTablist = screen.getByRole("tablist", { name: "SBA assessment tasks" });
    const catTab = within(sbaTablist).getByRole("tab", { name: /CAT 1/i });
    expect(catTab).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(catTab, { key: "ArrowRight" });
    expect(onSelectPill).toHaveBeenCalledWith("Group Work");
    sbaRender.unmount();

    // StudentList desktop name renders as a button for keyboard users and opens student editor
    const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 960 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
    try {
      renderAppAt("/");
      const table = await screen.findByRole("table");
      const nameButton = within(table).getByRole("button", { name: "Ama Mensah" });
      expect(nameButton).toHaveAttribute("type", "button");
      fireEvent.click(nameButton);
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    } finally {
      if (origOffsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", origOffsetWidth);
      if (origOffsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", origOffsetHeight);
    }
  });
});
