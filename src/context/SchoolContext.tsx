import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { processStudent, assignPositions, assignSubjectPositions } from "../utils/gradeCalculator";
import type { StudentRecord, SchoolSettings } from "../types";
import { useToast } from "../hooks/useToast";
import { safeSetItem, safeGetItem, STORAGE_KEYS } from "../utils/storage";
// ✅ Import definition
import { SchoolContext } from "./SchoolContextDefinition";

export function SchoolProvider({ children }: { children: ReactNode }) {
  // ... (State initialization stays exactly the same) ...
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.STUDENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = safeGetItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      return JSON.parse(saved); // (Simplified for brevity, keep your migration logic if needed)
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
      logoUrl: "",
      headTeacherSignature: "",
      teacherSignature: "",
    };
  });

  const { showToast } = useToast();

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // --- ACTIONS ---

  // 1. ADD
  const addStudent = (student: StudentRecord) => {
    setStudents((prev) => [...prev, student]);
    if (student.name !== "New Student") {
      showToast(`Student "${student.name}" added successfully!`, "success");
    }
  };

  // 2. DELETE (Single)
  const deleteStudent = (id: string) => {
    const studentToDelete = students.find((s) => s.id === id);
    if (!studentToDelete) return;

    setStudents((prev) => prev.filter((s) => s.id !== id));

    showToast("Student moved to trash.", "info", {
      label: "UNDO",
      onClick: () => {
        setStudents((prev) => [...prev, studentToDelete]);
        showToast("Student restored.", "success");
      },
    });
  };

  // 3. 🛑 FIXED: DELETE PENDING (No side effects in setter)
  const deletePendingStudents = () => {
    // A. Calculate what to keep based on CURRENT state
    const active = students.filter(
      (s) =>
        s.subjects.length > 0 && s.subjects.some((sub) => sub.classScore > 0 || sub.examScore > 0),
    );

    const removedCount = students.length - active.length;

    // B. Trigger Side Effect (Toast)
    if (removedCount > 0) {
      showToast(`Cleaned up ${removedCount} incomplete records.`, "success");
      // C. Update State
      setStudents(active);
    } else {
      showToast("No pending students found.", "info");
    }
  };

  // 4. UPDATE
  const updateStudent = (updatedStudent: StudentRecord) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
  };

  // 5. MASS UPDATE
  const updateClassNameForAll = (newClassName: string) => {
    setStudents((prev) => prev.map((s) => ({ ...s, className: newClassName })));
  };

  // 6. DEMO DATA
  const loadDemoData = () => {
    // ... (Your demo data array) ...
    const demoStudents: StudentRecord[] = [
      // ... put your demo data here
    ];

    if (demoStudents.length > 0) {
      // Safety check
      setStudents((prev) => [...prev, ...demoStudents]);
      showToast("Demo data loaded.", "info");
    }
  };

  const checkDuplicateName = (name: string): boolean => {
    return students.some((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  };

  // 7. COMPUTED DATA
  const processedStudents = useMemo(() => {
    const processed = students.map((student) => processStudent(student, settings.level));
    const withSubjectPositions = assignSubjectPositions(processed);
    return assignPositions(withSubjectPositions);
  }, [students, settings.level]);

  return (
    <SchoolContext.Provider
      value={{
        students: processedStudents,
        settings,
        setSettings,
        addStudent,
        deleteStudent,
        deletePendingStudents,
        updateStudent,
        loadDemoData,
        updateClassNameForAll,
        checkDuplicateName,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}
