import type { SavedSubject, SchoolSettings, StudentRecord } from "../types";

/** Prefix shared by sample student IDs created by `loadDemoData`. */
export const DEMO_STUDENT_PREFIX = "demo-";

function createDemoSubject(
  subName: string,
  settings: SchoolSettings,
  classScoreRange: [number, number],
  examScoreRange: [number, number],
): SavedSubject {
  const subject: SavedSubject = {
    id: crypto.randomUUID(),
    name: subName,
    classScore: 0,
    examScore:
      Math.floor(Math.random() * (examScoreRange[1] - examScoreRange[0] + 1)) +
      examScoreRange[0],
  };

  const hasComponents =
    settings.subjectComponentMap && Object.keys(settings.subjectComponentMap).length > 0;
  const subjectComponents = settings.subjectComponentMap?.[subName];

  if (
    settings.examType !== "MOCK" &&
    settings.classScoreMax > 0 &&
    hasComponents &&
    subjectComponents &&
    subjectComponents.length > 0
  ) {
    const totalMaxScore = subjectComponents.reduce((sum, c) => sum + c.maxScore, 0);
    if (totalMaxScore > 0) {
      const targetClassScore =
        Math.floor(Math.random() * (classScoreRange[1] - classScoreRange[0] + 1)) +
        classScoreRange[0];
      const targetPercentage = targetClassScore / settings.classScoreMax;
      const targetTotalScore = targetPercentage * totalMaxScore;

      subject.classScoreComponents = subjectComponents.map((config) => {
        const proportion = config.maxScore / totalMaxScore;
        const baseScore = targetTotalScore * proportion;
        const variance = baseScore * 0.15;
        const score = Math.min(
          config.maxScore,
          Math.max(0, Math.floor(baseScore + (Math.random() * variance * 2 - variance))),
        );

        return {
          id: crypto.randomUUID(),
          name: config.name,
          score,
          maxScore: config.maxScore,
          ...(config.category !== undefined ? { category: config.category } : {}),
        };
      });

      const totalActualScore = subject.classScoreComponents.reduce((sum, c) => sum + c.score, 0);
      subject.classScore = Math.round((totalActualScore * settings.classScoreMax) / totalMaxScore);
    } else {
      subject.classScore =
        Math.floor(Math.random() * (classScoreRange[1] - classScoreRange[0] + 1)) +
        classScoreRange[0];
    }
  } else {
    subject.classScore =
      Math.floor(Math.random() * (classScoreRange[1] - classScoreRange[0] + 1)) +
      classScoreRange[0];
  }

  return subject;
}

const DEMO_ROSTER: Array<{
  id: string;
  name: string;
  gender: "Male" | "Female";
  classRange: [number, number];
  examRange: [number, number];
  attendancePresent: number;
}> = [
  { id: "demo-1", name: "Kwame Mensah", gender: "Male", classRange: [0.7, 0.9], examRange: [0.7, 0.9], attendancePresent: 65 },
  { id: "demo-2", name: "Ama Asante", gender: "Female", classRange: [0.76, 0.96], examRange: [0.8, 1], attendancePresent: 68 },
  { id: "demo-3", name: "Kofi Owusu", gender: "Male", classRange: [0.56, 0.76], examRange: [0.6, 0.8], attendancePresent: 60 },
  { id: "demo-4", name: "Abena Boateng", gender: "Female", classRange: [0.8, 1], examRange: [0.84, 1], attendancePresent: 70 },
  { id: "demo-5", name: "Yaw Adomako", gender: "Male", classRange: [0.5, 0.74], examRange: [0.56, 0.8], attendancePresent: 55 },
  { id: "demo-6", name: "Efua Appiah", gender: "Female", classRange: [0.8, 1], examRange: [0.76, 1], attendancePresent: 67 },
  { id: "demo-7", name: "Kwabena Darko", gender: "Male", classRange: [0.6, 0.8], examRange: [0.64, 0.84], attendancePresent: 69 },
  { id: "demo-8", name: "Akosua Frimpong", gender: "Female", classRange: [0.9, 1], examRange: [0.86, 1], attendancePresent: 70 },
  { id: "demo-9", name: "Kwesi Osei", gender: "Male", classRange: [0.64, 0.94], examRange: [0.7, 1], attendancePresent: 63 },
  { id: "demo-10", name: "Adwoa Agyeman", gender: "Female", classRange: [0.76, 0.96], examRange: [0.78, 0.98], attendancePresent: 66 },
];

/**
 * Generates sample `demo-`-prefixed student records shaped to the active grading weights,
 * subjects, class name, and optional SBA component breakdown in `settings`.
 */
export function createDemoStudents(settings: SchoolSettings): StudentRecord[] {
  const className = settings.className || "Primary 5A";
  const classMax = settings.classScoreMax;
  const examMax = settings.examScoreMax;
  const subjectsList = settings.defaultSubjects || [];

  return DEMO_ROSTER.map((entry) => ({
    id: entry.id,
    name: entry.name,
    className,
    gender: entry.gender,
    subjects: subjectsList.map((subName) =>
      createDemoSubject(
        subName,
        settings,
        [
          Math.floor(classMax * entry.classRange[0]),
          entry.classRange[1] === 1 ? classMax : Math.floor(classMax * entry.classRange[1]),
        ],
        [
          Math.floor(examMax * entry.examRange[0]),
          entry.examRange[1] === 1 ? examMax : Math.floor(examMax * entry.examRange[1]),
        ],
      ),
    ),
    attendancePresent: entry.attendancePresent,
  }));
}
