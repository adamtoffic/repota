import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FACTORY_SETTINGS } from "../constants/defaultSettings";
import {
  clearAllStudentScoresData,
  filterActiveNonPendingStudents,
  normalizeAssessmentWeightSettings,
} from "../context/school/schoolStudentMutations";
import {
  computeGradebookColumnStats,
  computeGradebookPastePatches,
} from "../components/gradebook/gradebookHelpers";
import { applyScoreRowToSubject, buildScoreImportPlan } from "../components/import/scoreImportApply";
import { computeGridPastePatches } from "../components/sba/sbaGridHelpers";
import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";
import { exportAnalyticsData } from "../utils/analyticsExport";
import { parseSbaScoreImport } from "../utils/csvImport";
import { parseOptionalNumber, parseTabularText } from "../utils/csv/tabularParser";
import { createDemoStudents } from "../utils/demoData";
import { exportToCSV } from "../utils/export";
import {
  assignPositions,
  assignSubjectPositions,
  isCoreSubject,
  processStudent,
} from "../utils/gradeCalculator";
import { calculateSbaPaceStats, rescaleStudentsForWeightChange } from "../utils/sbaReconciliation";
import { convertExamRawToWeighted, formatExamWeightedAsRaw } from "../utils/scoreConversion";
import { hasNoScoresEntered } from "../utils/studentValidation";

const baseSettings: SchoolSettings = {
  ...DEFAULT_FACTORY_SETTINGS,
  schoolName: "Wave 2 Test School",
  className: "JHS 2A",
  level: "JHS",
  classScoreMax: 50,
  examScoreMax: 50,
  examType: "TERMLY",
  defaultSubjects: ["English Language", "Mathematics"],
};

