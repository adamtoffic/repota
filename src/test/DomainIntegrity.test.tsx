import { act, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FACTORY_SETTINGS } from "../constants/defaultSettings";
import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
  deleteFromStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "ges_v1_students", SETTINGS: "ges_v1_settings" },
  getStorageType: vi.fn(() => "indexeddb"),
  ...storage,
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: vi.fn(),
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
  recordBackup: vi.fn(),
  getTimeSinceBackup: vi.fn(() => null),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <a href={String(props.to ?? "#")}>{children}</a>
  ),
}));

import { StudentList } from "../components/StudentList";
import { SchoolProvider } from "../context/SchoolContext";
import { SchoolSettingsContext } from "../context/SchoolContextDefinition";
import {
  useSchoolActions,
  useSchoolLifecycle,
  useSchoolStudents,
} from "../hooks/useSchoolData";
import {
  calculateAgeDistribution,
  calculateAttendanceByGender,
  calculateClassMetrics,
  calculatePerformanceByAge,
  calculateScoreDistribution,
} from "../utils/analyticsCalculator";
import { calculateAgeFromDob } from "../utils/gradeCalculator";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";
import { stripDerivedStudentFields } from "../utils/studentSanitizer";
import { isStudentPending } from "../utils/studentValidation";

function makeBaseSettings(overrides: Partial<SchoolSettings> = {}): SchoolSettings {
  return {
    ...DEFAULT_FACTORY_SETTINGS,
    schoolName: "Test Model School",
    className: "Basic 5",
    level: "PRIMARY",
    defaultSubjects: ["Mathematics", "English"],
    classScoreMax: 50,
    examScoreMax: 50,
    examType: "TERMLY",
    totalAttendanceDays: 1000,
    ...overrides,
  };
}

function makeProcessedStudent(overrides: Partial<ProcessedStudent> = {}): ProcessedStudent {
  return {
    id: "stu-1",
    name: "Ama Mensah",
    className: "Basic 5",
    gender: "Female",
    age: 11,
    subjects: [
      {
        id: "sub-1",
        name: "Mathematics",
        classScore: 0,
        examScore: 45,
        totalScore: 45,
        grade: 5,
        remark: "Poor",
      },
    ],
    averageScore: 45,
    totalScore: 45,
    classPosition: "Pending...",
    aggregate: 5,
    ...overrides,
  };
}

