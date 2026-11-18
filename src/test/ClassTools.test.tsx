import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BulkAttendanceModal } from "../components/BulkAttendanceModal";
import { BulkPromotionModal } from "../components/BulkPromotionModal";
import { DashboardToolbar } from "../components/DashboardToolbar";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { ToastContext } from "../context/ToastContextDefinition";
import type { ProcessedStudent, SchoolSettings } from "../types";
import { exportDetailedBroadsheetCSV } from "../utils/export";

const settings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Heritage Academy",
  className: "Basic 6",
  schoolType: "PRIVATE",
  totalAttendanceDays: 70,
  term: "Third Term",
};

const sampleStudents: ProcessedStudent[] = [
  {
    id: "s1",
    name: "Kwame Mensah",
    className: "Basic 6",
    gender: "Male",
    age: 12,
    attendancePresent: 60,
    totalScore: 150,
    averageScore: 75,
    classPosition: "1st",
    aggregate: 8,
    admissionNumber: "ADM-1",
    feeStatus: "PAID",
    subjects: [
      {
        id: "sub1",
        name: "Mathematics",
        classScore: 38,
        examScore: 42,
        totalScore: 80,
        grade: 1,
        remark: "Advance",
      },
    ],
  },
  {
    id: "s2",
    name: "Ama Serwaa",
    className: "Basic 6",
    gender: "Female",
    age: 12,
    attendancePresent: 45,
    totalScore: 80,
    averageScore: 40,
    classPosition: "2nd",
    aggregate: 22,
    admissionNumber: "ADM-2",
    feeStatus: "OWING",
    feeArrears: 200,
    subjects: [
      {
        id: "sub2",
        name: "Mathematics",
        classScore: 20,
        examScore: 20,
        totalScore: 40,
        grade: 5,
        remark: "Beginning",
      },
    ],
  },
];

describe("Class Tools Expansion", () => {
  it("exposes new Import & Setup, Class Operations, and Export actions in DashboardToolbar", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    const onImportScores = vi.fn();
    const onBulkAttendance = vi.fn();
    const onSyncClassSubjects = vi.fn();
    const onBulkPromotion = vi.fn();
    const onExportDetailed = vi.fn();

    render(
      <DashboardToolbar
        searchQuery=""
        onSearchChange={vi.fn()}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
        onExport={vi.fn()}
        onExportDetailed={onExportDetailed}
        onImport={onImport}
        onImportScores={onImportScores}
        onBulkAttendance={onBulkAttendance}
        onSyncClassSubjects={onSyncClassSubjects}
        onBulkPromotion={onBulkPromotion}
        onDeletePending={vi.fn()}
        onAutoRemarks={vi.fn()}
        onClearScores={vi.fn()}
        onExportStudentList={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Class Tools/i }));
    await user.click(screen.getByRole("menuitem", { name: /Import SBA \/ Exam Scores/i }));
    expect(onImportScores).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Class Tools/i }));
    await user.click(screen.getByRole("menuitem", { name: /Bulk Attendance Entry/i }));
    expect(onBulkAttendance).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Class Tools/i }));
    await user.click(screen.getByRole("menuitem", { name: /Bulk Promotion Status/i }));
    expect(onBulkPromotion).toHaveBeenCalledTimes(1);
  });

  it("saves batch attendance via BulkAttendanceModal", async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    const ctx = {
      students: sampleStudents,
      settings,
      updateStudent,
    } as unknown as SchoolContextType;

    render(
      <ToastContext.Provider value={{ showToast: vi.fn() }}>
        <SchoolContext.Provider value={ctx}>
          <BulkAttendanceModal isOpen={true} onClose={vi.fn()} />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    const setAllInput = screen.getByLabelText("Set all attendance days");
    await user.clear(setAllInput);
    await user.type(setAllInput, "68");
    await user.click(screen.getByRole("button", { name: /Set All/i }));
    await user.click(screen.getByRole("button", { name: /Save Attendance/i }));

    expect(updateStudent).toHaveBeenCalledTimes(2);
    expect(updateStudent.mock.calls[0][0].attendancePresent).toBe(68);
  });

  it("auto-assigns promotion status by threshold in BulkPromotionModal", async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    const ctx = {
      students: sampleStudents,
      settings,
      updateStudent,
    } as unknown as SchoolContextType;

    render(
      <ToastContext.Provider value={{ showToast: vi.fn() }}>
        <SchoolContext.Provider value={ctx}>
          <BulkPromotionModal isOpen={true} onClose={vi.fn()} />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: /Auto-Assign by Average/i }));
    await user.click(screen.getByRole("button", { name: /Apply Promotion Status/i }));

    expect(updateStudent).toHaveBeenCalledTimes(2);
    expect(updateStudent.mock.calls[0][0].promotionStatus).toBe("Promoted to Next Class");
    expect(updateStudent.mock.calls[1][0].promotionStatus).toBe("Repeated Basic 6");
  });

  it("exports detailed broadsheet CSV including Class/Exam split and Private fee tracking", async () => {
    let capturedBlob: Blob | null = null;
    vi.spyOn(URL, "createObjectURL").mockImplementation((obj) => {
      capturedBlob = obj as Blob;
      return "blob:detailed";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    expect(exportDetailedBroadsheetCSV(sampleStudents, settings, "Detailed")).toBe(true);
    const csvText = await capturedBlob!.text();
    expect(csvText).toContain('"Mathematics (Class)","Mathematics (Exam)","Mathematics (Total)"');
    expect(csvText).toContain('"Admission No","Fee Status","Fee Arrears"');
    expect(csvText).toContain('"ADM-2","OWING","200"');
  });
});
