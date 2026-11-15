import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchoolProvider } from "../context/SchoolContext";
import { useSchoolData } from "../hooks/useSchoolData";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { SchoolSettings, StudentRecord } from "../types";

const toastMock = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => toastMock,
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "ges_v1_students", SETTINGS: "ges_v1_settings" },
  getStorageType: vi.fn(() => "indexeddb"),
  ...storage,
}));

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
}));

const BASE_SETTINGS: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Test Academy",
  className: "Basic 5",
  level: "PRIMARY",
  examType: "TERMLY",
  classScoreMax: 50,
  examScoreMax: 50,
  defaultSubjects: ["Mathematics", "English Language"],
  componentLibrary: [
    { name: "Class Test 1", maxScore: 20, category: "CAT" },
    { name: "Project Work", maxScore: 20, category: "PROJECT" },
  ],
  subjectComponentMap: {
    Mathematics: [
      { name: "Class Test 1", maxScore: 20, category: "CAT" },
      { name: "Project Work", maxScore: 20, category: "PROJECT" },
    ],
  },
};

const SEEDED_STUDENTS: StudentRecord[] = [
  {
    id: "stu-1",
    name: "Ama Mensah",
    className: "Basic 5",
    pictureUrl: "data:image/png;base64,abc",
    subjects: [
      {
        id: "sub-math-1",
        name: "Mathematics",
        classScore: 35,
        examScore: 40,
        classScoreComponents: [
          { id: "c1", name: "Class Test 1", score: 15, maxScore: 20, category: "CAT" },
          { id: "c2", name: "Legacy Task", score: 10, maxScore: 10, category: "HOMEWORK" },
        ],
      },
      {
        id: "sub-eng-1",
        name: "English Language",
        classScore: 30,
        examScore: 35,
      },
    ],
  },
  {
    id: "stu-2",
    name: "Kofi Boateng",
    className: "Basic 4",
    subjects: [
      {
        id: "sub-math-2",
        name: "Mathematics",
        classScore: 0,
        examScore: 0,
      },
    ],
  },
];

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SchoolProvider>{children}</SchoolProvider>;
  };
}

async function renderLoadedSchoolHook(
  students: StudentRecord[] = SEEDED_STUDENTS,
  settings: SchoolSettings = BASE_SETTINGS,
) {
  storage.loadFromStorageResult.mockImplementation(async (key: string) => {
    if (key === "ges_v1_students") {
      return { status: "found", value: structuredClone(students) };
    }
    if (key === "ges_v1_settings") {
      return { status: "found", value: structuredClone(settings) };
    }
    return { status: "empty" };
  });

  const hookResult = renderHook(() => useSchoolData(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    expect(hookResult.result.current.isDataLoaded).toBe(true);
  });

  return hookResult;
}

