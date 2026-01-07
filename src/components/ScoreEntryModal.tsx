import { useState } from "react";
import { X, Save, AlertCircle, User, BookOpen } from "lucide-react";
import { SubjectRow } from "./SubjectRow";
// ✅ Import StudentRecord (Raw) alongside ProcessedStudent
import type { ProcessedStudent, SavedSubject, SchoolLevel, StudentRecord } from "../types";
import { useSchoolData } from "../hooks/useSchoolData";

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  isOpen: boolean;
  onClose: () => void;
  // ✅ FIX: Change the expected type to StudentRecord (The raw data format)
  onUpdateStudent: (updated: StudentRecord) => void;
}

export function ScoreEntryModal({ student, level, isOpen, onClose, onUpdateStudent }: Props) {
  const { settings } = useSchoolData();
  const [activeTab, setActiveTab] = useState<"ACADEMIC" | "DETAILS">("ACADEMIC");

  // Local state for the Details tab
  const [details, setDetails] = useState({
    name: student.name,
    className: student.className,
    attendancePresent: student.attendance?.present || 0,
    attendanceTotal: student.attendance?.total || 60, // Default 60 days
    conduct: student.conduct || "",
    interest: student.interest || "",
  });

  const masterList = settings.defaultSubjects || [];
  const missingSubjects = masterList.filter(
    (masterName) => !student.subjects.some((sub) => sub.name === masterName),
  );

  if (!isOpen) return null;

  // --- HANDLERS ---

  const handleScoreUpdate = (updatedSubject: SavedSubject) => {
    const newSubjects: SavedSubject[] = student.subjects.map((s) =>
      s.id === updatedSubject.id ? updatedSubject : s,
    );

    // We strip the extra 'processed' fields by casting, or just pass it as is.
    // Since we changed the Prop type to StudentRecord, this is now allowed!
    onUpdateStudent({ ...student, subjects: newSubjects });
  };

  const handleAddMissing = () => {
    const newSubjects = missingSubjects.map((name) => ({
      id: crypto.randomUUID(),
      name,
      classScore: 0,
      examScore: 0,
    }));

    const combinedSubjects: SavedSubject[] = [...student.subjects, ...newSubjects];

    onUpdateStudent({ ...student, subjects: combinedSubjects });
  };

  const handleDetailsSave = () => {
    // Merge the details into the student object
    onUpdateStudent({
      ...student,
      name: details.name,
      className: details.className,
      attendance: { present: details.attendancePresent, total: details.attendanceTotal },
      conduct: details.conduct,
      interest: details.interest,
    });
    // Optional: Visual cue or just close
    alert("Student Details Saved");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{student.name}</h2>
            <p className="text-sm text-gray-500">
              {level} • {student.className}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab("ACADEMIC")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === "ACADEMIC"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <BookOpen className="h-4 w-4" /> Academic Scores
          </button>
          <button
            onClick={() => setActiveTab("DETAILS")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === "DETAILS"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <User className="h-4 w-4" /> Student Details
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          {/* TAB 1: ACADEMICS */}
          {activeTab === "ACADEMIC" && (
            <div className="space-y-4">
              {/* Missing Subjects Alert */}
              {missingSubjects.length > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-blue-700">
                      Missing <strong>{missingSubjects.length}</strong> subjects from settings.
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
                  onDelete={() => {
                    /* Handle delete logic */
                  }}
                />
              ))}
            </div>
          )}

          {/* TAB 2: DETAILS (Attendance & Profile) */}
          {activeTab === "DETAILS" && (
            <div className="mx-auto max-w-lg space-y-6">
              {/* Profile Section */}
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
                  Edit Profile
                </h3>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">Full Name</label>
                  <input
                    type="text"
                    value={details.name}
                    onChange={(e) => setDetails({ ...details, name: e.target.value })}
                    className="w-full rounded border p-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">Class</label>
                  <input
                    type="text"
                    value={details.className}
                    onChange={(e) => setDetails({ ...details, className: e.target.value })}
                    className="w-full rounded border p-2"
                  />
                </div>
              </div>

              {/* Attendance Section */}
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
                  Attendance
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500">
                      Days Present
                    </label>
                    <input
                      type="number"
                      value={details.attendancePresent}
                      onChange={(e) =>
                        setDetails({ ...details, attendancePresent: Number(e.target.value) })
                      }
                      className="w-full rounded border p-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500">Total Days</label>
                    <input
                      type="number"
                      value={details.attendanceTotal}
                      onChange={(e) =>
                        setDetails({ ...details, attendanceTotal: Number(e.target.value) })
                      }
                      className="w-full rounded border p-2"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks Section */}
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
                  Report Card Remarks
                </h3>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">
                    Conduct / Character
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Humble and respectful"
                    value={details.conduct}
                    onChange={(e) => setDetails({ ...details, conduct: e.target.value })}
                    className="w-full rounded border p-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">
                    Interest / Talent
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Football"
                    value={details.interest}
                    onChange={(e) => setDetails({ ...details, interest: e.target.value })}
                    className="w-full rounded border p-2"
                  />
                </div>
              </div>

              <button
                onClick={handleDetailsSave}
                className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-700"
              >
                <Save className="mr-2 inline-block h-4 w-4" /> Save Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
