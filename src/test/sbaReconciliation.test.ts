import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { ClassScoreComponentConfig, SchoolSettings, StudentRecord } from "../types";
import {
  SBA_PRESETS,
  WEIGHT_PRESETS,
  areSubjectsUsingUniformTasks,
  calculateSbaPaceStats,
  countAffectedStudentsForWeightChange,
  deriveLibraryFromSubjectMap,
  impactOfSbaTaskChange,
  isStudentUnscoredForSba,
  reconcileStudentsWithSbaConfig,
  rescaleStudentsForWeightChange,
} from "../utils/sbaReconciliation";
import { addToLibrary, removeFromLibrary, updateInLibrary } from "../utils/componentRegistry";
import { buildSubjectSbaExportCsv, parseSbaScoreImport } from "../utils/csvImport";

function makeSettings(overrides: Partial<SchoolSettings> = {}): SchoolSettings {
  return {
    ...DEFAULT_SETTINGS,
    level: "JHS",
    examType: "TERMLY",
    classScoreMax: 50,
    examScoreMax: 50,
    defaultSubjects: ["Mathematics", "English"],
    ...overrides,
  };
}

function makeStudent(
  id: string,
  name: string,
  subjects: StudentRecord["subjects"],
): StudentRecord {
  return {
    id,
    name,
    className: "JHS 2",
    gender: "Female",
    subjects,
  };
}