describe("SchoolContext live actions", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: true });
    storage.saveToStorage.mockResolvedValue(true);
    storage.createBackupHeartbeat.mockResolvedValue(undefined);
  });

  it("deleteStudent removes the student and executing UNDO toast restores them", async () => {
    const { result } = await renderLoadedSchoolHook();

    expect(result.current.students).toHaveLength(2);

    act(() => {
      result.current.deleteStudent("stu-1");
    });

    expect(result.current.students).toHaveLength(1);
    expect(result.current.students[0].id).toBe("stu-2");

    const undoCall = toastMock.showToast.mock.calls.find(
      ([msg]) => msg === "Student moved to trash.",
    );
    expect(undoCall).toBeDefined();
    const action = undoCall?.[2] as { label: string; onClick: () => void } | undefined;
    expect(action?.label).toBe("UNDO");

    act(() => {
      action?.onClick();
    });

    expect(result.current.students).toHaveLength(2);
    expect(result.current.students.some((s) => s.id === "stu-1" && s.name === "Ama Mensah")).toBe(
      true,
    );
  });

  it("clearStudentScores and clearAllScores zero all scores and SBA component scores while preserving details", async () => {
    const secondScoredStudent: StudentRecord = {
      ...SEEDED_STUDENTS[1],
      subjects: [
        {
          id: "sub-math-2",
          name: "Mathematics",
          classScore: 28,
          examScore: 34,
          classScoreComponents: [{ id: "c3", name: "Class Test 1", score: 14, maxScore: 20 }],
        },
      ],
    };

    const { result } = await renderLoadedSchoolHook([SEEDED_STUDENTS[0], secondScoredStudent]);

    act(() => {
      result.current.clearStudentScores("stu-1");
    });

    const clearedStu1 = result.current.students.find((s) => s.id === "stu-1");
    const untouchedStu2 = result.current.students.find((s) => s.id === "stu-2");

    expect(clearedStu1?.name).toBe("Ama Mensah");
    expect(clearedStu1?.pictureUrl).toBe("data:image/png;base64,abc");
    expect(clearedStu1?.subjects[0].classScore).toBe(0);
    expect(clearedStu1?.subjects[0].examScore).toBe(0);
    expect(clearedStu1?.subjects[0].classScoreComponents?.every((c) => c.score === 0)).toBe(true);
    expect(untouchedStu2?.subjects[0].examScore).toBe(34);

    act(() => {
      result.current.clearAllScores();
    });

    const clearedStu2 = result.current.students.find((s) => s.id === "stu-2");
    expect(clearedStu2?.name).toBe("Kofi Boateng");
    expect(clearedStu2?.subjects[0].classScore).toBe(0);
    expect(clearedStu2?.subjects[0].examScore).toBe(0);
    expect(clearedStu2?.subjects[0].classScoreComponents?.[0].score).toBe(0);
  });

  it("detectComponentMismatches and syncSubjectComponentsFromSettings update tasks, clamp maxScores, remove stale tasks, and recompute classScore", async () => {
    const clampedSettings: SchoolSettings = {
      ...BASE_SETTINGS,
      classScoreMax: 50,
      subjectComponentMap: {
        Mathematics: [
          { name: "Class Test 1", maxScore: 10, category: "CAT" },
          { name: "Project Work", maxScore: 20, category: "PROJECT" },
        ],
      },
    };

    const { result } = await renderLoadedSchoolHook(SEEDED_STUDENTS, clampedSettings);

    const mismatchBefore = result.current.detectComponentMismatches();
    expect(mismatchBefore.hasOutdated).toBe(true);
    expect(mismatchBefore.hasMissing).toBe(true);

    act(() => {
      result.current.syncSubjectComponentsFromSettings();
    });

    const stu1Math = result.current.students
      .find((s) => s.id === "stu-1")
      ?.subjects.find((sub) => sub.name === "Mathematics");
    const stu2Math = result.current.students
      .find((s) => s.id === "stu-2")
      ?.subjects.find((sub) => sub.name === "Mathematics");

    // Existing "Class Test 1" was score 15 / maxScore 20 -> clamped to 10 / 10; "Legacy Task" removed; "Project Work" (0/20) added
    expect(stu1Math?.classScoreComponents).toHaveLength(2);
    expect(stu1Math?.classScoreComponents?.find((c) => c.name === "Class Test 1")).toMatchObject({
      score: 10,
      maxScore: 10,
    });
    expect(stu1Math?.classScoreComponents?.find((c) => c.name === "Project Work")).toMatchObject({
      score: 0,
      maxScore: 20,
    });
    expect(stu1Math?.classScoreComponents?.some((c) => c.name === "Legacy Task")).toBe(false);
    // Recomputed proportionally: (10 + 0) / (10 + 20) * 50 = 16.666 -> 17
    expect(stu1Math?.classScore).toBe(17);

    // Student with no prior components gets initialized with both configured components
    expect(stu2Math?.classScoreComponents).toHaveLength(2);
    expect(stu2Math?.classScore).toBe(0);

    const mismatchAfter = result.current.detectComponentMismatches();
    expect(mismatchAfter.hasOutdated).toBe(false);
    expect(mismatchAfter.hasMissing).toBe(false);
  });

  it("deletePendingStudents removes only unscored students and updateClassNameForAll updates every remaining student", async () => {
    const emptySubjectStudent: StudentRecord = {
      id: "stu-3",
      name: "Yaw Owusu",
      className: "Basic 5",
      subjects: [],
    };
    const { result } = await renderLoadedSchoolHook([...SEEDED_STUDENTS, emptySubjectStudent]);

    act(() => {
      result.current.deletePendingStudents();
    });

    expect(result.current.students.map((s) => s.id)).toEqual(["stu-1"]);

    act(() => {
      result.current.updateClassNameForAll("Basic 6");
    });

    expect(result.current.students.every((s) => s.className === "Basic 6")).toBe(true);
  });
});