describe("Wave 2 — CSV Parser, Excel Paste & Export Security (P0-3, P0-4, P0-5, P2-24)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("P0-3 & P2-24: rejects text/fractions/dates in parseOptionalNumber and handles unquoted mid-cell quotes", () => {
    expect(parseOptionalNumber("Absent")).toBeUndefined();
    expect(parseOptionalNumber("N/A")).toBeUndefined();
    expect(parseOptionalNumber("Gender")).toBeUndefined();
    expect(parseOptionalNumber("12/15")).toBeUndefined();
    expect(parseOptionalNumber("A1")).toBeUndefined();
    expect(parseOptionalNumber("1st")).toBeUndefined();
    expect(parseOptionalNumber("ADM-001")).toBeUndefined();
    expect(parseOptionalNumber("2015-03-14")).toBeUndefined();
    expect(parseOptionalNumber("-")).toBeUndefined();
    expect(parseOptionalNumber("")).toBeUndefined();

    expect(parseOptionalNumber("12")).toBe(12);
    expect(parseOptionalNumber("12.5")).toBe(12.5);
    expect(parseOptionalNumber(".5")).toBe(0.5);
    expect(parseOptionalNumber("0")).toBe(0);
    expect(parseOptionalNumber("80%")).toBe(80);
    expect(parseOptionalNumber("GH₵ 150.50")).toBe(150.5);
    expect(parseOptionalNumber("1,200")).toBe(1200);

    const tsv = parseTabularText('Name\tScore\nKofi "Jr" Mensah\t15\nAma Serwaa\t14');
    expect(tsv).toEqual([
      ["Name", "Score"],
      ['Kofi "Jr" Mensah', "15"],
      ["Ama Serwaa", "14"],
    ]);
  });

  it("P0-4 & P2-22: preserves blank/missing-subject alignment on paste and matches SBA keys cleanly", () => {
    const mkStudent = (id: string, name: string, hasMath = true): ProcessedStudent =>
      processStudent(
        {
          id,
          name,
          className: "JHS 2A",
          subjects: hasMath
            ? [
                {
                  id: `sub-${id}`,
                  name: "Mathematics",
                  classScore: 0,
                  examScore: 0,
                  classScoreComponents: [
                    { id: `c-${id}`, name: "CAT 1", score: 0, maxScore: 15, category: "CAT" },
                  ],
                },
              ]
            : [],
        },
        "JHS",
      );

    const visibleStudents = [
      mkStudent("s1", "Student One", true),
      mkStudent("s2", "Student Missing Math", false),
      mkStudent("s3", "Student Three", true),
    ];

    // Line 1 -> s1 (40), Line 2 -> s2 (no subject, line consumed), Line 3 -> s3 (50)
    const patches = computeGradebookPastePatches({
      text: "40\n99\n50\n",
      visibleStudents,
      startStudentId: "s1",
      activeSubject: "Mathematics",
      field: "exam",
      activeComponentName: null,
      isMockExam: false,
      maxClassScore: 50,
      maxExamScore: 50,
    });
    expect(patches).toHaveLength(2);
    expect(patches?.[0].student.id).toBe("s1");
    expect(patches?.[0].updatedSubject.examScore).toBe(20);
    expect(patches?.[1].student.id).toBe("s3");
    expect(patches?.[1].updatedSubject.examScore).toBe(25);

    // Internal blank row keeps alignment without shifting s3 up
    const allWithMath = [
      mkStudent("s1", "Student One", true),
      mkStudent("s2", "Student Two Absent", true),
      mkStudent("s3", "Student Three", true),
    ];
    const blankGapPatches = computeGradebookPastePatches({
      text: "12\n\n15\n",
      visibleStudents: allWithMath,
      startStudentId: "s1",
      activeSubject: "Mathematics",
      field: "comp",
      activeComponentName: "cat 1",
      isMockExam: false,
      maxClassScore: 50,
      maxExamScore: 50,
    });
    expect(blankGapPatches).toHaveLength(2);
    expect(blankGapPatches?.[0].student.id).toBe("s1");
    expect(blankGapPatches?.[1].student.id).toBe("s3");
    expect(blankGapPatches?.[1].updatedSubject.classScoreComponents?.[0].score).toBe(15);

    // SBA Grid paste also preserves internal blank rows
    const gridResult = computeGridPastePatches({
      text: "10\n\n14\n",
      visibleStudents: allWithMath,
      startStudentIdx: 0,
      startTaskIdx: 0,
      activeSubject: "Mathematics",
      tasks: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
      maxClassScore: 50,
    });
    expect(gridResult?.studentsUpdated).toBe(2);
    expect(gridResult?.patches[0].student.id).toBe("s1");
    expect(gridResult?.patches[1].student.id).toBe("s3");

    // EXAM_ONLY column average uses lossless resolveExamRawScore (89 instead of (45/50)*100=90)
    const raw89Student = processStudent(
      {
        id: "s89",
        name: "Exact Raw",
        className: "JHS 2A",
        subjects: [{ id: "m", name: "Mathematics", classScore: 0, examScore: 45, examRawScore: 89 }],
      },
      "JHS",
    );
    const stats = computeGradebookColumnStats({
      sessionStudents: [raw89Student],
      activeSubject: "Mathematics",
      activeTaskConfig: undefined,
      activeFocusColumn: "EXAM_ONLY",
      isMockExam: false,
      maxClassScore: 50,
      maxExamScore: 50,
    });
    expect(stats.avgLabel).toBe("Avg: 89.0/100");
  });

  it("P0-5: escapes CSV headers & formula cells in exportAnalyticsData & exportToCSV and defers revokeObjectURL", async () => {
    vi.useFakeTimers();
    const capturedBlobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((obj) => {
      capturedBlobs.push(obj as Blob);
      return "blob:test-export";
    });
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    exportAnalyticsData(
      [{ "=EvilHeader": "=CMD|'/C calc'!A0", Notes: "line1\nline2" }],
      "analytics.csv",
    );
    expect(revokeSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeSpy).toHaveBeenCalledTimes(1);

    const analyticsText = await capturedBlobs[0].text();
    expect(analyticsText).toContain('"\'=EvilHeader"');
    expect(analyticsText).toContain('"\'=CMD|\'/C calc\'!A0"');
    expect(analyticsText).toContain('"line1\nline2"');

    const maliciousSubjectStudent = processStudent(
      {
        id: "st1",
        name: "Ama",
        className: "JHS 2",
        subjects: [{ id: "sub1", name: "=SUM(A1)", classScore: 30, examScore: 40 }],
      },
      "JHS",
    );
    exportToCSV([maliciousSubjectStudent], "Broadsheet");
    const broadsheetText = await capturedBlobs[1].text();
    expect(broadsheetText.split("\n")[0]).toContain('"\'=SUM(A1)"');
  });
});

