import { useState } from "react";
import { Plus, Search, Trash2, Edit, User } from "lucide-react";
import type { ProcessedStudent, StudentRecord } from "../types";

interface Props {
  students: ProcessedStudent[];
  onAddStudent: (student: StudentRecord) => void;
  onDeleteStudent: (id: string) => void;
  onEditStudent: (student: ProcessedStudent) => void;
}

export function StudentList({ students, onAddStudent, onDeleteStudent, onEditStudent }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [newStudent, setNewStudent] = useState({
    name: "",
    className: "",
    dateOfBirth: "",
  });

  const handleChange = (field: keyof typeof newStudent, value: string) => {
    setNewStudent((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSubmit = () => {
    if (!newStudent.name || !newStudent.className) return;

    const StudentRecord: StudentRecord = {
      id: crypto.randomUUID(),
      name: newStudent.name,
      className: newStudent.className,
      dateOfBirth: newStudent.dateOfBirth,
      subjects: [],
    };

    onAddStudent(StudentRecord);

    setNewStudent({ name: "", className: "", dateOfBirth: "" });
    setIsAdding(false);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.className.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      {/* HEADER SECTION */}
      <div className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <User className="text-blue-600" />
          Student List{" "}
          <span className="text-sm font-normal text-gray-400">({students.length})</span>
        </h2>

        <div className="flex w-full gap-2 md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border py-2 pr-4 pl-9 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {isAdding ? "Close" : "Add Student"}
          </button>
        </div>
      </div>

      {/* ADD STUDENT FORM (Collapsible) */}
      {isAdding && (
        <div className="animate-in fade-in slide-in-from-top-4 mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 duration-200">
          <h3 className="mb-3 font-bold text-blue-800">Register New Student</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="text"
              placeholder="Full Name"
              value={newStudent.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="rounded border bg-white p-2"
            />
            <input
              type="text"
              placeholder="Class (e.g. JHS 2)"
              value={newStudent.className}
              onChange={(e) => handleChange("className", e.target.value)}
              className="rounded border bg-white p-2"
            />
            <input
              type="date"
              value={newStudent.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              className="rounded border bg-white p-2"
            />
          </div>
          <button
            onClick={handleAddSubmit}
            className="mt-3 rounded bg-blue-600 px-6 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Student
          </button>
        </div>
      )}

      {/* THE TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-gray-50 text-sm tracking-wider text-gray-600 uppercase">
              <th className="border-b p-3">Position</th>
              <th className="border-b p-3">Name</th>
              <th className="border-b p-3">Class</th>
              <th className="border-b p-3 text-center">Subjects</th>
              <th className="border-b p-3 text-center">Avg. Score</th>
              <th className="border-b p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {searchTerm ? "No students match your search." : "No students added yet."}
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="group transition-colors hover:bg-gray-50">
                  <td className="p-3 font-bold text-blue-600">
                    {/* Position is calculated in utils, so we just display it! */}
                    {student.classPosition || "-"}
                  </td>
                  <td className="p-3 font-medium text-gray-900">{student.name}</td>
                  <td className="p-3 text-gray-500">{student.className}</td>
                  <td className="p-3 text-center">
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
                      {student.subjects.length}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono">
                    {student.averageScore > 0 ? student.averageScore + "%" : "-"}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => onEditStudent(student)}
                        className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                        title="Enter Scores"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteStudent(student.id)}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"
                        title="Delete Student"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
