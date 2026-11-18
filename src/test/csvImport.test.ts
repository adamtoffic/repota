import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { SchoolSettings, StudentRecord } from "../types";
import {
  buildDefaultSubjectsForStudent,
  buildExamOnlyTemplateCsv,
  buildRosterTemplateCsv,
  buildSbaScoreTemplateCsv,
  buildSingleComponentExportCsv,
  buildSingleComponentTemplateCsv,
  parseRosterImport,
  parseSbaScoreImport,
  parseTabularText,
} from "../utils/csvImport";

const settingsWithSba: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Ghana Basic School",
  className: "Basic 6",
  level: "JHS",
  classScoreMax: 50,
  examScoreMax: 50,
  defaultSubjects: ["Mathematics", "English"],
  subjectComponentMap: {
    Mathematics: [
      { name: "CAT 1", maxScore: 15, category: "CAT" },
      { name: "Group Work", maxScore: 15, category: "GROUP" },
      { name: "Project", maxScore: 20, category: "PROJECT" },
    ],
  },
};

const existingStudents: StudentRecord[] = [
  {
    id: "stu-1",
    name: "Kwame Mensah",
    className: "Basic 6",
    gender: "Male",
    subjects: [
      {
        id: "s1",
        name: "Mathematics",
        classScore: 0,
        examScore: 0,
        classScoreComponents: [
          { id: "c1", name: "CAT 1", score: 0, maxScore: 15, category: "CAT" },
          { id: "c2", name: "Group Work", score: 0, maxScore: 15, category: "GROUP" },
          { id: "c3", name: "Project", score: 0, maxScore: 20, category: "PROJECT" },
        ],
      },
    ],
  },
];

