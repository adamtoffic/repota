// src/hooks/useSchoolData.ts
import { useState, useEffect, useMemo } from "react";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { processStudent, assignPositions, assignSubjectPositions } from "../utils/gradeCalculator";
import type { StudentRecord, SchoolSettings } from "../types";
import { useToast } from "./useToast";

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
    if (saved) {
      const parsed = JSON.parse(saved);

      // 🔄 MIGRATION LOGIC:
      // If the saved data has 'name' but not 'schoolName', fix it.
      if (parsed.name && !parsed.schoolName) {
        return {
          ...parsed,
          schoolName: parsed.name, // Transfer old value
          className: parsed.className || "Class Name", // Default if missing
          name: undefined, // Remove old key
        };
      }
      return parsed;
    }
    return {
      schoolName: "My School Name",
      academicYear: "2025/2026",
      term: "First Term",
      level: "PRIMARY",
      defaultSubjects: DEFAULT_SUBJECTS["PRIMARY"],
      totalAttendanceDays: 70,
      classScoreMax: 30,
      examScoreMax: 70,
      nextTermStarts: "",
      headTeacherName: "",
      classTeacherName: "",
      className: "",
      phoneNumber: "",
      address: "",
      email: "",
      schoolMotto: "",
    };
  });

  // Persist changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const { showToast } = useToast();

  // --- ACTIONS ---

  const addStudent = (student: StudentRecord) => {
    setStudents((prev) => [...prev, student]);
    showToast(`Student "${student.name}" added successfully!`, "success");
  };

  const loadDemoData = () => {
    if (confirm("This will add 3 sample students. Continue?")) {
      const demoStudents: StudentRecord[] = [
        {
          id: "demo-1",
          name: "Kwame Nkrumah",
          className: "JHS 2",
          attendancePresent: 58,
          subjects: [
            { id: "s1", name: "Mathematics", classScore: 28, examScore: 65 },
            { id: "s2", name: "English Language", classScore: 25, examScore: 60 },
            { id: "s3", name: "Integrated Science", classScore: 29, examScore: 68 },
          ],
        },
        {
          id: "demo-2",
          name: "Yaa Asantewaa",
          className: "JHS 2",
          attendancePresent: 60,
          subjects: [
            { id: "s1", name: "Mathematics", classScore: 30, examScore: 68 },
            { id: "s2", name: "English Language", classScore: 29, examScore: 66 },
          ],
        },
      ];

      setStudents((prev) => [...prev, ...demoStudents]);
    }
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    showToast("Student deleted successfully.", "info");
  };

  // ✅ THE NEW MASTER UPDATER
  // Replaces 'updateStudentScores'. Accepts the FULL object.
  const updateStudent = (updatedStudent: StudentRecord) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
  };

  // ... existing functions ...

  // ✅ NEW: Mass Update Class Name
  const updateClassNameForAll = (newClassName: string) => {
    setStudents((prev) =>
      prev.map((student) => ({
        ...student,
        className: newClassName, // Force update everyone
      })),
    );
  };

  // --- DERIVED STATE (Processing) ---

  const processedStudents = useMemo(() => {
    const processed = students.map((student) => processStudent(student, settings.level));

    // NEW: Assign Subject Positions first
    const withSubjectPositions = assignSubjectPositions(processed);

    // 2. Assign Class Positions based on the calculated averages
    return assignPositions(withSubjectPositions);
  }, [students, settings.level]);

  return {
    students: processedStudents, // We return the processed version for UI
    settings,
    setSettings,
    addStudent,
    deleteStudent,
    updateStudent, // ✅ Expose the new function
    loadDemoData, // Expose the new function
    updateClassNameForAll, // Expose the new mass update function
  };
}
