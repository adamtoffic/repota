import type { ReactNode } from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { SchoolSettings, StudentRecord } from "../types";

const posthogMock = vi.hoisted(() => ({
  capture: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => toastMock,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "ges_v1_students", SETTINGS: "ges_v1_settings" },
  getStorageType: vi.fn(() => "indexeddb"),
  subscribeToStorageSync: vi.fn(() => () => {}),
  ...storage,
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
}));

import { BulkImportModal } from "../components/BulkImportModal";
import { DataGate } from "../components/DataGate";
import { AcademicSessionSection } from "../components/settings/AcademicSessionSection";
import { ReportTemplateSection } from "../components/settings/ReportTemplateSection";
import { SchoolProvider } from "../context/SchoolContext";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { SettingsFormProvider } from "../context/SettingsFormContext";
import { useSchoolData } from "../hooks/useSchoolData";
import { registerPostHogClient } from "../utils/analytics";

const BASE_SETTINGS: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Test Academy",
  className: "Basic 5",
  level: "PRIMARY",
  schoolType: "STANDARD",
  examType: "TERMLY",
  defaultSubjects: ["Mathematics", "English"],
  templateId: "original_v1",
  useCustomTemplateColor: true,
};

function makeStudent(id: string, name: string): StudentRecord {
  return {
    id,
    name,
    className: "Basic 5",
    gender: "Female",
    subjects: [
      { id: `${id}-m`, name: "Mathematics", classScore: 30, examScore: 40 },
      { id: `${id}-e`, name: "English", classScore: 28, examScore: 38 },
    ],
  };
}

function getCapturedEvents(eventName: string) {
  return posthogMock.capture.mock.calls
    .filter(([name]) => name === eventName)
    .map(([, props]) => props as Record<string, unknown>);
}

