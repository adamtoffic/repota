import { useState, useEffect, useMemo } from "react";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { processStudent, assignPositions, assignSubjectPositions } from "../utils/gradeCalculator";
import type { StudentRecord, SchoolSettings } from "../types";
import { useToast } from "./useToast";
// We will create this utility in Step 4
import { safeSetItem, safeGetItem, STORAGE_KEYS } from "../utils/storage";

export function useSchoolData() {
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.STUDENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const { showToast } = useToast();

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = safeGetItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration logic (Keep existing)
      if (parsed.name && !parsed.schoolName) {
        return {
          ...parsed,
          schoolName: parsed.name,
          className: parsed.className || "Class Name",
          name: undefined,
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
      numberOnRoll: "",
      logoUrl: "",
      headTeacherSignature: "",
      teacherSignature: "",
    };
  });

  // Persist changes using SAFE storage
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // --- ACTIONS ---

  const addStudent = (student: StudentRecord) => {
    setStudents((prev) => [...prev, student]);
    if (student.name !== "New Student") {
      showToast(`Student "${student.name}" added successfully!`, "success");
    }
  };

  // 🛑 REFACTORED: Removed window.confirm(). Now it just loads data.
  // The UI component will handle the "Are you sure?" modal.
  const loadDemoData = () => {
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
    showToast("Demo data loaded.", "info");
  };

  const deleteStudent = (id: string) => {
    // 1. Find the student before deleting (so we can restore them)
    const studentToDelete = students.find((s) => s.id === id);
    if (!studentToDelete) return;

    // 2. Optimistic Delete (Remove immediately)
    setStudents((prev) => prev.filter((s) => s.id !== id));

    // 3. Show Toast with Undo Action
    showToast("Student moved to trash.", "info", {
      label: "UNDO",
      onClick: () => {
        // Restore logic: Add them back to the list
        setStudents((prev) => [...prev, studentToDelete]);
        showToast("Student restored.", "success");
      },
    });
  };

  // ✅ NEW: Bulk Delete
  const deletePendingStudents = () => {
    // Keep students who have subjects AND scores > 0
    setStudents((prev) => {
      const active = prev.filter(
        (s) =>
          s.subjects.length > 0 &&
          s.subjects.some((sub) => sub.classScore > 0 || sub.examScore > 0),
      );
      const removedCount = prev.length - active.length;

      if (removedCount > 0) {
        showToast(`Cleaned up ${removedCount} incomplete student records.`, "success");
      } else {
        showToast("No pending students found.", "info");
      }

      return active;
    });
  };

  const updateStudent = (updatedStudent: StudentRecord) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
  };

  const updateClassNameForAll = (newClassName: string) => {
    setStudents((prev) =>
      prev.map((student) => ({
        ...student,
        className: newClassName,
      })),
    );
  };

  // ✅ 1. NEW HELPER: Just checks if name exists (doesn't add/block)
  const checkDuplicateName = (name: string): boolean => {
    return students.some((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  };

  // --- PROCESSING ---
  const processedStudents = useMemo(() => {
    const processed = students.map((student) => processStudent(student, settings.level));
    const withSubjectPositions = assignSubjectPositions(processed);
    return assignPositions(withSubjectPositions);
  }, [students, settings.level]);

  return {
    students: processedStudents,
    settings,
    setSettings,
    addStudent,
    deleteStudent,
    updateStudent,
    loadDemoData,
    updateClassNameForAll,
    checkDuplicateName,
    deletePendingStudents,
  };
}
