import type {
  ClassScoreComponent,
  ClassScoreComponentConfig,
  SchoolSettings,
  StudentRecord,
} from "../../types";
import { calculateGrade } from "../gradeCalculator";
import { calculateSbaPaceStats, normalizeTaskKey } from "../sbaReconciliation";
import { getExamRawDisplayValue } from "../scoreConversion";
import {
  escapeCsvCell,
  formatTemplateHeaderCell,
  normalizeComponentNameKey,
  normalizeHeader,
} from "./tabularParser";

/**
 * Generates a clean 2-column CSV template for a single SBA component (e.g. "English Summary Group Work").
 */
export function buildSingleComponentTemplateCsv(
  subjectName: string,
  task: Pick<ClassScoreComponentConfig, "name" | "maxScore">,
  students: Pick<StudentRecord, "name" | "subjects">[],
): string {
  const headers = ["Name", `${task.name} (/${task.maxScore})`];
  const rows =
    students.length > 0
      ? students.map((student) => {
          const subject = student.subjects.find((s) => s.name === subjectName);
          const comp = subject?.classScoreComponents?.find(
            (c) => normalizeHeader(c.name) === normalizeHeader(task.name),
          );
          return [
            escapeCsvCell(student.name),
            escapeCsvCell(comp && comp.score > 0 ? comp.score : ""),
          ];
        })
      : [
          [
            escapeCsvCell("Kwame Mensah"),
            escapeCsvCell(Math.round(task.maxScore * 0.8)),
          ],
        ];

  return [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Exports recorded scores for a single SBA component (Excel-ready with % and Class Score total).
 */
export function buildSingleComponentExportCsv(
  subjectName: string,
  task: Pick<ClassScoreComponentConfig, "name" | "maxScore">,
  students: Pick<StudentRecord, "name" | "subjects">[],
  settings: Pick<SchoolSettings, "classScoreMax">,
): string {
  const headers = [
    "Name",
    `${task.name} (/${task.maxScore})`,
    "Task Score (%)",
    `Subject Class Score (/${settings.classScoreMax})`,
  ];

  const rows = students.map((student) => {
    const subject = student.subjects.find((s) => s.name === subjectName);
    const comp = subject?.classScoreComponents?.find(
      (c) => normalizeHeader(c.name) === normalizeHeader(task.name),
    );
    const score = comp?.score ?? 0;
    const pct = task.maxScore > 0 ? Math.round((score / task.maxScore) * 100) : 0;
    return [
      escapeCsvCell(student.name),
      escapeCsvCell(comp ? score : ""),
      escapeCsvCell(comp ? `${pct}%` : ""),
      escapeCsvCell(subject ? subject.classScore : ""),
    ];
  });

  return [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generates a clean 2-column CSV template for end-of-term Final Exam scores (/100) only.
 */
export function buildExamOnlyTemplateCsv(
  subjectName: string,
  students: Pick<StudentRecord, "name" | "subjects">[],
  settings: Pick<SchoolSettings, "examType" | "examScoreMax">,
): string {
  const isMock = settings.examType === "MOCK";
  const headers = ["Name", isMock ? "Score (/100)" : "Exam (/100)"];
  const rows =
    students.length > 0
      ? students.map((student) => {
          const subject = student.subjects.find((s) => s.name === subjectName);
          return [
            escapeCsvCell(student.name),
            escapeCsvCell(
              subject ? getExamRawDisplayValue(subject, settings.examScoreMax) : "",
            ),
          ];
        })
      : [[escapeCsvCell("Kwame Mensah"), escapeCsvCell(78)]];

  return [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Exports a subject's Class & Exam view from Quick Gradebook to CSV.
 */
export function buildSubjectQuickExportCsv(
  subjectName: string,
  students: Pick<StudentRecord, "name" | "subjects">[],
  settings: Pick<SchoolSettings, "level" | "examType" | "classScoreMax" | "examScoreMax">,
): string {
  const isMock = settings.examType === "MOCK";
  const headers = isMock
    ? ["Name", "Score (/100)", "Grade"]
    : [
        "Name",
        `Class (/${settings.classScoreMax})`,
        "Exam (/100)",
        `Weighted Exam (/${settings.examScoreMax})`,
        "Total (/100)",
        "Grade",
      ];

  const rows = students.map((student) => {
    const subject = student.subjects.find((s) => s.name === subjectName);
    if (!subject) {
      return [escapeCsvCell(student.name), ...headers.slice(1).map(() => "")];
    }
    const total = (subject.classScore || 0) + (subject.examScore || 0);
    const { grade } = calculateGrade(total, settings.level);
    if (isMock) {
      return [escapeCsvCell(student.name), escapeCsvCell(total), escapeCsvCell(grade)];
    }
    return [
      escapeCsvCell(student.name),
      escapeCsvCell(subject.classScore),
      escapeCsvCell(getExamRawDisplayValue(subject, settings.examScoreMax)),
      escapeCsvCell(subject.examScore),
      escapeCsvCell(total),
      escapeCsvCell(grade),
    ];
  });

  return [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Resolves the active SBA component definitions for a subject from Settings or existing students.
 */
export function resolveSubjectSbaTasks(
  subjectName: string,
  students: Pick<StudentRecord, "subjects">[],
  settings: Pick<SchoolSettings, "examType" | "subjectComponentMap">,
): ClassScoreComponentConfig[] {
  if (settings.examType === "MOCK") return [];

  const configured = settings.subjectComponentMap?.[subjectName];
  if (configured && configured.length > 0) return configured;

  const discovered = new Map<string, ClassScoreComponentConfig>();
  students.forEach((student) => {
    const sub = student.subjects.find((s) => s.name === subjectName);
    sub?.classScoreComponents?.forEach((comp) => {
      const key = normalizeTaskKey(comp.name);
      if (key && !discovered.has(key)) {
        discovered.set(key, {
          name: comp.name,
          maxScore: comp.maxScore,
          category: comp.category,
        });
      }
    });
  });

  return Array.from(discovered.values());
}

/**
 * Exports a subject's full SBA markbook CSV (`Name`, each SBA task, `Raw Total`, `SBA Pace`,
 * `Class Score`, `Exam`, `Weighted Exam`, `Total`, `Grade`). Falls back to `buildSubjectQuickExportCsv`
 * when no SBA tasks are configured for `subjectName` (or in `MOCK` mode).
 */
export function buildSubjectSbaExportCsv(
  subjectName: string,
  students: Pick<StudentRecord, "name" | "subjects">[],
  settings: Pick<
    SchoolSettings,
    "level" | "examType" | "classScoreMax" | "examScoreMax" | "subjectComponentMap"
  >,
): string {
  const tasks = resolveSubjectSbaTasks(subjectName, students, settings);
  if (tasks.length === 0) {
    return buildSubjectQuickExportCsv(subjectName, students, settings);
  }

  const rawMax = tasks.reduce((sum, task) => sum + task.maxScore, 0);
  const headers = [
    "Name",
    ...tasks.map((task) => `${task.name} (/${task.maxScore})`),
    `Raw Total (/${rawMax})`,
    "SBA Pace (%)",
    `Class Score (/${settings.classScoreMax})`,
    "Exam (/100)",
    `Weighted Exam (/${settings.examScoreMax})`,
    "Total (/100)",
    "Grade",
  ];

  const rows = students.map((student) => {
    const subject = student.subjects.find((s) => s.name === subjectName);
    if (!subject) {
      return [escapeCsvCell(student.name), ...headers.slice(1).map(() => escapeCsvCell(""))];
    }

    const matchedComponents: ClassScoreComponent[] = tasks.map((task) => {
      const comp = subject.classScoreComponents?.find(
        (c) => normalizeComponentNameKey(c.name) === normalizeComponentNameKey(task.name),
      );
      return {
        id: comp?.id ?? task.name,
        name: task.name,
        score: comp?.score ?? 0,
        maxScore: task.maxScore,
        category: task.category ?? comp?.category,
      };
    });

    const pace = calculateSbaPaceStats(matchedComponents, settings.classScoreMax);
    const total = (subject.classScore || 0) + (subject.examScore || 0);
    const { grade } = calculateGrade(total, settings.level);

    return [
      escapeCsvCell(student.name),
      ...matchedComponents.map((comp) => escapeCsvCell(comp.score > 0 ? comp.score : "")),
      escapeCsvCell(pace.gradedTasks > 0 ? pace.rawSum : ""),
      escapeCsvCell(pace.pacePercent !== null ? `${pace.pacePercent}%` : ""),
      escapeCsvCell(subject.classScore),
      escapeCsvCell(getExamRawDisplayValue(subject, settings.examScoreMax)),
      escapeCsvCell(subject.examScore),
      escapeCsvCell(total),
      escapeCsvCell(grade),
    ];
  });

  return [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generates a pre-filled downloadable CSV template for entering SBA components & Exam scores
 * for a specific subject.
 */
export function buildSbaScoreTemplateCsv(
  subjectName: string,
  students: Pick<StudentRecord, "name" | "subjects">[],
  settings: Pick<
    SchoolSettings,
    "examType" | "classScoreMax" | "examScoreMax" | "subjectComponentMap"
  >,
): string {
  const isMock = settings.examType === "MOCK";
  const tasks = resolveSubjectSbaTasks(subjectName, students, settings);

  const headers = ["Name"];
  if (!isMock) {
    if (tasks.length > 0) {
      tasks.forEach((t) => headers.push(`${t.name} (/${t.maxScore})`));
    } else {
      headers.push(`Class Score (/${settings.classScoreMax})`);
    }
  }
  headers.push(isMock ? "Score (/100)" : "Exam (/100)");

  const rows =
    students.length > 0
      ? students.map((student) => {
          const subject = student.subjects.find((s) => s.name === subjectName);
          const cells = [escapeCsvCell(student.name)];
          if (!isMock) {
            if (tasks.length > 0) {
              tasks.forEach((task) => {
                const comp = subject?.classScoreComponents?.find(
                  (c) => normalizeComponentNameKey(c.name) === normalizeComponentNameKey(task.name),
                );
                cells.push(escapeCsvCell(comp && comp.score > 0 ? comp.score : ""));
              });
            } else {
              cells.push(escapeCsvCell(subject && subject.classScore > 0 ? subject.classScore : ""));
            }
          }
          cells.push(
            escapeCsvCell(
              subject ? getExamRawDisplayValue(subject, settings.examScoreMax) : "",
            ),
          );
          return cells;
        })
      : [
          [
            escapeCsvCell("Kwame Mensah"),
            ...(!isMock
              ? tasks.length > 0
                ? tasks.map((t) => escapeCsvCell(Math.round(t.maxScore * 0.8)))
                : [escapeCsvCell(Math.round(settings.classScoreMax * 0.8))]
              : []),
            escapeCsvCell(78),
          ],
        ];

  return [headers.map(formatTemplateHeaderCell).join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
}
