// src/components/ScoreEntryModal.tsx
import { useState } from "react";
import { X, Save, Calculator, BookOpen, UserCheck, RefreshCw } from "lucide-react";
import type { ProcessedStudent, SavedSubject, SchoolLevel, ReportExtras } from "../types";
import { SUBJECT_PRESETS } from "../constants/subjects";
import { SubjectRow } from "./SubjectRow";
import { generateTeacherRemark, generateConduct } from "../utils/remarkGenerator";

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  onClose: () => void;
  // Updated Prop Type to match the Hook
  onUpdateScores: (id: string, subjects: SavedSubject[], extras?: ReportExtras) => void;
}

export function ScoreEntryModal({ student, level, onClose, onUpdateScores }: Props) {
  // TABS STATE
  const [activeTab, setActiveTab] = useState<"academics" | "remarks">("academics");

  // ACADEMIC STATE
  const [subjects, setSubjects] = useState<SavedSubject[]>(() => {
    if (student.subjects && student.subjects.length > 0) return student.subjects;

    // Default Preset Logic
    const presets = SUBJECT_PRESETS[level] || [];
    return presets.map((name) => ({
      id: crypto.randomUUID(),
      name,
      classScore: 0,
      examScore: 0,
    }));
  });

  // REMARKS STATE
  const [attendancePresent, setAttendancePresent] = useState(student.attendancePresent || 0);
  const [attendanceTotal, setAttendanceTotal] = useState(student.attendanceTotal || 60);
  const [conduct, setConduct] = useState(student.conduct || "");
  const [teacherRemark, setTeacherRemark] = useState(student.teacherRemark || "");

  // ACTIONS
  const handleAutoGenerate = () => {
    const remark = generateTeacherRemark(student, attendancePresent, attendanceTotal, level);
    const conductSuggestion = generateConduct((attendancePresent / attendanceTotal) * 100);
    setTeacherRemark(remark);
    setConduct(conductSuggestion);
  };

  const updateSubject = (index: number, updated: SavedSubject) => {
    const newList = [...subjects];
    newList[index] = updated;
    setSubjects(newList);
  };

  const handleSave = () => {
    onUpdateScores(student.id, subjects, {
      attendancePresent,
      attendanceTotal,
      conduct,
      teacherRemark,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Student Report</h2>
            <p className="text-sm text-gray-500">{student.name}</p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("academics")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium ${activeTab === "academics" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <BookOpen className="h-4 w-4" /> Academics
          </button>
          <button
            onClick={() => setActiveTab("remarks")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium ${activeTab === "remarks" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <UserCheck className="h-4 w-4" /> Remarks & Attendance
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          {/* TAB 1: ACADEMICS */}
          {activeTab === "academics" && (
            <div className="space-y-2">
              {subjects.map((sub, index) => (
                <SubjectRow
                  key={sub.id}
                  subject={sub}
                  level={level}
                  onChange={(updated) => updateSubject(index, updated)}
                  onDelete={() => {
                    /* deletion logic here if needed */
                  }}
                />
              ))}
            </div>
          )}

          {/* TAB 2: REMARKS */}
          {activeTab === "remarks" && (
            <div className="mx-auto max-w-2xl space-y-6">
              {/* Attendance */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-700">Attendance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                      Days Present
                    </label>
                    <input
                      type="number"
                      value={attendancePresent}
                      onChange={(e) => setAttendancePresent(Number(e.target.value))}
                      className="w-full rounded border p-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                      Total Days
                    </label>
                    <input
                      type="number"
                      value={attendanceTotal}
                      onChange={(e) => setAttendanceTotal(Number(e.target.value))}
                      className="w-full rounded border p-2"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-gray-700">Conduct & Remarks</h3>
                  <button
                    onClick={handleAutoGenerate}
                    className="flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 hover:bg-purple-200"
                  >
                    <Calculator className="h-3 w-3" /> Auto-Generate
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                      Conduct
                    </label>
                    <input
                      type="text"
                      value={conduct}
                      onChange={(e) => setConduct(e.target.value)}
                      className="w-full rounded border p-2"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Teacher's Remark
                      </label>
                      {teacherRemark && (
                        <button
                          onClick={handleAutoGenerate}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <RefreshCw className="h-3 w-3" /> Shuffle
                        </button>
                      )}
                    </div>
                    <textarea
                      value={teacherRemark}
                      onChange={(e) => setTeacherRemark(e.target.value)}
                      className="h-24 w-full rounded border p-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 rounded-b-xl border-t border-gray-100 bg-white p-6">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700"
          >
            <Save className="h-4 w-4" /> Save Report
          </button>
        </div>
      </div>
    </div>
  );
}
