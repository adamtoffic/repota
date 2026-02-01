import { useState } from "react";
import { AlertCircle, AlertTriangle, Eraser } from "lucide-react";
import { SubjectRow } from "../SubjectRow";
import type { ProcessedStudent, SavedSubject, SchoolLevel, StudentRecord } from "../../types";
import { useSchoolData } from "../../hooks/useSchoolData";
import { ConfirmModal } from "../ConfirmModal";

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  onUpdate: (updatedRecord: StudentRecord) => void;
  filterSubject?: string | null; // Optional: filter to show only one subject
}

export function AcademicTab({ student, level, onUpdate, filterSubject }: Props) {
  const {
    settings,
    clearStudentScores,
    detectComponentMismatches,
    syncSubjectComponentsFromSettings,
  } = useSchoolData();
  const masterList = settings.defaultSubjects || [];

  // State for Modals
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showClearScoresModal, setShowClearScoresModal] = useState(false);

  const missingSubjects = masterList.filter(
    (masterName) => !student.subjects.some((sub) => sub.name === masterName),
  );

  const obsoleteSubjects = student.subjects.filter((sub) => !masterList.includes(sub.name));

  // Detect component mismatches
  const { hasOutdated, hasMissing } = detectComponentMismatches();
  const showComponentSyncAlert = hasOutdated || hasMissing;

  // Filter subjects if filterSubject is set
  const displayedSubjects = filterSubject
    ? student.subjects.filter((sub) => sub.name === filterSubject)
    : student.subjects;

  // Instant save on field blur - no debounce needed
  const handleScoreUpdate = (updatedSubject: SavedSubject) => {
    const newSubjects = student.subjects.map((s) =>
      s.id === updatedSubject.id ? updatedSubject : s,
    );
    onUpdate({ ...student, subjects: newSubjects });
  };

  const handleAddMissing = () => {
    const newSubjects = missingSubjects.map((name) => {
      const subject: SavedSubject = {
        id: crypto.randomUUID(),
        name,
        classScore: 0,
        examScore: 0,
        // Don't auto-add components - let user choose per subject
      };

      return subject;
    });

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

  const handleClearScores = () => {
    clearStudentScores(student.id);
    setShowClearScoresModal(false);
  };

  return (
    <div className="space-y-4">
      {/* ✅ MOBILE-FRIENDLY STICKY HEADER */}
      {student.subjects.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:static sm:-mx-6 sm:mx-0 sm:-mt-6 sm:mt-0 sm:border-0 sm:bg-transparent sm:p-0 sm:px-6 sm:shadow-none">
          <div className="flex items-center justify-between gap-3">
            {/* Subject count & progress indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700">
                  {student.subjects.length} Subject{student.subjects.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Auto-saves on blur</span>
                  <span className="animate-pulse sm:hidden">• Auto-saves</span>
                </span>
              </div>
            </div>

            {/* Clear button - more prominent on mobile */}
            <button
              onClick={() => setShowClearScoresModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-700 transition-all hover:border-orange-300 hover:bg-orange-50 active:scale-95 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <Eraser size={14} className="sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Clear All Scores</span>
              <span className="sm:hidden">Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* Component Sync Alert */}
      {showComponentSyncAlert && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {hasMissing && hasOutdated
                  ? "Components need updating"
                  : hasMissing
                    ? "Missing components from Settings"
                    : "Outdated components detected"}
              </p>
            </div>
          </div>
          <button
            onClick={() => syncSubjectComponentsFromSettings()}
            className="active:scale-95\ rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Sync Now
          </button>
        </div>
      )}

      {/* Missing Subjects Alert */}
      {missingSubjects.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Missing {missingSubjects.length} subject{missingSubjects.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleAddMissing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95"
          >
            Add Missing
          </button>
        </div>
      )}

      {/* OBSOLETE SUBJECTS ALERT */}
      {obsoleteSubjects.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 sm:flex-row sm:items-center sm:justify-between">
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
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 active:scale-95"
          >
            Remove Old
          </button>
        </div>
      )}

      {/* THE LIST */}
      <div className="space-y-4">
        {/* Subject Filter Info */}
        {filterSubject && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-center">
            <p className="text-sm font-semibold text-purple-800">🎯 Focused on: {filterSubject}</p>
            <p className="text-xs text-purple-600">
              Navigate students while staying on this subject. Select "All Subjects" to see
              everything.
            </p>
          </div>
        )}

        {/* Mobile tip - only show when NOT in focus mode and there are subjects */}
        {!filterSubject && displayedSubjects.length > 0 && (
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 sm:hidden">
            <p className="font-medium">
              💡 Tip: Tap "Next" on your keyboard to jump between fields quickly!
            </p>
          </div>
        )}

        {displayedSubjects.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center text-gray-400">
            {filterSubject
              ? `This student doesn't have "${filterSubject}".`
              : "No subjects found. Use the alerts above to sync with Settings."}
          </div>
        ) : (
          displayedSubjects.map((subject) => {
            const isObsolete = !masterList.includes(subject.name);
            return (
              <div key={subject.id} className={isObsolete ? "opacity-60 grayscale" : ""}>
                <SubjectRow
                  subject={subject}
                  level={level}
                  onChange={handleScoreUpdate}
                  maxClassScore={settings.classScoreMax}
                  maxExamScore={settings.examScoreMax}
                  componentLibrary={settings.componentLibrary}
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

      {/* ✅ CLEAR SCORES MODAL */}
      <ConfirmModal
        isOpen={showClearScoresModal}
        title="Clear All Scores?"
        message={`This will reset all class and exam scores to 0 for ${student.name}. This action cannot be undone.`}
        confirmText="Yes, Clear Scores"
        isDangerous={true}
        onConfirm={handleClearScores}
        onClose={() => setShowClearScoresModal(false)}
      />
    </div>
  );
}
