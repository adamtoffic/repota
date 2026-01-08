// src/components/tabs/AcademicTab.tsx
import { AlertCircle } from "lucide-react";
import { SubjectRow } from "../SubjectRow";
import type { ProcessedStudent, SavedSubject, SchoolLevel, StudentRecord } from "../../types";
import { useSchoolData } from "../../hooks/useSchoolData";

interface Props {
  student: ProcessedStudent; // Uses Processed to show calculated grades
  level: SchoolLevel;
  onUpdate: (updatedRecord: StudentRecord) => void;
}

export function AcademicTab({ student, level, onUpdate }: Props) {
  const { settings } = useSchoolData();
  const masterList = settings.defaultSubjects || [];

  // Logic: Find missing subjects
  const missingSubjects = masterList.filter(
    (masterName) => !student.subjects.some((sub) => sub.name === masterName),
  );

  const handleScoreUpdate = (updatedSubject: SavedSubject) => {
    // Map to create new subject list
    const newSubjects = student.subjects.map((s) =>
      s.id === updatedSubject.id ? updatedSubject : s,
    );

    // Send full raw record back
    onUpdate({
      ...student,
      subjects: newSubjects,
      attendancePresent: student.attendancePresent,
      // Pass through other fields safely
      conduct: student.conduct,
      interest: student.interest,
      teacherRemark: student.teacherRemark,
    });
  };

  const handleAddMissing = () => {
    const newSubjects = missingSubjects.map((name) => ({
      id: crypto.randomUUID(),
      name,
      classScore: 0,
      examScore: 0,
    }));

    onUpdate({
      ...student,
      subjects: [...student.subjects, ...newSubjects],
      attendancePresent: student.attendancePresent,
      conduct: student.conduct,
      interest: student.interest,
      teacherRemark: student.teacherRemark,
    });
  };

  return (
    <div className="space-y-4">
      {missingSubjects.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-700">
              Missing <strong>{missingSubjects.length}</strong> subjects.
            </span>
          </div>
          <button
            onClick={handleAddMissing}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            Add Missing
          </button>
        </div>
      )}

      {student.subjects.map((subject) => (
        <SubjectRow
          key={subject.id}
          subject={subject}
          level={level}
          onChange={handleScoreUpdate}
          onDelete={() => {}} // We can implement delete logic here later
        />
      ))}
    </div>
  );
}