describe("Hardened existing PostHog events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerPostHogClient(posthogMock);
    localStorage.clear();
    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: true });
    storage.saveToStorage.mockResolvedValue(true);
    storage.saveEntriesToStorage.mockResolvedValue(true);
    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") return { status: "found", value: [] };
      if (key === "ges_v1_settings") return { status: "found", value: BASE_SETTINGS };
      return { status: "empty" };
    });
  });

  it("tracks is_first_student, is_empty_workspace, and demo/empty Auto_Remarks_Generated cleanly", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SchoolProvider>{children}</SchoolProvider>
    );
    const { result } = renderHook(() => useSchoolData(), { wrapper });

    await waitFor(() => expect(result.current.isDataLoaded).toBe(true));

    // Empty class auto-remarks should NOT fire Auto_Remarks_Generated
    await act(async () => {
      await result.current.autoGenerateRemarks();
    });
    expect(getCapturedEvents("Auto_Remarks_Generated")).toHaveLength(0);

    // Loading demo data on empty workspace
    await act(async () => {
      await result.current.loadDemoData();
    });
    expect(getCapturedEvents("Loaded_Demo_Data")).toEqual([
      {
        school_level: "PRIMARY",
        school_type: "STANDARD",
        demo_students_count: 10,
        existing_students_count: 0,
        is_empty_workspace: true,
      },
    ]);

    // Auto-remarks on demo-only workspace marks is_demo: true
    await act(async () => {
      await result.current.autoGenerateRemarks();
    });
    expect(getCapturedEvents("Auto_Remarks_Generated")).toEqual([
      {
        students_count: 10,
        real_students_count: 0,
        demo_students_count: 10,
        is_demo: true,
        school_level: "PRIMARY",
        term: "First Term",
      },
    ]);

    // Adding first REAL student ignores existing demo students for is_first_student
    act(() => {
      result.current.addStudent(makeStudent("real-1", "Ama Mensah"));
    });
    act(() => {
      result.current.addStudent(makeStudent("real-2", "Kofi Boateng"));
    });

    const addedEvents = getCapturedEvents("Added_Student");
    expect(addedEvents).toEqual([
      {
        school_level: "PRIMARY",
        school_type: "STANDARD",
        exam_type: "TERMLY",
        is_first_student: true,
        total_students_count: 1,
      },
      {
        school_level: "PRIMARY",
        school_type: "STANDARD",
        exam_type: "TERMLY",
        is_first_student: false,
        total_students_count: 2,
      },
    ]);

    // Auto-remarks on mixed class separates real vs demo counts
    await act(async () => {
      await result.current.autoGenerateRemarks();
    });
    expect(getCapturedEvents("Auto_Remarks_Generated")[1]).toMatchObject({
      students_count: 12,
      real_students_count: 2,
      demo_students_count: 10,
      is_demo: false,
    });

    // Loading demo data onto non-empty workspace marks is_empty_workspace: false
    await act(async () => {
      await result.current.loadDemoData();
    });
    expect(getCapturedEvents("Loaded_Demo_Data")[1]).toMatchObject({
      existing_students_count: 12,
      is_empty_workspace: false,
    });
  });

  it("guards no-op School_Level_Changed and Template_Changed clicks and sends previous values on real changes", async () => {
    render(
      <SchoolProvider>
        <DataGate>
          <SettingsFormProvider>
            <AcademicSessionSection />
            <ReportTemplateSection />
          </SettingsFormProvider>
        </DataGate>
      </SchoolProvider>,
    );

    await waitFor(() => expect(screen.getByDisplayValue("Basic 5")).toBeInTheDocument());

    // Clicking already-active PRIMARY level and active Repota Original template must emit nothing
    fireEvent.click(screen.getByRole("button", { name: "PRIMARY" }));
    fireEvent.click(screen.getByRole("button", { name: /Repota Original/i }));
    expect(getCapturedEvents("School_Level_Changed")).toHaveLength(0);
    expect(getCapturedEvents("Template_Changed")).toHaveLength(0);

    // Changing level to JHS and confirming emits previous_level & new_level
    fireEvent.click(screen.getByRole("button", { name: "JHS" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Change Level" }));
    expect(getCapturedEvents("School_Level_Changed")).toEqual([
      {
        previous_level: "PRIMARY",
        new_level: "JHS",
        students_count: 0,
      },
    ]);

    // Selecting a different template emits previous_template_id & metadata
    fireEvent.click(screen.getByRole("button", { name: /Modern Dashboard/i }));
    expect(getCapturedEvents("Template_Changed")).toEqual([
      {
        template_id: "modern_v1",
        previous_template_id: "original_v1",
        school_level: "JHS",
        school_type: "STANDARD",
        uses_custom_color: true,
      },
    ]);
  });

  it("captures import_source ('paste' vs 'file') and metadata in Bulk_Import_Success", async () => {
    const user = userEvent.setup();
    const schoolCtx = {
      students: [],
      settings: BASE_SETTINGS,
      addStudent: vi.fn(),
      updateStudent: vi.fn(),
    } as unknown as SchoolContextType;

    // 1. Pasted text import (missing gender)
    const firstRender = render(
      <SchoolContext.Provider value={schoolCtx}>
        <BulkImportModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
    );

    await user.type(screen.getByRole("textbox"), "Kwame Mensah\nAma Serwaa");
    await user.click(screen.getByRole("button", { name: /preview list/i }));
    await user.click(screen.getByRole("button", { name: /import all/i }));

    expect(getCapturedEvents("Bulk_Import_Success")[0]).toEqual({
      students_imported: 2,
      students_updated: 0,
      import_source: "paste",
      school_level: "PRIMARY",
      school_type: "STANDARD",
      had_missing_gender: true,
    });
    firstRender.unmount();

    // 2. CSV file upload import (explicit genders)
    const { baseElement } = render(
      <SchoolContext.Provider value={schoolCtx}>
        <BulkImportModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
    );

    const fileInput = baseElement.querySelector('input[type="file"]') as HTMLInputElement;
    const csvFile = new File(["Name,Gender\nAbena Boateng,Female"], "roster.csv", {
      type: "text/csv",
    });
    await user.upload(fileInput, csvFile);
    await user.click(screen.getByRole("button", { name: /import all/i }));

    expect(getCapturedEvents("Bulk_Import_Success")[1]).toEqual({
      students_imported: 1,
      students_updated: 0,
      import_source: "file",
      school_level: "PRIMARY",
      school_type: "STANDARD",
      had_missing_gender: false,
    });
  });
});
