import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { processStudent, assignPositions, assignSubjectPositions } from "../utils/gradeCalculator";
import type { StudentRecord } from "../types";
import { useToast } from "../hooks/useToast";
import { safeSetItem, safeGetItem, STORAGE_KEYS } from "../utils/storage";
// ✅ Import definition
import { SchoolContext } from "./SchoolContextDefinition";
import {
  generateHeadmasterRemark,
  generateTeacherRemark,
  generateAttendanceRating,
  getRandomConductTrait,
  getRandomInterest,
} from "../utils/remarkGenerator";
import {
  createBackupHeartbeat,
  requestPersistentStorage,
  detectDataLoss,
} from "../utils/dataProtection";
import { studentRecordSchema, schoolSettingsSchema, type SchoolSettings } from "../schemas";
import { z } from "zod";

export function SchoolProvider({ children }: { children: ReactNode }) {
  // 🛡️ VALIDATED STATE INITIALIZATION
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.STUDENTS);
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);

      // Validate array of students
      const studentsArraySchema = z.array(studentRecordSchema);
      const result = studentsArraySchema.safeParse(parsed);

      if (result.success) {
        return result.data;
      } else {
        console.error("❌ Invalid student data in localStorage:", result.error);
        return []; // Return empty array if data is corrupted
      }
    } catch (error) {
      console.error("❌ Failed to parse student data:", error);
      return [];
    }
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = safeGetItem(STORAGE_KEYS.SETTINGS);

    // Default settings
    const defaultSettings: SchoolSettings = {
      schoolName: "My School Name",
      academicYear: "2025/2026",
      term: "First Term",
      level: "PRIMARY",
      defaultSubjects: DEFAULT_SUBJECTS["PRIMARY"],
      classScoreMax: 40,
      examScoreMax: 60,
      schoolType: "STANDARD",
    };

    if (!saved) return defaultSettings;

    try {
      const parsed = JSON.parse(saved);
      const result = schoolSettingsSchema.safeParse(parsed);

      if (result.success) {
        return result.data;
      } else {
        console.error("❌ Invalid settings data in localStorage:", result.error);
        return defaultSettings; // Return defaults if data is corrupted
      }
    } catch (error) {
      console.error("❌ Failed to parse settings data:", error);
      return defaultSettings;
    }
  });

  const { showToast } = useToast();

  // ✅ NEW: RESTORE DEFAULTS (Factory Reset for Settings only)
  const restoreDefaults = () => {
    const defaultSettings: SchoolSettings = {
      schoolName: "My School Name",
      academicYear: "2025/2026",
      term: "First Term",
      level: "PRIMARY",
      defaultSubjects: DEFAULT_SUBJECTS["PRIMARY"],
      classScoreMax: 40,
      examScoreMax: 60,
      schoolType: "STANDARD",
    };

    setSettings(defaultSettings);
    showToast("Settings restored to factory defaults.", "success");
  };

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    createBackupHeartbeat(); // Update heartbeat when data changes
  }, [students]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    createBackupHeartbeat(); // Update heartbeat when settings change
  }, [settings]);

  // Request persistent storage on mount (Android protection)
  useEffect(() => {
    requestPersistentStorage();

    // Check for data loss (cleared by cleaner apps)
    if (detectDataLoss()) {
      showToast("⚠️ Data may have been cleared. Please restore from backup if needed.", "error");
    }
  }, [showToast]);

  // --- ACTIONS ---

  // 1. ADD (With Validation)
  const addStudent = (student: StudentRecord, silent = false) => {
    // 🛡️ VALIDATE BEFORE ADDING
    const result = studentRecordSchema.safeParse(student);

    if (!result.success) {
      console.error("❌ Invalid student data:", result.error);
      showToast("Failed to add student: Invalid data", "error");
      return;
    }

    setStudents((prev) => [...prev, result.data]);
    if (!silent && result.data.name !== "New Student") {
      showToast(`Student "${result.data.name}" added successfully!`, "success");
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

  // 4. UPDATE (With Validation)
  const updateStudent = (updatedStudent: StudentRecord, silent = false) => {
    // 🛡️ VALIDATE BEFORE UPDATING
    const result = studentRecordSchema.safeParse(updatedStudent);

    if (!result.success) {
      console.error("❌ Invalid student data:", result.error);
      showToast("Failed to update student: Invalid data", "error");
      return;
    }

    setStudents((prev) => prev.map((s) => (s.id === result.data.id ? result.data : s)));
    if (!silent) {
      showToast(`Changes saved successfully!`, "success");
    }
  };

  // 4B. CLEAR ALL SCORES (keeps students, zeros their scores)
  const clearAllScores = () => {
    setStudents((prev) =>
      prev.map((student) => ({
        ...student,
        subjects: student.subjects.map((sub) => ({
          ...sub,
          classScore: 0,
          examScore: 0,
        })),
      })),
    );
    showToast(`All scores cleared for ${students.length} students!`, "success");
  };

  // 4C. CLEAR SINGLE STUDENT SCORES
  const clearStudentScores = (id: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id
          ? {
              ...student,
              subjects: student.subjects.map((sub) => ({
                ...sub,
                classScore: 0,
                examScore: 0,
              })),
            }
          : student,
      ),
    );
  };

  // 5. MASS UPDATE
  const updateClassNameForAll = (newClassName: string) => {
    setStudents((prev) => prev.map((s) => ({ ...s, className: newClassName })));
  };

  // 6. DEMO DATA
  const loadDemoData = () => {
    const demoStudents: StudentRecord[] = [
      {
        id: "demo-1",
        name: "Kwame Mensah",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 11) + 35, // 35-45 (max 50)
          examScore: Math.floor(Math.random() * 11) + 35, // 35-45 (max 50)
        })),
        attendancePresent: 65,
      },
      {
        id: "demo-2",
        name: "Ama Asante",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 11) + 38, // 38-48 (max 50)
          examScore: Math.floor(Math.random() * 11) + 40, // 40-50 (max 50)
        })),
        attendancePresent: 68,
      },
      {
        id: "demo-3",
        name: "Kofi Owusu",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 10) + 28,
          examScore: Math.floor(Math.random() * 10) + 30,
        })),
        attendancePresent: 60,
      },
      {
        id: "demo-4",
        name: "Abena Boateng",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 11) + 40, // 40-50 (max 50)
          examScore: Math.floor(Math.random() * 9) + 42, // 42-50 (max 50)
        })),
        attendancePresent: 70,
      },
      {
        id: "demo-5",
        name: "Yaw Adomako",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 12) + 25,
          examScore: Math.floor(Math.random() * 12) + 28,
        })),
        attendancePresent: 55,
      },
      {
        id: "demo-6",
        name: "Efua Appiah",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 11) + 40, // 40-50 (max 50)
          examScore: Math.floor(Math.random() * 13) + 38, // 38-50 (max 50)
        })),
        attendancePresent: 67,
      },
      {
        id: "demo-7",
        name: "Kwabena Darko",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 9) + 42, // 42-50 (max 50)
          examScore: Math.floor(Math.random() * 11) + 40, // 40-50 (max 50)
        })),
        attendancePresent: 69,
      },
      {
        id: "demo-8",
        name: "Akosua Frimpong",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 6) + 45, // 45-50 (max 50)
          examScore: Math.floor(Math.random() * 8) + 43, // 43-50 (max 50)
        })),
        attendancePresent: 70,
      },
      {
        id: "demo-9",
        name: "Kwesi Osei",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 15) + 32,
          examScore: Math.floor(Math.random() * 15) + 35,
        })),
        attendancePresent: 63,
      },
      {
        id: "demo-10",
        name: "Adwoa Agyeman",
        className: settings.className || "Primary 5A",
        subjects: settings.defaultSubjects.map((subName) => ({
          id: crypto.randomUUID(),
          name: subName,
          classScore: Math.floor(Math.random() * 4) + 47, // 47-50 (max 50)
          examScore: Math.floor(Math.random() * 5) + 46, // 46-50 (max 50)
        })),
        attendancePresent: 70,
      },
    ];

    if (demoStudents.length > 0) {
      setStudents((prev) => [...prev, ...demoStudents]);
      showToast(`${demoStudents.length} demo students loaded with Ghanaian names!`, "success");
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

  // 8. AUTO-GENERATE REMARKS (Smart Batching)
  const autoGenerateRemarks = () => {
    // A. Temporary memory for this operation only
    // This ensures we know what was used by Student 1 when we get to Student 2
    const usedHeadmasterRemarks: string[] = [];
    const usedTeacherRemarks: string[] = [];

    // B. Loop through all students
    const updatedStudents = students.map((student) => {
      // Need processed stats (average, etc.) for accurate remarks
      const processed = processStudent(student, settings.level);

      // 1. Generate Unique Headmaster Remark
      const hRemark = generateHeadmasterRemark(
        processed.averageScore,
        settings.term,
        usedHeadmasterRemarks, // "Don't use these!"
      );
      usedHeadmasterRemarks.push(hRemark); // Add to used pile

      // 2. Generate Unique Teacher Remark
      const tRemark = generateTeacherRemark(
        processed,
        student.attendancePresent ?? 0,
        settings.totalAttendanceDays ?? 0,
        settings.level,
        usedTeacherRemarks, // "Don't use these!"
      );
      usedTeacherRemarks.push(tRemark); // Add to used pile

      // 3. Generate Attendance Rating (Standard logic)
      const attendancePercent =
        (settings.totalAttendanceDays ?? 0 > 0)
          ? ((student.attendancePresent ?? 0) / (settings.totalAttendanceDays ?? 0)) * 100
          : 100;
      const attRating = generateAttendanceRating(attendancePercent);

      // 4. Fill Conduct/Interest ONLY if empty (Optional - remove checks to overwrite all)
      const conduct = student.conduct || getRandomConductTrait();
      const interest = student.interest || getRandomInterest();

      return {
        ...student,
        headMasterRemark: hRemark,
        teacherRemark: tRemark,
        attendanceRemark: attRating,
        conduct: conduct,
        interest: interest,
      };
    });

    // C. Save everyone at once
    setStudents(updatedStudents);
    showToast("Remarks auto-generated and distributed uniquely!", "success");
  };

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
        clearAllScores,
        clearStudentScores,
        loadDemoData,
        updateClassNameForAll,
        checkDuplicateName,
        restoreDefaults,
        autoGenerateRemarks,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}
