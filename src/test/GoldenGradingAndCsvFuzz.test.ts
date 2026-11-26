import { describe, expect, it } from "vitest";
import { DEFAULT_FACTORY_SETTINGS, DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { SavedSubject, SchoolLevel, SchoolSettings, StudentRecord } from "../types";
import { createBackupPayload, validateBackup } from "../utils/backupValidation";
import {
  cleanTaskNameFromHeader,
  parseRosterImport,
  parseSbaScoreImport,
  parseTabularText,
} from "../utils/csvImport";
import {
  assignPositions,
  assignSubjectPositions,
  calculateAgeFromDob,
  calculateGrade,
  processStudent,
} from "../utils/gradeCalculator";
import { convertExamRawToWeighted, getExamRawDisplayValue } from "../utils/scoreConversion";
import { stripDerivedStudentFields } from "../utils/studentSanitizer";
import { isStudentFailing, isStudentPending } from "../utils/studentValidation";

function makeSettings(overrides: Partial<SchoolSettings>): SchoolSettings {
  return {
    ...DEFAULT_FACTORY_SETTINGS,
    schoolName: "Golden Horizon Model School",
    academicYear: "2025/2026",
    term: "First Term",
    ...overrides,
  };
}

function makeSubject(
  id: string,
  name: string,
  classScore: number,
  examRawScore: number,
  settings: Pick<SchoolSettings, "classScoreMax" | "examScoreMax">,
): SavedSubject {
  return {
    id,
    name,
    classScore,
    examScore: convertExamRawToWeighted(examRawScore, settings.examScoreMax).weightedScore,
    examRawScore,
  };
}

describe("Golden GES Grading Scenarios across School Modes", () => {
  it("computes golden aggregates, tie positions, exact DOB ages, and backup round-trips across KG, PRIMARY, JHS, SHS, MOCK, and PRIVATE", () => {
    const fixedRef = new Date("2026-03-15T00:00:00Z");
    expect(calculateAgeFromDob("2014-03-14", fixedRef)).toBe(12);
    expect(calculateAgeFromDob("2014-03-16", fixedRef)).toBe(11);
    expect(calculateAgeFromDob("not-a-date", fixedRef)).toBeUndefined();

    const scenarios: Array<{
      label: string;
      level: SchoolLevel;
      settings: SchoolSettings;
      students: StudentRecord[];
      expectedFirstPosition: string;
      expectedAggregate: number | null;
      expectedTopGrade: string | number;
    }> = [
      {
        label: "KG",
        level: "KG",
        settings: makeSettings({
          level: "KG",
          defaultSubjects: ["Literacy", "Numeracy", "Creative Arts"],
          classScoreMax: 50,
          examScoreMax: 50,
        }),
        students: [
          {
            id: "kg-1",
            name: "Efua Mensah",
            className: "KG 2",
            subjects: [
              makeSubject("k1", "Literacy", 45, 90, { classScoreMax: 50, examScoreMax: 50 }),
              makeSubject("k2", "Numeracy", 42, 80, { classScoreMax: 50, examScoreMax: 50 }),
              makeSubject("k3", "Creative Arts", 40, 82, { classScoreMax: 50, examScoreMax: 50 }),
            ],
          },
          {
            id: "kg-2",
            name: "Kojo Owusu",
            className: "KG 2",
            subjects: [
              makeSubject("k4", "Literacy", 30, 50, { classScoreMax: 50, examScoreMax: 50 }),
              makeSubject("k5", "Numeracy", 30, 50, { classScoreMax: 50, examScoreMax: 50 }),
              makeSubject("k6", "Creative Arts", 25, 40, { classScoreMax: 50, examScoreMax: 50 }),
            ],
          },
        ],
        expectedFirstPosition: "1st",
        expectedAggregate: null,
        expectedTopGrade: "GOLD",
      },
      {
        label: "PRIMARY",
        level: "PRIMARY",
        settings: makeSettings({
          level: "PRIMARY",
          defaultSubjects: [
            "English Language",
            "Mathematics",
            "Integrated Science",
            "Social Studies",
            "Computing",
            "R.M.E",
            "Creative Arts",
          ],
          classScoreMax: 30,
          examScoreMax: 70,
        }),
        students: [
          {
            id: "pri-1",
            name: "Abena Adjei",
            className: "Basic 5",
            subjects: [
              makeSubject("p1", "English Language", 27, 80, { classScoreMax: 30, examScoreMax: 70 }), // 83 -> 1
              makeSubject("p2", "Mathematics", 26, 80, { classScoreMax: 30, examScoreMax: 70 }), // 82 -> 1
              makeSubject("p3", "Integrated Science", 24, 75, { classScoreMax: 30, examScoreMax: 70 }), // 76.5 -> 2
              makeSubject("p4", "Social Studies", 20, 70, { classScoreMax: 30, examScoreMax: 70 }), // 69 -> 4 (elective)
              makeSubject("p5", "Computing", 28, 85, { classScoreMax: 30, examScoreMax: 70 }), // 87.5 -> 1 (elective)
              makeSubject("p6", "R.M.E", 25, 80, { classScoreMax: 30, examScoreMax: 70 }), // 81 -> 1 (elective)
              makeSubject("p7", "Creative Arts", 24, 80, { classScoreMax: 30, examScoreMax: 70 }), // 80 -> 1 (elective)
            ],
          },
        ],
        expectedFirstPosition: "1st",
        expectedAggregate: 7, // 3 cores (1+1+2=4) + best 3 electives (1+1+1=3) = 7
        expectedTopGrade: 1,
      },
      {
        label: "JHS",
        level: "JHS",
        settings: makeSettings({
          level: "JHS",
          defaultSubjects: [
            "English Language",
            "Mathematics",
            "Integrated Science",
            "Social Studies",
            "Computing",
            "Career Technology",
            "R.M.E",
          ],
          classScoreMax: 50,
          examScoreMax: 50,
        }),
        students: [
          {
            id: "jhs-1",
            name: "Kwame Nkrumah",
            className: "JHS 3",
            subjects: [
              makeSubject("j1", "English Language", 46, 90, { classScoreMax: 50, examScoreMax: 50 }), // 91 -> 1
              makeSubject("j2", "Mathematics", 45, 90, { classScoreMax: 50, examScoreMax: 50 }), // 90 -> 1
              makeSubject("j3", "Integrated Science", 42, 80, { classScoreMax: 50, examScoreMax: 50 }), // 82 -> 2
              makeSubject("j4", "Social Studies", 40, 80, { classScoreMax: 50, examScoreMax: 50 }), // 80 -> 2
              makeSubject("j5", "Computing", 47, 92, { classScoreMax: 50, examScoreMax: 50 }), // 93 -> 1
              makeSubject("j6", "Career Technology", 45, 92, { classScoreMax: 50, examScoreMax: 50 }), // 91 -> 1
              makeSubject("j7", "R.M.E", 35, 70, { classScoreMax: 50, examScoreMax: 50 }), // 70 -> 3
            ],
          },
        ],
        expectedFirstPosition: "1st",
        expectedAggregate: 8, // 4 cores (1+1+2+2=6) + best 2 electives (1+1=2) = 8
        expectedTopGrade: 1,
      },
      {
        label: "SHS",
        level: "SHS",
        settings: makeSettings({
          level: "SHS",
          defaultSubjects: [
            "English Language",
            "Core Mathematics",
            "Integrated Science",
            "Social Studies",
            "Elective Mathematics",
            "Physics",
            "Chemistry",
            "Biology",
          ],
          classScoreMax: 30,
          examScoreMax: 70,
        }),
        students: [
          {
            id: "shs-1",
            name: "Akosua Frempong",
            className: "SHS 2 Science",
            subjects: [
              makeSubject("s1", "English Language", 26, 80, { classScoreMax: 30, examScoreMax: 70 }), // 82 -> A1 (1)
              makeSubject("s2", "Core Mathematics", 27, 80, { classScoreMax: 30, examScoreMax: 70 }), // 83 -> A1 (1)
              makeSubject("s3", "Integrated Science", 24, 70, { classScoreMax: 30, examScoreMax: 70 }), // 73 -> B3 (3)
              makeSubject("s4", "Social Studies", 25, 75, { classScoreMax: 30, examScoreMax: 70 }), // 77.5 -> B2 (2) (best third core)
              makeSubject("s5", "Elective Mathematics", 28, 86, { classScoreMax: 30, examScoreMax: 70 }), // 88.2 -> A1 (1)
              makeSubject("s6", "Physics", 26, 80, { classScoreMax: 30, examScoreMax: 70 }), // 82 -> A1 (1)
              makeSubject("s7", "Chemistry", 23, 78, { classScoreMax: 30, examScoreMax: 70 }), // 23 + 55 = 78 -> B2 (2)
              makeSubject("s8", "Biology", 20, 60, { classScoreMax: 30, examScoreMax: 70 }), // 62 -> C5 (5)
            ],
          },
        ],
        expectedFirstPosition: "1st",
        expectedAggregate: 8, // English(1)+CoreMath(1)+best(IntSci/Social=2)+best3Electives(1+1+2) = 8
        expectedTopGrade: "A1",
      },
      {
        label: "MOCK",
        level: "JHS",
        settings: makeSettings({
          level: "JHS",
          examType: "MOCK",
          classScoreMax: 0,
          examScoreMax: 100,
          defaultSubjects: [
            "English Language",
            "Mathematics",
            "Integrated Science",
            "Social Studies",
            "Computing",
            "R.M.E",
          ],
        }),
        students: [
          {
            id: "mock-1",
            name: "Yaw Boateng",
            className: "JHS 3 Mock",
            subjects: [
              makeSubject("m1", "English Language", 0, 91, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m2", "Mathematics", 0, 91, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m3", "Integrated Science", 0, 82, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m4", "Social Studies", 0, 82, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m9", "Computing", 0, 90, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m10", "R.M.E", 0, 85, { classScoreMax: 0, examScoreMax: 100 }),
            ],
          },
          {
            id: "mock-2",
            name: "Ama Tie",
            className: "JHS 3 Mock",
            subjects: [
              makeSubject("m5", "English Language", 0, 91, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m6", "Mathematics", 0, 91, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m7", "Integrated Science", 0, 82, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m8", "Social Studies", 0, 82, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m11", "Computing", 0, 90, { classScoreMax: 0, examScoreMax: 100 }),
              makeSubject("m12", "R.M.E", 0, 85, { classScoreMax: 0, examScoreMax: 100 }),
            ],
          },
        ],
        expectedFirstPosition: "1st",
        expectedAggregate: 9,
        expectedTopGrade: 1,
      },
      {
        label: "PRIVATE",
        level: "PRIMARY",
        settings: makeSettings({
          level: "PRIMARY",
          schoolType: "PRIVATE",
          defaultSubjects: ["English Language", "Mathematics", "Integrated Science"],
          classScoreMax: 50,
          examScoreMax: 50,
          privateFeeItems: [
            { id: "tuition", label: "Tuition", amount: 500, cycle: "PER_TERM", enabled: true },
          ],
        }),
        students: [
          {
            id: "priv-1",
            name: "Kofi Annan",
            className: "Grade 4",
            feeStatus: "PART_PAID",
            feeArrears: 150,
            subjects: [
              makeSubject("pr1", "English Language", 42, 80, { classScoreMax: 50, examScoreMax: 50 }),
              makeSubject("pr2", "Mathematics", 44, 86, { classScoreMax: 50, examScoreMax: 50 }),
              makeSubject("pr3", "Integrated Science", 40, 80, { classScoreMax: 50, examScoreMax: 50 }),
            ],
          },
        ],
        expectedFirstPosition: "1st",
        expectedAggregate: null,
        expectedTopGrade: 1,
      },
    ];

    for (const scenario of scenarios) {
      const processed = assignPositions(
        assignSubjectPositions(scenario.students.map((s) => processStudent(s, scenario.level))),
      );

      expect(processed[0].classPosition, scenario.label).toBe(scenario.expectedFirstPosition);
      expect(processed[0].aggregate, scenario.label).toBe(scenario.expectedAggregate);
      expect(processed[0].subjects[0].grade, scenario.label).toBe(scenario.expectedTopGrade);
      expect(isStudentPending(processed[0], scenario.settings), scenario.label).toBe(false);
      expect(isStudentFailing(processed[0], scenario.settings), scenario.label).toBe(false);

      if (scenario.label === "MOCK") {
        // Dense competition ranking: tied top two students must both be 1st
        expect(processed[1].classPosition).toBe("1st");
      }

      // Raw exam display stays lossless after backup serialization + validation + sanitization
      const sanitized = processed.map(stripDerivedStudentFields);
      expect((sanitized[0] as unknown as Record<string, unknown>).averageScore).toBeUndefined();
      const payload = createBackupPayload(sanitized, scenario.settings as unknown as Record<string, unknown>);
      const validated = validateBackup(payload);
      expect(validated.students).toHaveLength(scenario.students.length);

      const firstSubject = validated.students[0].subjects[0] as SavedSubject;
      expect(
        getExamRawDisplayValue(firstSubject, scenario.settings.examScoreMax),
        scenario.label,
      ).toBe(String(scenario.students[0].subjects[0].examRawScore));
    }

    // Invalid grade levels fall back deterministically
    expect(calculateGrade(50, "UNKNOWN" as SchoolLevel)).toEqual({
      grade: "F9",
      remark: "Invalid Level",
    });
  });

  it("distinguishes pending vs failing students strictly across incomplete and below-pass records", () => {
    const settings = makeSettings({
      level: "JHS",
      examType: "TERMLY",
      defaultSubjects: ["Mathematics", "English Language"],
      classScoreMax: 50,
      examScoreMax: 50,
    });

    const partialPending: StudentRecord = {
      id: "pend-1",
      name: "Pending Student",
      className: "JHS 1",
      subjects: [
        { id: "s1", name: "Mathematics", classScore: 0, examScore: 10 },
        { id: "s2", name: "English Language", classScore: 10, examScore: 10 },
      ],
    };
    const lowCompleted: StudentRecord = {
      id: "fail-1",
      name: "Failing Student",
      className: "JHS 1",
      subjects: [
        { id: "s3", name: "Mathematics", classScore: 15, examScore: 15 },
        { id: "s4", name: "English Language", classScore: 12, examScore: 18 },
      ],
    };

    const [p1, p2] = assignPositions([
      processStudent(partialPending, "JHS"),
      processStudent(lowCompleted, "JHS"),
    ]);

    expect(isStudentPending(p1, settings)).toBe(true);
    expect(isStudentFailing(p1, settings)).toBe(false);
    expect(isStudentPending(p2, settings)).toBe(false);
    expect(isStudentFailing(p2, settings)).toBe(true);
  });
});

describe("Messy CSV & Spreadsheet Paste Fuzz Hardening", () => {
  it("handles UTF-8 BOM, mixed CRLF/LF, quoted commas, blank lines, and messy SBA values without throwing or out-of-range leakage", () => {
    const messyRoster = [
      "\uFEFFFull Name,Gender,DOB,Attendance\r",
      '"Mensah, Kofi",boy,2014-05-09,58\r',
      "  Ama   Serwaa  ,F,bad-date,-12\n",
      "   \r",
      ",Male,2015-01-01,40\n",
      "Kwesi Appiah,unknown,2013-11-30,999\r\n",
    ].join("\n");

    expect(() => parseTabularText(messyRoster)).not.toThrow();
    const rosterResult = parseRosterImport(messyRoster, [{ id: "id-1", name: "ama serwaa" }]);
    expect(rosterResult.detectedHeaders).toBe(true);
    expect(rosterResult.rows.map((r) => r.name)).toEqual([
      "Mensah, Kofi",
      "Ama Serwaa",
      "Kwesi Appiah",
    ]);
    expect(rosterResult.rows[0].gender).toBe("Male");
    expect(rosterResult.rows[1].matchedExistingId).toBe("id-1");

    const students: StudentRecord[] = [
      {
        id: "s-1",
        name: "Mensah, Kofi",
        className: "JHS 1",
        subjects: [{ id: "sub-m", name: "Mathematics", classScore: 0, examScore: 0 }],
      },
    ];
    const settings: SchoolSettings = {
      ...DEFAULT_SETTINGS,
      level: "JHS",
      examType: "TERMLY",
      classScoreMax: 50,
      examScoreMax: 50,
      defaultSubjects: ["Mathematics"],
      subjectComponentMap: {
        Mathematics: [
          { name: "CAT 1", maxScore: 20, category: "CAT" },
          { name: "Project", maxScore: 30, category: "PROJECT" },
        ],
      },
    };

    const fuzzInputs = [
      "",
      "\uFEFF   \r\n  ",
      "Name\tCAT 1 (20)\tCAT 1\tExam\r\nMensah, Kofi\t999\t-5\t145.5",
      '"Student Name","cat   1","project","Exam (100)"\n"Mensah, Kofi","not-a-number","18","73"',
      "Name;CAT 1;Project;Exam\nUnknown Student;15;20;88\nMensah, Kofi;12;25;NaN",
      'Unclosed "quote row\nMensah, Kofi,10,10,70',
    ];

    for (const rawText of fuzzInputs) {
      expect(() => cleanTaskNameFromHeader(rawText.slice(0, 30))).not.toThrow();
      const parsed = parseSbaScoreImport({
        rawText,
        subjectName: "Mathematics",
        existingStudents: students,
        settings,
      });

      for (const row of parsed.rows) {
        expect(Number.isFinite(row.computedClassScore)).toBe(true);
        expect(row.computedClassScore).toBeGreaterThanOrEqual(0);
        expect(row.computedClassScore).toBeLessThanOrEqual(settings.classScoreMax);
        expect(Number.isFinite(row.effectiveExamWeighted)).toBe(true);
        expect(row.effectiveExamWeighted).toBeGreaterThanOrEqual(0);
        expect(row.effectiveExamWeighted).toBeLessThanOrEqual(settings.examScoreMax);

        if (row.examRawScore !== undefined) {
          expect(Number.isFinite(row.examRawScore.raw)).toBe(true);
          expect(row.examRawScore.raw).toBeGreaterThanOrEqual(0);
          expect(row.examRawScore.raw).toBeLessThanOrEqual(100);
          expect(Number.isFinite(row.examRawScore.weighted)).toBe(true);
          expect(row.examRawScore.weighted).toBeGreaterThanOrEqual(0);
          expect(row.examRawScore.weighted).toBeLessThanOrEqual(settings.examScoreMax);
        }
        for (const comp of row.componentScores) {
          expect(Number.isFinite(comp.score)).toBe(true);
          expect(comp.score).toBeGreaterThanOrEqual(0);
          expect(comp.score).toBeLessThanOrEqual(comp.maxScore);
        }
      }
    }
  });
});