describe("csvImport", () => {
  it("parses quoted CSV and tab-separated Excel/Sheets paste cleanly", () => {
    const csv = parseTabularText('"Mensah, Kwame",Male,2014-05-10\n"Ama Serwaa",Female,2014-08-01');
    expect(csv).toEqual([
      ["Mensah, Kwame", "Male", "2014-05-10"],
      ["Ama Serwaa", "Female", "2014-08-01"],
    ]);

    const tsv = parseTabularText("Name\tCAT 1\tExam\nKwame Mensah\t12\t80");
    expect(tsv).toEqual([
      ["Name", "CAT 1", "Exam"],
      ["Kwame Mensah", "12", "80"],
    ]);
  });

  it("parses plain names, shorthand rows, and headered CSV roster with existing student matching", () => {
    const plain = parseRosterImport("Kwame Mensah\nAma Serwaa", existingStudents);
    expect(plain.rows).toHaveLength(2);
    expect(plain.rows[0].matchedExistingId).toBe("stu-1");
    expect(plain.hasMissingGender).toBe(true);

    const headered = parseRosterImport(
      "Full Name,Sex,DOB,Attendance\nKwame Mensah,M,2014-02-11,66\nAbena Boateng,F,2014-06-15,70",
      existingStudents,
    );
    expect(headered.detectedHeaders).toBe(true);
    expect(headered.hasMissingGender).toBe(false);
    expect(headered.rows[1]).toMatchObject({
      name: "Abena Boateng",
      gender: "Female",
      dateOfBirth: "2014-06-15",
      attendancePresent: 70,
    });
  });

  it("attaches configured SBA components when building default subjects", () => {
    const subjects = buildDefaultSubjectsForStudent(settingsWithSba);
    const math = subjects.find((s) => s.name === "Mathematics");
    expect(math?.classScoreComponents).toHaveLength(3);
    expect(math?.classScoreComponents?.map((c) => c.name)).toEqual([
      "CAT 1",
      "Group Work",
      "Project",
    ]);
  });

  it("generates dynamic SBA template CSV and parses scored SBA components + Exam scores", () => {
    const templateCsv = buildSbaScoreTemplateCsv("Mathematics", existingStudents, settingsWithSba);
    expect(templateCsv).toContain("Name,CAT 1 (/15),Group Work (/15),Project (/20),Exam (/100)");
    expect(templateCsv).toContain('"Kwame Mensah"');

    const parsed = parseSbaScoreImport({
      rawText: "Name\tCAT 1 (/15)\tGroup Work (/15)\tProject (/20)\tExam (/100)\nKwame Mensah\t12\t13\t15\t80\nAma Serwaa\t20\t10\t10\t90",
      subjectName: "Mathematics",
      existingStudents,
      settings: settingsWithSba,
    });

    expect(parsed.rows).toHaveLength(2);
    // Kwame: (12+13+15)/50 * 50 = 40 classScore; Exam 80/100 * 50 = 40 examScore
    expect(parsed.rows[0].matchedStudentId).toBe("stu-1");
    expect(parsed.rows[0].computedClassScore).toBe(40);
    expect(parsed.rows[0].examRawScore?.weighted).toBe(40);
    expect(parsed.rows[0].hasWarnings).toBe(false);

    // Ama: CAT 1 = 20 > max 15 -> clamped to 15 + flagged warning
    expect(parsed.rows[1].isNewStudent).toBe(true);
    expect(parsed.rows[1].hasWarnings).toBe(true);
    expect(parsed.rows[1].componentScores[0].score).toBe(15);
    expect(parsed.rows[1].computedClassScore).toBe(35);
  });

  it("neutralizes spreadsheet formula injection in generated templates", () => {
    const csv = buildRosterTemplateCsv(
      [{ name: "=HYPERLINK(\"http://evil\")", gender: "Female" }],
      { schoolType: "STANDARD" },
    );
    expect(csv).toContain("\"'=HYPERLINK");
  });

  it("auto-detects unknown SBA component columns like Science Project (/20) and flags existing score conflicts", () => {
    const scienceSettings: SchoolSettings = {
      ...settingsWithSba,
      defaultSubjects: ["Science"],
      subjectComponentMap: {
        Science: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
      },
    };
    const scienceStudents: StudentRecord[] = [
      {
        id: "sci-1",
        name: "Kwame Mensah",
        className: "Basic 6",
        gender: "Male",
        subjects: [
          {
            id: "sub-sci-1",
            name: "Science",
            classScore: 40,
            examScore: 0,
            classScoreComponents: [
              { id: "c1", name: "CAT 1", score: 12, maxScore: 15, category: "CAT" },
            ],
          },
        ],
      },
    ];

    const parsed = parseSbaScoreImport({
      rawText: "Name\tCAT 1 (/15)\tScience Project (/20)\nKwame Mensah\t15\t16",
      subjectName: "Science",
      existingStudents: scienceStudents,
      settings: scienceSettings,
      conflictPolicy: "KEEP_EXISTING",
    });

    expect(parsed.detectedNewColumns).toHaveLength(1);
    expect(parsed.detectedNewColumns[0]).toMatchObject({
      suggestedName: "Science Project",
      suggestedMaxScore: 20,
      suggestedCategory: "PROJECT",
    });
    expect(parsed.conflictCount).toBe(1);
    expect(parsed.rows[0].componentScores[0]).toMatchObject({
      name: "CAT 1",
      existingScore: 12,
      score: 15,
      isConflict: true,
    });
    expect(parsed.rows[0].componentScores[1]).toMatchObject({
      name: "Science Project",
      score: 16,
      maxScore: 20,
      isNewTask: true,
    });
    // KEEP_EXISTING keeps CAT 1 at 12 + adds Science Project 16 => 28 / 35 * 50 = 40
    expect(parsed.rows[0].computedClassScore).toBe(40);
  });

  it("builds and parses Single SBA Task templates/exports separately from Exam", () => {
    const task = { name: "English Summary Group Work", maxScore: 15, category: "GROUP" as const };
    const englishStudents: StudentRecord[] = [
      {
        id: "stu-e1",
        name: "Kwame Mensah",
        className: "Basic 6",
        subjects: [
          {
            id: "sub-e1",
            name: "English",
            classScore: 30,
            examScore: 40,
            classScoreComponents: [
              { id: "c1", name: "English Summary Group Work", score: 12, maxScore: 15, category: "GROUP" },
            ],
          },
        ],
      },
    ];

    const template = buildSingleComponentTemplateCsv("English", task, englishStudents);
    expect(template).toBe('"Name","English Summary Group Work (/15)"\n"Kwame Mensah","12"');

    const exported = buildSingleComponentExportCsv("English", task, englishStudents, {
      classScoreMax: 50,
    });
    expect(exported).toBe(
      '"Name","English Summary Group Work (/15)","Task Score (%)","Subject Class Score (/50)"\n"Kwame Mensah","12","80%","30"',
    );

    const parsedSingle = parseSbaScoreImport({
      rawText: "Name\tScore\nKwame Mensah\t14",
      subjectName: "English",
      existingStudents: englishStudents,
      settings: settingsWithSba,
      importMode: "SINGLE_COMPONENT",
      targetTask: task,
      conflictPolicy: "OVERWRITE",
    });

    expect(parsedSingle.matchedColumns).toEqual([
      "Name -> col 1",
      "Score -> SBA: English Summary Group Work (/15)",
    ]);
    expect(parsedSingle.conflictCount).toBe(1);
    expect(parsedSingle.rows[0].componentScores[0]).toMatchObject({
      name: "English Summary Group Work",
      score: 14,
      existingScore: 12,
      maxScore: 15,
    });
    expect(parsedSingle.rows[0].examRawScore).toBeUndefined();
  });

  it("builds and parses Final Exam-only sheets while preserving SBA components", () => {
    const examStudents: StudentRecord[] = [
      {
        id: "stu-ex1",
        name: "Kwame Mensah",
        className: "Basic 6",
        subjects: [
          {
            id: "sub-ex1",
            name: "Mathematics",
            classScore: 40,
            examScore: 30,
            classScoreComponents: [
              { id: "c1", name: "CAT 1", score: 12, maxScore: 15, category: "CAT" },
            ],
          },
        ],
      },
    ];

    const examTemplate = buildExamOnlyTemplateCsv("Mathematics", examStudents, settingsWithSba);
    expect(examTemplate).toBe('"Name","Exam (/100)"\n"Kwame Mensah","60"');

    const parsedExam = parseSbaScoreImport({
      rawText: "Name\tExam Score\nKwame Mensah\t84",
      subjectName: "Mathematics",
      existingStudents: examStudents,
      settings: settingsWithSba,
      importMode: "EXAM_ONLY",
    });

    expect(parsedExam.matchedColumns).toEqual([
      "Name -> col 1",
      "Exam Score -> Exam (/100)",
    ]);
    expect(parsedExam.conflictCount).toBe(1);
    expect(parsedExam.rows[0].componentScores).toHaveLength(0);
    expect(parsedExam.rows[0].directClassScore).toBeUndefined();
    expect(parsedExam.rows[0].examRawScore).toMatchObject({
      raw: 84,
      existingRaw: 60,
      weighted: 42,
      isConflict: true,
    });
  });
});
