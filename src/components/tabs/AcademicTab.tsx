import { useState } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { SubjectRow } from "../SubjectRow";
import type { ProcessedStudent, SavedSubject, SchoolLevel, StudentRecord } from "../../types";
import { useSchoolData } from "../../hooks/useSchoolData";
import { ConfirmModal } from "../ConfirmModal"; // ✅ Import Modal

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  onUpdate: (updatedRecord: StudentRecord) => void;
}

export function AcademicTab({ student, level, onUpdate }: Props) {
  const { settings } = useSchoolData();
  const masterList = settings.defaultSubjects || [];

  // State for Modal
  const [showCleanModal, setShowCleanModal] = useState(false);

  const missingSubjects = masterList.filter(
    (masterName) => !student.subjects.some((sub) => sub.name === masterName),
  );

  const obsoleteSubjects = student.subjects.filter((sub) => !masterList.includes(sub.name));

  const handleScoreUpdate = (updatedSubject: SavedSubject) => {
    const newSubjects = student.subjects.map((s) =>
      s.id === updatedSubject.id ? updatedSubject : s,
    );
    onUpdate({ ...student, subjects: newSubjects });
  };

  const handleAddMissing = () => {
    const newSubjects = missingSubjects.map((name) => ({
      id: crypto.randomUUID(),
      name,
      classScore: 0,
      examScore: 0,
    }));
    onUpdate({ ...student, subjects: [...student.subjects, ...newSubjects] });
  };

  // 🛑 CHANGED: Instead of confirm(), we just open the modal
  const triggerRemoveObsolete = () => {
    setShowCleanModal(true);
  };

  // ✅ EXECUTED via Modal
  const executeRemoveObsolete = () => {
    const cleanSubjects = student.subjects.filter((sub) => masterList.includes(sub.name));
    onUpdate({ ...student, subjects: cleanSubjects });
    setShowCleanModal(false);
  };

  return (
    <div className="space-y-4">
      {/* ... (Missing Subjects Alert stays the same) ... */}
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

      {/* OBSOLETE SUBJECTS ALERT */}
      {obsoleteSubjects.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-900">Cleanup Old Subjects</p>
              <p className="text-xs text-orange-700">
                Found <strong>{obsoleteSubjects.length}</strong> subjects that are no longer in
                Settings.
              </p>
            </div>
          </div>
          {/* Button triggers Modal */}
          <button
            onClick={triggerRemoveObsolete}
            className="rounded-lg border border-orange-300 bg-white px-4 py-2 text-xs font-bold text-orange-700 shadow-sm hover:bg-orange-100"
          >
            Remove Old
          </button>
        </div>
      )}

      {/* THE LIST */}
      <div className="space-y-3">
        {student.subjects.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-gray-400">
            No subjects found. Use the alerts above to sync with Settings.
          </div>
        ) : (
          student.subjects.map((subject) => {
            const isObsolete = !masterList.includes(subject.name);
            return (
              <div key={subject.id} className={isObsolete ? "opacity-50 grayscale" : ""}>
                <SubjectRow
                  subject={subject}
                  level={level}
                  onChange={handleScoreUpdate}
                  maxClassScore={settings.classScoreMax}
                  maxExamScore={settings.examScoreMax}
                />
                {isObsolete && (
                  <p className="mt-1 text-right text-[10px] font-bold text-red-500">
                    * This subject is not in Settings
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ✅ CONFIRM MODAL */}
      <ConfirmModal
        isOpen={showCleanModal}
        title="Remove Old Subjects?"
        message={`This will permanently remove ${obsoleteSubjects.length} subjects from this student. This action cannot be undone.`}
        confirmText="Yes, Remove"
        isDangerous={true}
        onConfirm={executeRemoveObsolete}
        onClose={() => setShowCleanModal(false)}
      />
    </div>
  );
}
