// src/hooks/useSchoolData.ts
import { useState, useEffect } from "react";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { calculateGrade } from "../utils/gradeCalculator";
import type { StudentRecord, SchoolSettings, ProcessedStudent } from "../types";

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
    return {
      name: "My School Name",
      academicYear: "2025/2026",
      term: "First Term",
      level: "PRIMARY",
      defaultSubjects: DEFAULT_SUBJECTS["PRIMARY"],
      totalAttendanceDays: 70,
      nextTermStarts: "",
      headTeacherName: "",
      classTeacherName: "",
    };
  });

  // Persist changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // --- ACTIONS ---

  const addStudent = (student: StudentRecord) => {
    setStudents((prev) => [...prev, student]);
  };

  const deleteStudent = (id: string) => {
    if (confirm("Are you sure you want to delete this student?")) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // ✅ THE NEW MASTER UPDATER
  // Replaces 'updateStudentScores'. Accepts the FULL object.
  const updateStudent = (updatedStudent: StudentRecord) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
  };

  // --- DERIVED STATE (Processing) ---

  const processedStudents: ProcessedStudent[] = students.map((student) => {
    // Calculate stats for each subject
    const processedSubjects = student.subjects.map((sub) => {
      const total = (sub.classScore || 0) + (sub.examScore || 0);
      const { grade, remark } = calculateGrade(total, settings.level);
      return { ...sub, totalScore: total, grade, remark };
    });

    // Calculate Average and Totals
    const validSubjects = processedSubjects.filter((s) => s.totalScore > 0);
    const totalScore = validSubjects.reduce((acc, s) => acc + s.totalScore, 0);
    const averageScore =
      validSubjects.length > 0 ? Math.round(totalScore / validSubjects.length) : 0;

    // TODO: Implement "Position" logic later (sorting)

    return {
      ...student,
      subjects: processedSubjects,
      averageScore,
      totalScore,
      aggregate: 0,
      age: 0,
      classPosition: "Pending...", // Placeholder
    };
  });

  return {
    students: processedStudents, // We return the processed version for UI
    settings,
    setSettings,
    addStudent,
    deleteStudent,
    updateStudent, // ✅ Expose the new function
  };
}
