import { useState, useEffect, useMemo } from "react";
import type { StudentRecord, SavedSubject, SchoolSettings } from "../types";
import { processStudent, assignPositions } from "../utils/gradeCalculator";

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
    return saved
      ? JSON.parse(saved)
      : {
          name: "Anglican Primary",
          academicYear: "2025/2026",
          term: "First Term",
          level: "KG",
          address: "P.O. Box AN 123, Kumasi",
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

  const updatStudentScores = (id: string, newSubjects: SavedSubject[]) => {
    setStudents((prev) =>
      prev.map((student) => (student.id === id ? { ...student, subjects: newSubjects } : student)),
    );
  };
  return {
    settings,
    setSettings,
    students: processedStudents,
    addStudent,
    deleteStudent,
    updatStudentScores,
  };
}