describe("Branch 2 domain integrity, mock mode, and analytics precision", () => {
  let memoryDb: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    memoryDb = {
      ges_v1_students: [
        {
          id: "stu-sync",
          name: "Kofi Boateng",
          className: "Basic 5",
          gender: "Male",
          subjects: [{ id: "sub-math", name: "Mathematics", classScore: 20, examScore: 30 }],
        },
      ] satisfies StudentRecord[],
      ges_v1_settings: makeBaseSettings({
        defaultSubjects: ["Mathematics", "English"],
        subjectComponentMap: {
          Mathematics: [{ name: "Quiz 1", maxScore: 15, category: "CAT" }],
        },
      }),
    };

    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: true, studentsCount: 0 });
    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key in memoryDb) {
        return { status: "found", value: structuredClone(memoryDb[key]) };
      }
      return { status: "empty" };
    });
    storage.saveToStorage.mockImplementation(async (key: string, val: unknown) => {
      memoryDb[key] = structuredClone(val);
      return true;
    });
    storage.saveEntriesToStorage.mockImplementation(
      async (entries: Array<{ key: string; value: unknown }>) => {
        for (const entry of entries) {
          memoryDb[entry.key] = structuredClone(entry.value);
        }
        return true;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("evaluates isStudentPending differently in MOCK vs TERMLY mode", () => {
    const mockOnlyExamStudent: StudentRecord = {
      id: "stu-mock",
      name: "Kojo Antwi",
      className: "JHS 3",
      gender: "Male",
      subjects: [
        { id: "s1", name: "Mathematics", classScore: 0, examScore: 80 },
        { id: "s2", name: "English", classScore: 0, examScore: 70 },
      ],
    };
    const zeroExamStudent: StudentRecord = {
      id: "stu-zero",
      name: "Esi Owusu",
      className: "JHS 3",
      gender: "Female",
      subjects: [
        { id: "s1", name: "Mathematics", classScore: 0, examScore: 80 },
        { id: "s2", name: "English", classScore: 0, examScore: 0 },
      ],
    };

    expect(
      isStudentPending(mockOnlyExamStudent, {
        defaultSubjects: ["Mathematics", "English"],
        examType: "MOCK",
      }),
    ).toBe(false);

    expect(
      isStudentPending(zeroExamStudent, {
        defaultSubjects: ["Mathematics", "English"],
        examType: "MOCK",
      }),
    ).toBe(true);

    expect(
      isStudentPending(mockOnlyExamStudent, {
        defaultSubjects: ["Mathematics", "English"],
        examType: "TERMLY",
      }),
    ).toBe(true);

    expect(
      isStudentPending(
        {
          ...mockOnlyExamStudent,
          subjects: [
            { id: "s1", name: "Mathematics", classScore: 30, examScore: 40 },
            { id: "s2", name: "English", classScore: 35, examScore: 35 },
          ],
        },
        {
          defaultSubjects: ["Mathematics", "English"],
          examType: "TERMLY",
        },
      ),
    ).toBe(false);
  });

  it("renders StudentList case-insensitive pending badges and mock score progress", () => {
    const students: ProcessedStudent[] = [
      makeProcessedStudent({ id: "stu-lower", name: "Pending Lower", classPosition: "pending..." }),
      makeProcessedStudent({ id: "stu-title", name: "Pending Title", classPosition: "Pending..." }),
      makeProcessedStudent({ id: "stu-ranked", name: "Ranked Student", classPosition: "1st" }),
    ];

    const { rerender } = render(
      <SchoolSettingsContext.Provider value={makeBaseSettings({ examType: "MOCK" })}>
        <StudentList
          students={students}
          onAddStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
          onEditStudent={vi.fn()}
        />
      </SchoolSettingsContext.Provider>,
    );

    expect(screen.queryByText(/^pending\.\.\.$/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("1st").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1/1 Scored").length).toBeGreaterThan(0);

    rerender(
      <SchoolSettingsContext.Provider value={makeBaseSettings({ examType: "TERMLY" })}>
        <StudentList
          students={students}
          onAddStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
          onEditStudent={vi.fn()}
        />
      </SchoolSettingsContext.Provider>,
    );

    expect(screen.getAllByText("0/1 Scored").length).toBeGreaterThan(0);
  });

  it("strips runtime-derived and defunct legacy remark fields in stripDerivedStudentFields and setStudents", async () => {
    const dirty = {
      ...makeProcessedStudent({
        id: "stu-dirty",
        age: 12,
        averageScore: 88,
        totalScore: 88,
        classPosition: "1st",
        aggregate: 1,
        subjects: [
          {
            id: "sub-dirty",
            name: "Mathematics",
            classScore: 40,
            examScore: 48,
            totalScore: 88,
            grade: 1,
            remark: "Highest",
            subjectPosition: "1st",
          },
        ],
      }),
      headMasterRemark: "Legacy HM Remark",
      attendanceRemark: "Legacy Attendance Remark",
    };

    const cleaned = stripDerivedStudentFields(dirty);
    expect("age" in cleaned).toBe(false);
    expect("averageScore" in cleaned).toBe(false);
    expect("totalScore" in cleaned).toBe(false);
    expect("classPosition" in cleaned).toBe(false);
    expect("aggregate" in cleaned).toBe(false);
    expect("headMasterRemark" in cleaned).toBe(false);
    expect("attendanceRemark" in cleaned).toBe(false);
    expect("totalScore" in cleaned.subjects[0]).toBe(false);
    expect("grade" in cleaned.subjects[0]).toBe(false);
    expect("remark" in cleaned.subjects[0]).toBe(false);
    expect("subjectPosition" in cleaned.subjects[0]).toBe(false);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SchoolProvider>{children}</SchoolProvider>
    );

    const { result } = renderHook(
      () => ({
        lifecycle: useSchoolLifecycle(),
        actions: useSchoolActions(),
      }),
      { wrapper },
    );

    await act(async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });

    expect(result.current.lifecycle.isDataLoaded).toBe(true);

    act(() => {
      result.current.actions.batchUpdateStudents?.(() => [dirty as unknown as StudentRecord]);
    });

    await act(async () => {
      await result.current.actions.flushPendingWrites?.();
    });

    const persisted = memoryDb.ges_v1_students as Array<Record<string, unknown>>;
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).not.toHaveProperty("headMasterRemark");
    expect(persisted[0]).not.toHaveProperty("attendanceRemark");
    expect(persisted[0]).not.toHaveProperty("classPosition");
    const persistedSubs = persisted[0].subjects as Array<Record<string, unknown>>;
    expect(persistedSubs[0]).not.toHaveProperty("totalScore");
    expect(persistedSubs[0]).not.toHaveProperty("subjectPosition");
  });

  it("performs syncClassSubjectsAndSba and batchUpdateStudents atomically", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SchoolProvider>{children}</SchoolProvider>
    );

    const { result } = renderHook(
      () => ({
        lifecycle: useSchoolLifecycle(),
        students: useSchoolStudents(),
        actions: useSchoolActions(),
      }),
      { wrapper },
    );

    await act(async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });

    let syncReport: { subjectsAddedCount: number; sbaSyncedCount: number } | undefined;
    act(() => {
      syncReport = result.current.actions.syncClassSubjectsAndSba?.();
    });

    expect(syncReport).toEqual({ subjectsAddedCount: 1, sbaSyncedCount: 1 });
    expect(result.current.students[0].subjects.map((s) => s.name)).toEqual([
      "Mathematics",
      "English",
    ]);
    expect(result.current.students[0].subjects[0].classScoreComponents?.[0]?.name).toBe("Quiz 1");

    act(() => {
      result.current.actions.batchUpdateStudents?.((prev) =>
        prev.map((stu) => ({ ...stu, conduct: "Polite and focused" })),
      );
    });

    expect(result.current.students[0].conduct).toBe("Polite and focused");
  });

  it("generates deterministic headmaster remarks when given a seed", () => {
    const r1 = generateHeadmasterRemark(85, "First Term", [], "stu-1|First Term|85");
    const r2 = generateHeadmasterRemark(85, "First Term", [], "stu-1|First Term|85");
    const r3 = generateHeadmasterRemark(85, "First Term", [], "stu-1|First Term|85");

    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
    expect(r1.length).toBeGreaterThan(0);
  });

  it("buckets float scores & attendance ratios without gaps, calculates exact birthday age, and reuses ProcessedStudent", () => {
    const settings = makeBaseSettings();

    const distStudents: StudentRecord[] = [
      {
        id: "f1",
        name: "Float 39.5",
        className: "Basic 5",
        gender: "Male",
        attendancePresent: 695,
        subjects: [
          { id: "a", name: "Mathematics", classScore: 20, examScore: 19 },
          { id: "b", name: "English", classScore: 20, examScore: 20 },
        ],
      },
      {
        id: "f2",
        name: "Float 49.5",
        className: "Basic 5",
        gender: "Female",
        attendancePresent: 795,
        subjects: [
          { id: "a", name: "Mathematics", classScore: 25, examScore: 24 },
          { id: "b", name: "English", classScore: 25, examScore: 25 },
        ],
      },
      {
        id: "f3",
        name: "Float 79.5",
        className: "Basic 5",
        gender: "Male",
        attendancePresent: 895,
        subjects: [
          { id: "a", name: "Mathematics", classScore: 40, examScore: 39 },
          { id: "b", name: "English", classScore: 40, examScore: 40 },
        ],
      },
      {
        id: "f4",
        name: "Exact 80",
        className: "Basic 5",
        gender: "Female",
        attendancePresent: 900,
        subjects: [
          { id: "a", name: "Mathematics", classScore: 40, examScore: 40 },
          { id: "b", name: "English", classScore: 40, examScore: 40 },
        ],
      },
    ];

    const scoreDist = calculateScoreDistribution(distStudents, settings);
    const totalBucketed = scoreDist.reduce((sum, b) => sum + b.count, 0);
    expect(totalBucketed).toBe(4);
    expect(scoreDist.find((b) => b.range.startsWith("0-39"))?.count).toBe(1);
    expect(scoreDist.find((b) => b.range.startsWith("40-49"))?.count).toBe(1);
    expect(scoreDist.find((b) => b.range.startsWith("70-79"))?.count).toBe(1);
    expect(scoreDist.find((b) => b.range.startsWith("80-100"))?.count).toBe(1);

    const attendanceDist = calculateAttendanceByGender(distStudents, settings);
    const totalAtt = attendanceDist.attendanceRanges.reduce((sum, r) => sum + r.total, 0);
    expect(totalAtt).toBe(4);
    expect(attendanceDist.attendanceRanges.find((r) => r.range === "Below 70%")?.maleCount).toBe(1);
    expect(attendanceDist.attendanceRanges.find((r) => r.range === "70-79%")?.femaleCount).toBe(1);
    expect(attendanceDist.attendanceRanges.find((r) => r.range === "80-89%")?.maleCount).toBe(1);
    expect(attendanceDist.attendanceRanges.find((r) => r.range === "90-100%")?.femaleCount).toBe(1);

    expect(calculateAgeFromDob("2015-06-15", new Date(2026, 5, 14))).toBe(10);
    expect(calculateAgeFromDob("2015-06-15", new Date(2026, 5, 15))).toBe(11);
    expect(calculateAgeFromDob("not-a-date", new Date(2026, 5, 15))).toBeUndefined();

    const dobStudents: StudentRecord[] = [
      { ...distStudents[0], dateOfBirth: "2015-01-01" },
      { ...distStudents[1], dateOfBirth: "invalid-dob" },
    ];
    expect(calculateAgeDistribution(dobStudents)).toHaveLength(1);
    expect(calculatePerformanceByAge(dobStudents, settings)).toHaveLength(1);

    const precomputed = [
      makeProcessedStudent({
        id: "pre-1",
        averageScore: 92,
        totalScore: 92,
        subjects: [
          {
            id: "sub-p",
            name: "Mathematics",
            classScore: 45,
            examScore: 47,
            totalScore: 92,
            grade: 1,
            remark: "Highest",
          },
        ],
      }),
    ];
    expect(calculateClassMetrics(precomputed, settings).averageScore).toBe(92);
    expect(
      calculateScoreDistribution(precomputed, settings).find((b) => b.range.startsWith("80-100"))
        ?.count,
    ).toBe(1);
  });
});
