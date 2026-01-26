import { AlertCircle, Image, FileText } from "lucide-react";
import type { StudentRecord, SchoolSettings } from "../types";

interface ValidationWarningsProps {
  students: StudentRecord[];
  settings: SchoolSettings;
}

export function ValidationWarnings({ students, settings }: ValidationWarningsProps) {
  // Calculate validation issues
  const studentsWithNoScores = students.filter((student) => {
    const hasAnyScore = student.subjects.some(
      (subject) => subject.classScore > 0 || subject.examScore > 0,
    );
    return !hasAnyScore;
  });

  const studentsWithMissingPhotos = students.filter((student) => !student.pictureUrl);

  const studentsWithIncompleteScores = students.filter((student) => {
    // Check if student has some subjects missing scores
    const totalSubjects = settings.defaultSubjects?.length || 0;
    const subjectsWithScores = student.subjects.filter(
      (subject) => subject.classScore > 0 || subject.examScore > 0,
    ).length;
    return subjectsWithScores > 0 && subjectsWithScores < totalSubjects;
  });

  const warnings = [];

  if (studentsWithNoScores.length > 0) {
    warnings.push({
      icon: FileText,
      color: "red",
      message: `${studentsWithNoScores.length} student${studentsWithNoScores.length === 1 ? "" : "s"} ${studentsWithNoScores.length === 1 ? "has" : "have"} no scores entered`,
      severity: "high" as const,
    });
  }

  if (studentsWithMissingPhotos.length > 0) {
    warnings.push({
      icon: Image,
      color: "yellow",
      message: `${studentsWithMissingPhotos.length} student${studentsWithMissingPhotos.length === 1 ? "" : "s"} missing photo${studentsWithMissingPhotos.length === 1 ? "" : "s"}`,
      severity: "medium" as const,
    });
  }

  if (studentsWithIncompleteScores.length > 0) {
    warnings.push({
      icon: AlertCircle,
      color: "orange",
      message: `${studentsWithIncompleteScores.length} student${studentsWithIncompleteScores.length === 1 ? "" : "s"} with incomplete scores`,
      severity: "medium" as const,
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warning, index) => {
        const Icon = warning.icon;
        const bgColor =
          warning.color === "red"
            ? "bg-red-50 border-red-200"
            : warning.color === "yellow"
              ? "bg-yellow-50 border-yellow-200"
              : "bg-orange-50 border-orange-200";

        const textColor =
          warning.color === "red"
            ? "text-red-800"
            : warning.color === "yellow"
              ? "text-yellow-800"
              : "text-orange-800";

        const iconColor =
          warning.color === "red"
            ? "text-red-600"
            : warning.color === "yellow"
              ? "text-yellow-600"
              : "text-orange-600";

        return (
          <div
            key={index}
            className={`flex items-start gap-3 rounded-lg border ${bgColor} p-3.5 shadow-sm`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
            <div className="flex-1">
              <p className={`text-sm font-bold ${textColor}`}>⚠️ {warning.message}</p>
              {warning.severity === "high" && (
                <p className="text-muted mt-0.5 text-xs">
                  Please enter scores before generating report cards.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