describe("Wave 2 — Score Precision, Weights, Lifecycle & Demo Data (P1-8..12, P1-20, P2-20..21)", () => {
  it("P1-8, P2-20, P2-21: avoids IEEE-754 half-mark drift, rounds raw sums, and clears stale examRawScore on clamp", () => {
    expect(convertExamRawToWeighted(29, 50).weightedScore).toBe(15);
    expect(convertExamRawToWeighted(57, 50).weightedScore).toBe(29);
    expect(formatExamWeightedAsRaw(29, 50)).toBe("58");

    const pace = calculateSbaPaceStats(
      [
        { id: "c1", name: "Task 1", score: 7.1, maxScore: 15 },
        { id: "c2", name: "Task 2", score: 7.2, maxScore: 15 },
      ],
      50,
    );
    expect(pace.rawSum).toBe(14.3);

    const student: StudentRecord = {
      id: "w1",
      name: "Kojo",
      className: "JHS 2",
      subjects: [{ id: "s1", name: "Math", classScore: 25, examScore: 35, examRawScore: 70 }],
    };
    const clamped = rescaleStudentsForWeightChange([student], 50, 50, 30, 70, "clamp");
    expect(clamped[0].subjects[0].examScore).toBe(35);
    expect("examRawScore" in clamped[0].subjects[0]).toBe(false);
  });

  it("P1-10, P1-11, P1-12, P1-20: clears stashed fields, bounds TERMLY weights, keeps stashed pending students, and handles MOCK demo data", () => {
    const withStashed: StudentRecord = {
      id: "stashed-1",
      name: "Stashed Student",
      className: "JHS 2",
      subjects: [
        {
          id: "sub1",
          name: "Math",
          classScore: 0,
          examScore: 0,
          savedDirectClassScore: 35,
          savedDirectClassScoreMax: 50,
          examRawScore: 80,
          classScoreComponents: [{ id: "c1", name: "CAT 1", score: 12, maxScore: 15 }],
        },
      ],
    };

    expect(hasNoScoresEntered(withStashed)).toBe(false);
    expect(filterActiveNonPendingStudents([withStashed]).removedCount).toBe(0);

    const cleared = clearAllStudentScoresData([withStashed])[0].subjects[0];
    expect(cleared.savedDirectClassScore).toBeUndefined();
    expect(cleared.savedDirectClassScoreMax).toBeUndefined();
    expect(cleared.examRawScore).toBeUndefined();
    expect(hasNoScoresEntered({ ...withStashed, subjects: [cleared] })).toBe(true);

    const lowBound = normalizeAssessmentWeightSettings(baseSettings, 0, 100, "TERMLY");
    expect(lowBound.clampedClass).toBe(1);
    expect(lowBound.clampedExam).toBe(99);
    const highBound = normalizeAssessmentWeightSettings(baseSettings, 95, 5, "TERMLY");
    expect(highBound.clampedClass).toBe(90);
    expect(highBound.clampedExam).toBe(10);

    const mockSettingsWithSba: SchoolSettings = {
      ...baseSettings,
      examType: "MOCK",
      classScoreMax: 0,
      examScoreMax: 100,
      subjectComponentMap: {
        Mathematics: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
      },
    };
    const demos = createDemoStudents(mockSettingsWithSba);
    for (const demo of demos) {
      for (const sub of demo.subjects) {
        expect(Number.isNaN(sub.classScore)).toBe(false);
        expect(Number.isNaN(sub.examScore)).toBe(false);
      }
    }
  });
});

