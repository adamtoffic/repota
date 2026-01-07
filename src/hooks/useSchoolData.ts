// src/hooks/useSchoolData.ts
import { useState, useEffect, useMemo } from "react";
import type { StudentRecord, SavedSubject, SchoolSettings, ReportExtras } from "../types";
import { processStudent, assignPositions } from "../utils/gradeCalculator";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";

const STORAGE_KEYS = {
  STUDENTS: "ges_v1_students",
  SETTINGS: "ges_v1_settings",
};

export function useSchoolData() {
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) return JSON.parse(saved);

    // NEW DEFAULT: Use the imported constant
    return {
      name: "My School Name",
      academicYear: "2025/2026",
      term: "First Term",
      level: "PRIMARY",
      defaultSubjects: DEFAULT_SUBJECTS["PRIMARY"], // <--- Uses the shared constant
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const processedStudents = useMemo(() => {
    const processed = students.map((student) => processStudent(student, settings.level));
    return assignPositions(processed);
  }, [students, settings.level]);

  const addStudent = (student: StudentRecord) => {
    setStudents((prev) => [...prev, student]);
  };

  const deleteStudent = (id: string) => {
    if (confirm("Are you sure you want to delete this student?")) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // ✅ RENAMED THIS TO updateStudentScores (It replaces the old one completely)
  const updateStudentScores = (
    studentId: string,
    newSubjects: SavedSubject[],
    extras?: ReportExtras, // ✅ Correctly typed optional extras
  ) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              subjects: newSubjects,
              ...extras, // Spread the attendance/remarks into the student object
            }
          : s,
      ),
    );
  };

  return {
    settings,
    setSettings,
    students: processedStudents,
    addStudent,
    deleteStudent,
    updateStudentScores, // ✅ No mapping needed, the name matches
  };
}
