import { useState, useMemo } from "react";
import { useSchoolData } from "../hooks/useSchoolData";
import { Book, Save, X, Filter, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import type { SavedSubject, ClassScoreComponent } from "../types";

export default function SubjectEntry() {
  const { students, updateStudent } = useSchoolData();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [scores, setScores] = useState<
    Record<string, { classScore?: number; exam?: number; componentScores?: Record<string, number> }>
  >({});

  // Get all unique subjects from first student (they all have same subjects)
  const allSubjects = useMemo(() => {
    if (!students || students.length === 0 || !students[0].subjects) return [];
    // Get unique subject names
    const subjectNames = Array.from(new Set(students[0].subjects.map((s) => s.name)));
    return subjectNames.map((name) => {
      // Find what components this subject has (from first student who has it)
      const subjectWithComponents = students.find((st) =>
        st.subjects.some((sub) => sub.name === name && sub.classScoreComponents?.length),
      );
      const components =
        subjectWithComponents?.subjects.find((s) => s.name === name)?.classScoreComponents || [];
      return {
        name,
        classScoreComponents: components,
      };
    });
  }, [students]);

  // Get all unique classes
  const allClasses = useMemo(() => {
    if (!students || students.length === 0) return [];
    const classes = new Set(students.map((s) => s.className));
    return Array.from(classes).sort();
  }, [students]);

  // Filter students based on selected class
  const filteredStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    if (selectedClass === "all") return students;
    return students.filter((s) => s.className === selectedClass);
  }, [students, selectedClass]);

  // Get the selected subject data
  const currentSubject = useMemo(() => {
    return allSubjects.find((s) => s.name === selectedSubject);
  }, [allSubjects, selectedSubject]);

  const handleScoreChange = (
    studentId: string,
    field: "classScore" | "exam" | string,
    value: string,
  ) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        ...(field === "classScore"
          ? { classScore: value ? parseFloat(value) : undefined }
          : field === "exam"
            ? { exam: value ? parseFloat(value) : undefined }
            : {
                componentScores: {
                  ...(prev[studentId]?.componentScores || {}),
                  [field]: value ? parseFloat(value) : 0,
                },
              }),
      },
    }));
  };

  const handleSaveAll = () => {
    if (!selectedSubject) {
      toast.error("Please select a subject first");
      return;
    }

    let savedCount = 0;
    Object.entries(scores).forEach(([studentId, scoreData]) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      // Update existing subject
      const updatedSubjects: SavedSubject[] = student.subjects.map((subject) => {
        if (subject.name !== selectedSubject) return subject;

        // Update component scores if they exist
        let updatedComponents = subject.classScoreComponents;
        if (scoreData.componentScores && updatedComponents) {
          updatedComponents = updatedComponents.map((comp) => ({
            ...comp,
            score: scoreData.componentScores![comp.name] ?? comp.score,
          }));
        }

        return {
          ...subject,
          ...(scoreData.classScore !== undefined && { classScore: scoreData.classScore }),
          ...(scoreData.exam !== undefined && { examScore: scoreData.exam }),
          ...(updatedComponents && { classScoreComponents: updatedComponents }),
        };
      });

      updateStudent({
        ...student,
        subjects: updatedSubjects,
      });
      savedCount++;
    });

    if (savedCount > 0) {
      toast.success(`Saved scores for ${savedCount} student${savedCount > 1 ? "s" : ""}`);
      setScores({});
    }
  };

  const handleClear = () => {
    setScores({});
    toast.info("Cleared all unsaved scores");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Book className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Subject Entry</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                disabled={Object.keys(scores).length === 0}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={16} />
                <span className="hidden sm:inline">Clear</span>
              </button>
              <button
                onClick={handleSaveAll}
                disabled={Object.keys(scores).length === 0}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save size={16} />
                Save All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setScores({});
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              >
                <option value="">Select a subject</option>
                {allSubjects.map((subject) => (
                  <option key={subject.name} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              >
                <option value="all">All Classes</option>
                {allClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Student List */}
      {selectedSubject ? (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-sm text-gray-600">
                Entering scores for{" "}
                <span className="font-semibold text-gray-900">{selectedSubject}</span>
                {selectedClass !== "all" && (
                  <>
                    {" "}
                    in <span className="font-semibold text-gray-900">{selectedClass}</span>
                  </>
                )}
                {" • "}
                {filteredStudents.length} student{filteredStudents.length !== 1 && "s"}
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredStudents.map((student, index) => {
                const studentSubject = student.subjects.find((s) => s.name === selectedSubject);
                const hasComponents =
                  currentSubject?.classScoreComponents &&
                  currentSubject.classScoreComponents.length > 0;

                return (
                  <div key={student.id} className="p-4 transition-colors hover:bg-gray-50">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {index + 1}. {student.name}
                        </h3>
                        <p className="text-sm text-gray-500">{student.className}</p>
                      </div>
                      {studentSubject && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Current Total</p>
                          <p className="text-lg font-bold text-gray-900">
                            {studentSubject.totalScore || 0}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Class Score */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Class Score
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="0"
                          value={scores[student.id]?.classScore ?? ""}
                          onChange={(e) =>
                            handleScoreChange(student.id, "classScore", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        />
                      </div>

                      {/* Exam Score */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Exam Score
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="0"
                          value={scores[student.id]?.exam ?? ""}
                          onChange={(e) => handleScoreChange(student.id, "exam", e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        />
                      </div>

                      {/* Class Score Components */}
                      {hasComponents &&
                        currentSubject.classScoreComponents.map(
                          (component: ClassScoreComponent) => (
                            <div key={component.id}>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                {component.name}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={component.maxScore}
                                step="0.5"
                                placeholder="0"
                                value={scores[student.id]?.componentScores?.[component.name] ?? ""}
                                onChange={(e) =>
                                  handleScoreChange(student.id, component.name, e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                          ),
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <Book className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Select a Subject</h3>
            <p className="mt-2 text-sm text-gray-500">
              Choose a subject from the dropdown above to start entering scores for all students
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