describe("Wave 2 — GES Core/Aggregate Rules, Ranking & Import Consistency (P1-9, P1-13, P1-14, P1-19, P1-22)", () => {
  it("P1-13: distinguishes elective lookalikes from GES cores, caps core slots, and requires 6 subjects", () => {
    expect(isCoreSubject("Literature in English", "SHS")).toBe(false);
    expect(isCoreSubject("Literature in English", "JHS")).toBe(false);
    expect(isCoreSubject("Computer Science", "JHS")).toBe(false);
    expect(isCoreSubject("Agricultural Science", "PRIMARY")).toBe(false);
    expect(isCoreSubject("Additional Mathematics", "JHS")).toBe(false);
    expect(isCoreSubject("English Language", "SHS")).toBe(true);
    expect(isCoreSubject("Core Mathematics", "SHS")).toBe(true);
    expect(isCoreSubject("Integrated Science", "SHS")).toBe(true);

    // Only 4 subjects (default SHS template) -> null aggregate
    const shsFourOnly = processStudent(
      {
        id: "shs-4",
        name: "Default SHS",
        className: "SHS 1",
        subjects: [
          { id: "1", name: "English Language", classScore: 30, examScore: 60 },
          { id: "2", name: "Core Mathematics", classScore: 30, examScore: 60 },
          { id: "3", name: "Integrated Science", classScore: 30, examScore: 60 },
          { id: "4", name: "Social Studies", classScore: 30, examScore: 60 },
        ],
      },
      "SHS",
    );
    expect(shsFourOnly.aggregate).toBeNull();

    // SHS with Literature in English + 2 other electives -> Literature counts as elective, valid 6-subject aggregate
    const shsWithLit = processStudent(
      {
        id: "shs-lit",
        name: "Arts Candidate",
        className: "SHS 3",
        subjects: [
          { id: "1", name: "English Language", classScore: 28, examScore: 56 }, // 84 -> A1(1)
          { id: "2", name: "Core Mathematics", classScore: 25, examScore: 50 }, // 75 -> B2(2)
          { id: "3", name: "Integrated Science", classScore: 24, examScore: 48 }, // 72 -> B3(3)
          { id: "4", name: "Literature in English", classScore: 27, examScore: 56 }, // 83 -> A1(1)
          { id: "5", name: "History", classScore: 26, examScore: 52 }, // 78 -> B2(2)
          { id: "6", name: "Government", classScore: 24, examScore: 50 }, // 74 -> B3(3)
        ],
      },
      "SHS",
    );
    expect(shsWithLit.aggregate).toBe(1 + 2 + 3 + 1 + 2 + 3);
  });

  it("P1-14: keeps incomplete/unscored students as Pending... and leaves unscored subject positions undefined", () => {
    const rankSettings = {
      defaultSubjects: ["English Language", "Mathematics"],
      examType: "TERMLY" as const,
    };
    const complete = processStudent(
      {
        id: "c1",
        name: "Complete",
        className: "JHS 2",
        subjects: [
          { id: "s1", name: "English Language", classScore: 40, examScore: 40 },
          { id: "s2", name: "Mathematics", classScore: 35, examScore: 35 },
        ],
      },
      "JHS",
    );
    const partialHighAvg = processStudent(
      {
        id: "p1",
        name: "Incomplete Partial",
        className: "JHS 2",
        subjects: [
          { id: "s3", name: "English Language", classScore: 49, examScore: 50 },
          { id: "s4", name: "Mathematics", classScore: 0, examScore: 0 },
        ],
      },
      "JHS",
    );

    const ranked = assignPositions(assignSubjectPositions([partialHighAvg, complete]), rankSettings);
    expect(ranked[0].classPosition).toBe("Pending...");
    expect(ranked[1].classPosition).toBe("1st");
    expect(ranked[0].subjects[0].subjectPosition).toBe("1st");
    expect(ranked[0].subjects[1].subjectPosition).toBeUndefined();
    expect(ranked[1].subjects[1].subjectPosition).toBe("1st");
  });

  it("P1-9, P1-19, P1-22: keeps preview & applied scores aligned, protects direct classScore, dedupes duplicates, and preserves attendancePresent undefined", () => {
    const directStudent: StudentRecord = {
      id: "dir-1",
      name: "Direct Student",
      className: "JHS 2",
      gender: "Female",
      subjects: [{ id: "m1", name: "Mathematics", classScore: 35, examScore: 0 }],
    };

    const parsed = parseSbaScoreImport({
      rawText:
        "Name\tQuiz New (/20)\tExam\nDirect Student\t\t80\nNew Duplicate\t10\t70\nNew Duplicate\t18\t90",
      subjectName: "Mathematics",
      existingStudents: [directStudent],
      settings: baseSettings,
      conflictPolicy: "KEEP_EXISTING",
    });

    // Direct Student's direct classScore (35) stays 35 in BOTH preview and apply when row has no SBA cell
    expect(parsed.rows[0].computedClassScore).toBe(35);
    const appliedDirect = applyScoreRowToSubject({
      existingSubject: directStudent.subjects[0],
      row: parsed.rows[0],
      tasks: [{ name: "Quiz New", maxScore: 20, category: "CAT" }],
      activeSubject: "Mathematics",
      activeMode: "FULL_SUBJECT",
      conflictPolicy: "KEEP_EXISTING",
      classScoreMax: 50,
    });
    expect(appliedDirect.classScore).toBe(35);
    expect(appliedDirect.examScore).toBe(40);

    const plan = buildScoreImportPlan({
      parsedResult: parsed,
      activeSubject: "Mathematics",
      activeMode: "FULL_SUBJECT",
      activeSingleTask: undefined,
      activeTasks: [],
      students: [directStudent],
      settings: baseSettings,
      newColumnOverrides: {},
      createUnmatched: true,
      conflictPolicy: "KEEP_EXISTING",
    });

    expect(plan.createdCount).toBe(1);
    expect(plan.newRecords).toHaveLength(1);
    expect(plan.newRecords[0].attendancePresent).toBeUndefined();
    // KEEP_EXISTING across duplicate rows preserves first row's scores (10/20 -> 25 class, 70 -> 35 exam)
    const mathSub = plan.newRecords[0].subjects.find((s) => s.name === "Mathematics");
    expect(mathSub?.classScore).toBe(25);
    expect(mathSub?.examScore).toBe(35);
  });
});
