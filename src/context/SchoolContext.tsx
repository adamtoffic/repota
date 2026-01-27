import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { processStudent, assignPositions, assignSubjectPositions } from "../utils/gradeCalculator";
import type { StudentRecord, SchoolSettings, SavedSubject } from "../types";
import { useToast } from "../hooks/useToast";
import { safeSetItem, safeGetItem, STORAGE_KEYS } from "../utils/storage";
import { useDebounce } from "../hooks/useDebounce";
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
      classScoreMax: 50,
      examScoreMax: 50,
      classSize: 30,
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
      schoolType: "STANDARD",
    };
  });

  const { showToast } = useToast();

  // ✅ PERFORMANCE: Debounce storage writes to prevent UI blocking
  const debouncedStudents = useDebounce(students, 500);
  const debouncedSettings = useDebounce(settings, 500);

  // ✅ AUTO-SAVE STATE TRACKING
  const [lastSaved, setLastSaved] = useState<Date>();

  // Track if we're in the debounce period (data changed but not yet saved)
  const isSaving = students !== debouncedStudents || settings !== debouncedSettings;
  const restoreDefaults = () => {
    const defaultSettings: SchoolSettings = {
      schoolName: "My School Name",
      academicYear: "2025/2026",
      term: "First Term",
      level: "PRIMARY",
      defaultSubjects: DEFAULT_SUBJECTS["PRIMARY"],
      totalAttendanceDays: 70,
      classScoreMax: 50,
      examScoreMax: 50,
      classSize: 30,
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
      schoolType: "STANDARD",
    };

    setSettings(defaultSettings);
    showToast("Settings restored to factory defaults.", "success");
  };

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(debouncedStudents));
    createBackupHeartbeat(); // Update heartbeat when data changes
    // Use queueMicrotask to defer state update and avoid cascading render warning
    queueMicrotask(() => setLastSaved(new Date()));
  }, [debouncedStudents]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(debouncedSettings));
    createBackupHeartbeat(); // Update heartbeat when settings change
    // Use queueMicrotask to defer state update and avoid cascading render warning
    queueMicrotask(() => setLastSaved(new Date()));
  }, [debouncedSettings]);

  // Request persistent storage on mount (Android protection)
  useEffect(() => {
    requestPersistentStorage();

    // Check for data loss (cleared by cleaner apps)
    if (detectDataLoss()) {
      showToast("⚠️ Data may have been cleared. Please restore from backup if needed.", "error");
    }
  }, [showToast]);

  // --- ACTIONS ---

  // 1. ADD
  const addStudent = (student: StudentRecord, silent = false) => {
    setStudents((prev) => [...prev, student]);
    if (!silent && student.name !== "New Student") {
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
  const updateStudent = (updatedStudent: StudentRecord, silent = false) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
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
          classScoreComponents: sub.classScoreComponents
            ? sub.classScoreComponents.map((comp) => ({
                ...comp,
                score: 0,
              }))
            : undefined,
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
                classScoreComponents: sub.classScoreComponents
                  ? sub.classScoreComponents.map((comp) => ({
                      ...comp,
                      score: 0,
                    }))
                  : undefined,
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
    const hasComponents =
      settings.subjectComponentMap && Object.keys(settings.subjectComponentMap).length > 0;

    // Helper function to create subject with components from settings map
    const createDemoSubject = (
      subName: string,
      classScoreRange: [number, number],
      examScoreRange: [number, number],
    ): SavedSubject => {
      const subject: SavedSubject = {
        id: crypto.randomUUID(),
        name: subName,
        classScore: 0,
        examScore:
          Math.floor(Math.random() * (examScoreRange[1] - examScoreRange[0] + 1)) +
          examScoreRange[0],
      };

      // Check if this subject has components assigned in settings
      const subjectComponents = settings.subjectComponentMap?.[subName];
      if (hasComponents && subjectComponents && subjectComponents.length > 0) {
        // Create realistic component scores that sum to approximate the target class score
        const targetClassScore =
          Math.floor(Math.random() * (classScoreRange[1] - classScoreRange[0] + 1)) +
          classScoreRange[0];
        const targetPercentage = targetClassScore / settings.classScoreMax;
        const totalMaxScore = subjectComponents.reduce((sum, c) => sum + c.maxScore, 0);
        const targetTotalScore = targetPercentage * totalMaxScore;

        // Distribute the target score across components with some variance
        subject.classScoreComponents = subjectComponents.map((config) => {
          const proportion = config.maxScore / totalMaxScore;
          const baseScore = targetTotalScore * proportion;
          // Add small variance ±15%
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
          };
        });

        // Calculate actual class score from components
        const totalActualScore = subject.classScoreComponents!.reduce((sum, c) => sum + c.score, 0);
        subject.classScore = Math.round(
          (totalActualScore / totalMaxScore) * settings.classScoreMax,
        );
      } else {
        // No components - use direct class score
        subject.classScore =
          Math.floor(Math.random() * (classScoreRange[1] - classScoreRange[0] + 1)) +
          classScoreRange[0];
      }

      return subject;
    };

    // Calculate score ranges based on actual max scores
    const classMax = settings.classScoreMax;
    const examMax = settings.examScoreMax;

    const demoStudents: StudentRecord[] = [
      {
        id: "demo-1",
        name: "Kwame Mensah",
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.7), Math.floor(classMax * 0.9)],
            [Math.floor(examMax * 0.7), Math.floor(examMax * 0.9)],
          ),
        ),
        attendancePresent: 65,
      },
      {
        id: "demo-2",
        name: "Ama Asante",
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.76), Math.floor(classMax * 0.96)],
            [Math.floor(examMax * 0.8), examMax],
          ),
        ),
        attendancePresent: 68,
      },
      {
        id: "demo-3",
        name: "Kofi Owusu",
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.56), Math.floor(classMax * 0.76)],
            [Math.floor(examMax * 0.6), Math.floor(examMax * 0.8)],
          ),
        ),
        attendancePresent: 60,
      },
      {
        id: "demo-4",
        name: "Abena Boateng",
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.8), classMax],
            [Math.floor(examMax * 0.84), examMax],
          ),
        ),
        attendancePresent: 70,
      },
      {
        id: "demo-5",
        name: "Yaw Adomako",
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.5), Math.floor(classMax * 0.74)],
            [Math.floor(examMax * 0.56), Math.floor(examMax * 0.8)],
          ),
        ),
        attendancePresent: 55,
      },
      {
        id: "demo-6",
        name: "Efua Appiah",
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.8), classMax],
            [Math.floor(examMax * 0.76), examMax],
          ),
        ),
        attendancePresent: 67,
      },
      {
        id: "demo-7",
        name: "Kwabena Darko",
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.6), Math.floor(classMax * 0.8)],
            [Math.floor(examMax * 0.64), Math.floor(examMax * 0.84)],
          ),
        ),
        attendancePresent: 69,
      },
      {
        id: "demo-8",
        name: "Akosua Frimpong",
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.9), classMax],
            [Math.floor(examMax * 0.86), examMax],
          ),
        ),
        attendancePresent: 70,
      },
      {
        id: "demo-9",
        name: "Kwesi Osei",
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.64), Math.floor(classMax * 0.94)],
            [Math.floor(examMax * 0.7), examMax],
          ),
        ),
        attendancePresent: 63,
      },
      {
        id: "demo-10",
        name: "Adwoa Agyeman",
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.76), Math.floor(classMax * 0.96)],
            [Math.floor(examMax * 0.78), Math.floor(examMax * 0.98)],
          ),
        ),
        attendancePresent: 66,
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

  // 8. AUTO-GENERATE REMARKS (Smart Batching with Progress)
  const autoGenerateRemarks = (onProgress?: (current: number, total: number) => void) => {
    // A. Temporary memory for this operation only
    // This ensures we know what was used by Student 1 when we get to Student 2
    const usedHeadmasterRemarks: string[] = [];
    const usedTeacherRemarks: string[] = [];

    const total = students.length;

    // B. Loop through all students with progress tracking
    const updatedStudents = students.map((student, index) => {
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

      // Report progress
      if (onProgress) {
        queueMicrotask(() => onProgress(index + 1, total));
      }

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
        isSaving,
        lastSaved,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}