describe("sbaReconciliation & componentRegistry", () => {
  it("provides standard GES SBA and weight presets", () => {
    expect(SBA_PRESETS.length).toBeGreaterThanOrEqual(2);
    expect(SBA_PRESETS[0].tasks.reduce((sum, t) => sum + t.maxScore, 0)).toBe(60);
    expect(WEIGHT_PRESETS.some((p) => p.classScoreMax === 50 && p.examScoreMax === 50)).toBe(true);
    expect(WEIGHT_PRESETS.some((p) => p.classScoreMax === 30 && p.examScoreMax === 70)).toBe(true);
  });

  it("reconciles configured subjects in isolation while preserving untouched subjects and syncing category", () => {
    const mathTasksBefore = [
      { id: "m1", name: "Quiz 1", score: 12, maxScore: 15, category: "CAT" as const },
    ];
    const englishSubject = {
      id: "sub-eng",
      name: "English",
      classScore: 34,
      examScore: 40,
      classScoreComponents: [
        { id: "e1", name: "Old Essay", score: 18, maxScore: 20, category: "CAT" as const },
        { id: "e2", name: "Reading", score: 12, maxScore: 15, category: "HOMEWORK" as const },
      ],
    };
    const mathSubject = {
      id: "sub-math",
      name: "Mathematics",
      classScore: 40,
      examScore: 38,
      classScoreComponents: mathTasksBefore,
    };
    const student = makeStudent("stu-1", "Abena Mensah", [mathSubject, englishSubject]);

    const settings = makeSettings({
      classScoreMax: 50,
      subjectComponentMap: {
        Mathematics: [{ name: "Quiz 1", maxScore: 15, category: "CAT" }],
        English: [
          { name: "CAT Essay", maxScore: 15, category: "PROJECT" },
          { name: "Reading", maxScore: 15, category: "HOMEWORK" },
        ],
      },
    });

    const { students, modifiedStudentCount } = reconcileStudentsWithSbaConfig([student], settings, {
      renamedTasks: { "Old Essay": "CAT Essay" },
    });

    expect(modifiedStudentCount).toBe(1);
    const updatedMath = students[0].subjects[0];
    const updatedEng = students[0].subjects[1];

    // Untouched Mathematics keeps exact subject reference and marks
    expect(updatedMath).toBe(mathSubject);
    expect(updatedMath.classScore).toBe(40);

    // English preserves renamed task score clamped to new /15 max and syncs category
    expect(updatedEng.classScoreComponents).toHaveLength(2);
    expect(updatedEng.classScoreComponents?.[0]).toMatchObject({
      id: "e1",
      name: "CAT Essay",
      score: 15,
      maxScore: 15,
      category: "PROJECT",
    });
    expect(updatedEng.classScoreComponents?.[1]).toMatchObject({
      id: "e2",
      name: "Reading",
      score: 12,
      maxScore: 15,
    });
    // (15 + 12) / 30 * 50 = 45
    expect(updatedEng.classScore).toBe(45);
  });

  it("supports preserve_class_score vs zero when clearing tasks and leaves MOCK students untouched", () => {
    const student = makeStudent("stu-1", "Kofi Boateng", [
      {
        id: "sub-eng",
        name: "English",
        classScore: 35,
        examScore: 42,
        classScoreComponents: [{ id: "c1", name: "Quiz 1", score: 14, maxScore: 20 }],
      },
    ]);

    const clearedSettings = makeSettings({ subjectComponentMap: {} });

    const preserved = reconcileStudentsWithSbaConfig([student], clearedSettings, {
      onClearTasks: "preserve_class_score",
    });
    expect(preserved.modifiedStudentCount).toBe(1);
    expect(preserved.students[0].subjects[0].classScoreComponents).toBeUndefined();
    expect(preserved.students[0].subjects[0].classScore).toBe(35);

    const zeroed = reconcileStudentsWithSbaConfig([student], clearedSettings, {
      onClearTasks: "zero",
    });
    expect(zeroed.students[0].subjects[0].classScoreComponents).toBeUndefined();
    expect(zeroed.students[0].subjects[0].classScore).toBe(0);

    const mockResult = reconcileStudentsWithSbaConfig(
      [student],
      makeSettings({ examType: "MOCK", subjectComponentMap: {} }),
    );
    expect(mockResult.modifiedStudentCount).toBe(0);
    expect(mockResult.students[0]).toBe(student);
  });

  it("rescales direct/exam weights accurately while recomputing SBA subjects losslessly from raw marks", () => {
    const student = makeStudent("stu-1", "Ama Osei", [
      {
        // SBA-tracked: 30 / 60 raw -> 50% -> 25/50 initially, must become 15/30 under 30/70
        id: "sub-sba",
        name: "Mathematics",
        classScore: 25,
        examScore: 40, // 80% raw out of 50 -> 56/70 under rescale
        classScoreComponents: [
          { id: "c1", name: "CAT 1", score: 15, maxScore: 30 },
          { id: "c2", name: "CAT 2", score: 15, maxScore: 30 },
        ],
      },
      {
        // Direct-entry (no components): 40/50 -> 24/30 under rescale, capped at 30/30 under clamp
        id: "sub-direct",
        name: "English",
        classScore: 40,
        examScore: 25, // 50% raw out of 50 -> 35/70 under rescale, stays 25 under clamp
      },
    ]);

    expect(countAffectedStudentsForWeightChange([student], 50, 50, 30, 70)).toBe(1);
    expect(countAffectedStudentsForWeightChange([student], 50, 50, 50, 50)).toBe(0);

    const rescaled = rescaleStudentsForWeightChange([student], 50, 50, 30, 70, "rescale");
    expect(rescaled[0].subjects[0]).toMatchObject({ classScore: 15, examScore: 56 });
    expect(rescaled[0].subjects[1]).toMatchObject({ classScore: 24, examScore: 35 });

    const clamped = rescaleStudentsForWeightChange([student], 50, 50, 30, 70, "clamp");
    // SBA still recomputes cleanly from raw tasks (30/60 * 30 = 15)
    expect(clamped[0].subjects[0]).toMatchObject({ classScore: 15, examScore: 40 });
    expect(clamped[0].subjects[1]).toMatchObject({ classScore: 30, examScore: 25 });
  });

  it("counts destructive impact for delete, shrink_max, replace_all, and clear_tasks", () => {
    const students = [
      makeStudent("s1", "Kwaku", [
        {
          id: "m1",
          name: "Mathematics",
          classScore: 38,
          examScore: 30,
          classScoreComponents: [
            { id: "t1", name: "CAT 1", score: 18, maxScore: 20 },
            { id: "t2", name: "Project", score: 12, maxScore: 20 },
          ],
        },
        {
          id: "e1",
          name: "English",
          classScore: 20,
          examScore: 30,
          classScoreComponents: [{ id: "et1", name: "CAT 1", score: 8, maxScore: 20 }],
        },
      ]),
      makeStudent("s2", "Akosua", [
        {
          id: "m2",
          name: "Mathematics",
          classScore: 0,
          examScore: 0,
          classScoreComponents: [
            { id: "t3", name: "CAT 1", score: 0, maxScore: 20 },
            { id: "t4", name: "Project", score: 0, maxScore: 20 },
          ],
        },
      ]),
    ];

    expect(
      impactOfSbaTaskChange(students, ["Mathematics"], { type: "delete_task", taskName: "CAT 1" }),
    ).toEqual({ affectedStudentCount: 1, affectedScoreCount: 1 });

    expect(
      impactOfSbaTaskChange(students, ["Mathematics"], {
        type: "shrink_max",
        taskName: "CAT 1",
        newMaxScore: 15,
      }),
    ).toEqual({ affectedStudentCount: 1, affectedScoreCount: 1 });

    expect(
      impactOfSbaTaskChange(students, ["Mathematics", "English"], {
        type: "replace_all",
        nextTasks: [{ name: "CAT 1", maxScore: 10 }],
      }),
    ).toEqual({ affectedStudentCount: 1, affectedScoreCount: 2 });

    expect(impactOfSbaTaskChange(students, ["Mathematics"], { type: "clear_tasks" })).toEqual({
      affectedStudentCount: 1,
      affectedScoreCount: 2,
    });
  });

  it("computes mid-term SBA pace stats and unscored filter status accurately", () => {
    expect(
      calculateSbaPaceStats(
        [
          { id: "1", name: "CAT 1", score: 0, maxScore: 15 },
          { id: "2", name: "CAT 2", score: 0, maxScore: 15 },
        ],
        50,
      ),
    ).toEqual({
      totalTasks: 2,
      gradedTasks: 0,
      rawSum: 0,
      rawMax: 30,
      gradedMax: 0,
      scaledClassScore: 0,
      pacePercent: null,
      isPartialMidTerm: false,
    });

    expect(
      calculateSbaPaceStats(
        [
          { id: "1", name: "CAT 1", score: 12, maxScore: 15 },
          { id: "2", name: "Group", score: 0, maxScore: 15 },
          { id: "3", name: "CAT 2", score: 0, maxScore: 15 },
          { id: "4", name: "Project", score: 0, maxScore: 15 },
        ],
        50,
      ),
    ).toEqual({
      totalTasks: 4,
      gradedTasks: 1,
      rawSum: 12,
      rawMax: 60,
      gradedMax: 15,
      scaledClassScore: 10,
      pacePercent: 80,
      isPartialMidTerm: true,
    });

    const partialStudent = makeStudent("s1", "Yaw", [
      {
        id: "m",
        name: "Mathematics",
        classScore: 10,
        examScore: 0,
        classScoreComponents: [
          { id: "1", name: "CAT 1", score: 12, maxScore: 15 },
          { id: "2", name: "CAT 2", score: 0, maxScore: 15 },
        ],
      },
    ]);
    expect(
      isStudentUnscoredForSba(partialStudent, "Mathematics", [
        { name: "CAT 1", maxScore: 15 },
        { name: "CAT 2", maxScore: 15 },
      ]),
    ).toBe(true);
    expect(
      isStudentUnscoredForSba(partialStudent, "Mathematics", [{ name: "CAT 1", maxScore: 15 }]),
    ).toBe(false);
    expect(isStudentUnscoredForSba(partialStudent, "Science", [])).toBe(true);
  });

  it("checks uniform subject config and derives library cleanly across registry operations", () => {
    const shared: ClassScoreComponentConfig[] = [
      { name: "CAT 1", maxScore: 15, category: "CAT" },
      { name: "Project", maxScore: 15, category: "PROJECT" },
    ];
    expect(
      areSubjectsUsingUniformTasks(["Mathematics", "English"], {
        Mathematics: shared,
        English: [...shared],
      }),
    ).toEqual({ isUniform: true, sharedTasks: shared });

    expect(
      areSubjectsUsingUniformTasks(["Mathematics", "English"], {
        Mathematics: shared,
        English: [{ name: "CAT 1", maxScore: 15, category: "GROUP" }],
      }).isUniform,
    ).toBe(false);

    const derived = deriveLibraryFromSubjectMap(
      {
        Mathematics: [{ name: "Quiz 1", maxScore: 20 }],
        English: [{ name: "quiz 1", maxScore: 20 }],
      },
      [{ name: "Quiz 1", maxScore: 20, category: "CAT" }],
    );
    expect(derived).toEqual([{ name: "Quiz 1", maxScore: 20, category: "CAT" }]);

    // Pure componentRegistry mutations
    const added = addToLibrary([], { name: "Quiz 1", maxScore: 20, category: "CAT" });
    expect(added.error).toBeUndefined();
    const dup = addToLibrary(added.library, { name: "quiz 1", maxScore: 10 });
    expect(dup.error).toBeDefined();

    const updated = updateInLibrary(
      added.library,
      { Mathematics: added.library },
      "Quiz 1",
      { name: "CAT 1", maxScore: 15, category: "CAT" },
    );
    expect(updated.library).toEqual([{ name: "CAT 1", maxScore: 15, category: "CAT" }]);
    expect(updated.subjectComponentMap.Mathematics).toEqual([
      { name: "CAT 1", maxScore: 15, category: "CAT" },
    ]);

    const removed = removeFromLibrary(updated.library, updated.subjectComponentMap, "CAT 1");
    expect(removed.library).toEqual([]);
    expect(removed.subjectComponentMap).toEqual({});
  });

  it("exports SBA markbook CSV with Raw Total and SBA Pace and round-trips without phantom columns", () => {
    const tasks: ClassScoreComponentConfig[] = [
      { name: "CAT 1", maxScore: 15, category: "CAT" },
      { name: "Group Work", maxScore: 15, category: "GROUP" },
      { name: "CAT 2", maxScore: 15, category: "CAT" },
      { name: "Project Work", maxScore: 15, category: "PROJECT" },
    ];
    const settings = makeSettings({
      subjectComponentMap: { English: tasks },
    });
    const student = makeStudent("s1", "Efua Sarpong", [
      {
        id: "sub-1",
        name: "English",
        classScore: 35,
        examScore: 40,
        classScoreComponents: [
          { id: "1", name: "CAT 1", score: 12, maxScore: 15, category: "CAT" },
          { id: "2", name: "Group Work", score: 10, maxScore: 15, category: "GROUP" },
          { id: "3", name: "CAT 2", score: 11, maxScore: 15, category: "CAT" },
          { id: "4", name: "Project Work", score: 9, maxScore: 15, category: "PROJECT" },
        ],
      },
    ]);

    const csv = buildSubjectSbaExportCsv("English", [student], settings);
    expect(csv).toContain("CAT 1 (/15)");
    expect(csv).toContain("Raw Total (/60)");
    expect(csv).toContain("SBA Pace (%)");
    expect(csv).toContain("Class Score (/50)");

    const parsed = parseSbaScoreImport({
      rawText: csv,
      subjectName: "English",
      existingStudents: [student],
      settings,
      importMode: "FULL_SUBJECT",
    });

    expect(parsed.matchedStudentCount).toBe(1);
    expect(parsed.detectedNewColumns).toEqual([]);
    expect(parsed.matchedColumns.filter((col) => col.includes("-> SBA:"))).toHaveLength(4);
    expect(parsed.rows[0].sbaRawSum).toBe(42);
    expect(parsed.rows[0].computedClassScore).toBe(35);
    expect(parsed.rows[0].componentScores.map((c) => [c.name, c.score])).toEqual([
      ["CAT 1", 12],
      ["Group Work", 10],
      ["CAT 2", 11],
      ["Project Work", 9],
    ]);
  });
});
