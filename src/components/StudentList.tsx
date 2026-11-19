// src/components/StudentList.tsx
import { Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  measureElement as defaultMeasureElement,
  observeElementRect as defaultObserveElementRect,
  useVirtualizer,
  type Rect,
  type Virtualizer,
} from "@tanstack/react-virtual";
import { Edit2, Trash2, Printer, UserPlus, Upload, CameraOff } from "lucide-react";
import type { ProcessedStudent, StudentRecord } from "../types";
import { AddStudentModal } from "./AddStudentModal";
import { ConfirmModal } from "./ConfirmModal";
import { useSchoolSettings } from "../hooks/useSchoolData";
import { triggerHaptic } from "../utils/iosInteraction";
import { getScoredSubjectCounts } from "../utils/studentValidation";
import { Button } from "./ui";

const MOBILE_VIRTUALIZATION_THRESHOLD = 20;

// Headless environments (Happy-DOM) report 0x0 bounding rects; keep mobile virtualization testable while using real viewport bounds on device.
const observeMobileElementRect = (
  instance: Virtualizer<HTMLDivElement, HTMLDivElement>,
  cb: (rect: Rect) => void,
) =>
  defaultObserveElementRect(instance, (rect) => {
    cb(rect.height > 0 ? rect : { width: 390, height: 800 });
  });

interface MobileStudentCardProps {
  student: ProcessedStudent;
  onEditStudent: (student: ProcessedStudent) => void;
  onDeleteRequest: (studentId: string) => void;
  virtualIndex?: number;
  measureRef?: (element: HTMLDivElement | null) => void;
  offsetTop?: number;
}

function MobileStudentCard({
  student,
  onEditStudent,
  onDeleteRequest,
  virtualIndex,
  measureRef,
  offsetTop,
}: MobileStudentCardProps) {
  const virtualStyle =
    offsetTop !== undefined
      ? {
          position: "absolute" as const,
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${offsetTop}px)`,
        }
      : undefined;

  return (
    <div
      data-index={virtualIndex}
      data-testid="mobile-student-card"
      ref={measureRef}
      style={virtualStyle}
      className="space-y-2 border-b border-gray-100 p-3.5"
    >
      <button
        type="button"
        onClick={() => onEditStudent(student)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-main truncate text-base font-bold">{student.name}</p>
          <p className="text-muted mt-0.5 text-xs">
            {student.className}
            {student.gender ? ` • ${student.gender}` : ""}
          </p>
        </div>
        {student.classPosition !== "Pending..." && (
          <span className="inline-flex h-7 shrink-0 items-center justify-center rounded-full border border-yellow-200 bg-yellow-100 px-2.5 text-xs font-bold text-yellow-700">
            {student.classPosition}
          </span>
        )}
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        <ScoreProgressBadge student={student} />
        {!student.pictureUrl && (
          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            <CameraOff className="h-3 w-3" /> No Photo
          </span>
        )}
        <span className="bg-background text-main inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold">
          Avg: {student.averageScore > 0 ? `${student.averageScore}%` : "Pending"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEditStudent(student)}
          className="bg-primary/10 text-primary hover:bg-primary/20 flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5" />
          <span>Edit Scores</span>
        </button>

        {student.subjects.length > 0 && (
          <Link
            to="/print"
            search={{ id: student.id }}
            aria-label={`Print report for ${student.name}`}
            className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 text-xs font-bold text-purple-700 hover:bg-purple-100"
            title="Print Report"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => onDeleteRequest(student.id)}
          aria-label={`Delete ${student.name}`}
          className="flex min-h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-red-600 hover:bg-red-100"
          title="Delete Student"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ScoreProgressBadge({ student }: { student: ProcessedStudent }) {
  const { scored, completed, total } = getScoredSubjectCounts(student);
  const toneClass =
    completed === total && total > 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : scored === 0
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}
    >
      {completed}/{total} Scored
    </span>
  );
}

interface Props {
  students: ProcessedStudent[];
  onAddStudent: (student: StudentRecord) => void;
  onDeleteStudent: (id: string) => void;
  onEditStudent: (student: ProcessedStudent) => void;
  onImport?: () => void;
  isAddModalOpen?: boolean;
  onOpenAddModalChange?: (open: boolean) => void;
}

export function StudentList({
  students,
  onAddStudent,
  onDeleteStudent,
  onEditStudent,
  onImport,
  isAddModalOpen,
  onOpenAddModalChange,
}: Props) {
  // STATE
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const settings = useSchoolSettings();

  const isAddOpen = isAddModalOpen ?? internalAddOpen;
  const setIsAddOpen = onOpenAddModalChange ?? setInternalAddOpen;

  // Virtual scrolling setup (desktop table + mobile card list)
  const parentRef = useRef<HTMLDivElement>(null);
  const mobileParentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Estimated row height in pixels
    overscan: 5, // Render 5 extra rows above/below viewport for smooth scrolling
    initialRect: { width: 960, height: 600 },
  });

  const shouldVirtualizeMobile = students.length > MOBILE_VIRTUALIZATION_THRESHOLD;

  const mobileVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: students.length,
    getScrollElement: () => mobileParentRef.current,
    estimateSize: () => 148, // Estimated mobile card height in pixels
    measureElement: (element, entry, instance) => {
      const measured = defaultMeasureElement(element, entry, instance);
      return measured > 0 ? measured : 148;
    },
    overscan: 4,
    initialRect: { width: 390, height: 800 },
    observeElementRect: observeMobileElementRect,
    enabled: shouldVirtualizeMobile,
  });

  const handleOpenModal = () => {
    setIsAddOpen(true);
  };

  return (
    // Removed 'overflow-hidden' to prevent any CSS clipping issues with modals
    <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="bg-background flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <h2 className="text-lg font-bold text-gray-800" data-record="true">
          Student Records
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {onImport && (
            <Button
              onClick={onImport}
              variant="secondary"
              size="md"
              aria-label="Import student list"
              data-record="true"
            >
              <Upload className="h-4 w-4" /> Import List
            </Button>
          )}
          <Button
            onClick={handleOpenModal}
            variant="primary"
            size="md"
            aria-label="Add new student"
            data-record="true"
          >
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>

      {/* MOBILE CARDS (Virtualized for large classes) */}
      {students.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-gray-400 md:hidden" data-record="true">
          No students found. Click "Add Student" to start.
        </div>
      ) : !shouldVirtualizeMobile ? (
        <div className="md:hidden">
          {students.map((student) => (
            <MobileStudentCard
              key={student.id}
              student={student}
              onEditStudent={onEditStudent}
              onDeleteRequest={setStudentToDelete}
            />
          ))}
        </div>
      ) : (
        <div
          ref={mobileParentRef}
          className="max-h-[68vh] overflow-y-auto overscroll-contain md:hidden"
        >
          <div
            className="relative w-full"
            style={{ height: `${mobileVirtualizer.getTotalSize()}px` }}
          >
            {mobileVirtualizer.getVirtualItems().map((virtualCard) => {
              const student = students[virtualCard.index];
              return (
                <MobileStudentCard
                  key={student.id}
                  student={student}
                  onEditStudent={onEditStudent}
                  onDeleteRequest={setStudentToDelete}
                  virtualIndex={virtualCard.index}
                  measureRef={mobileVirtualizer.measureElement}
                  offsetTop={virtualCard.start}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* DESKTOP TABLE */}
      <div
        ref={parentRef}
        className="hidden w-full overflow-x-auto md:block"
        style={{
          maxHeight: "600px",
          overflow: "auto",
        }}
      >
        <table className="w-full min-w-176 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-gray-100 text-xs font-bold text-gray-600 uppercase shadow-sm">
            <tr>
              <th className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Name
              </th>
              <th className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Class
              </th>
              <th className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Subjects
              </th>
              <th className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Avg. Score
              </th>
              <th className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Position
              </th>
              <th className="px-4 py-3 text-right sm:px-6 sm:py-4" data-record="true">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-400 sm:px-6"
                  data-record="true"
                >
                  No students found. Click "Add Student" to start.
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer for virtual scroll positioning */}
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
                )}

                {/* Only render visible rows */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const student = students[virtualRow.index];
                  return (
                    <tr
                      key={student.id}
                      onClick={() => onEditStudent(student)}
                      className="group cursor-pointer transition-colors hover:bg-blue-50/50"
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                    >
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <p className="text-main font-bold">{student.name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 sm:px-6 sm:py-4">
                        {student.className}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {student.subjects.length} Subjects
                          </span>
                          <ScoreProgressBadge student={student} />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800 sm:px-6 sm:py-4">
                        {student.averageScore > 0 ? `${student.averageScore}%` : "-"}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        {student.classPosition !== "Pending..." && (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-yellow-200 bg-yellow-100 text-xs font-bold text-yellow-700">
                            {student.classPosition}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6 sm:py-4">
                        <div className="flex justify-end gap-1.5 opacity-100 transition-opacity sm:gap-2 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditStudent(student);
                            }}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-100"
                            title="Edit Student"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {student.subjects.length > 0 && (
                            <Link
                              to="/print"
                              search={{ id: student.id }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg p-2 text-purple-600 hover:bg-purple-100"
                              title="Print Report"
                            >
                              <Printer className="h-4 w-4" />
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentToDelete(student.id);
                            }}
                            className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Bottom spacer for virtual scroll */}
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr
                    style={{
                      height: `${
                        rowVirtualizer.getTotalSize() -
                        (rowVirtualizer.getVirtualItems()[
                          rowVirtualizer.getVirtualItems().length - 1
                        ]?.end || 0)
                      }px`,
                    }}
                  />
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!studentToDelete}
        title="Delete Student?"
        message="This action cannot be undone. All grades and remarks for this student will be permanently lost."
        confirmText="Yes, Delete Student"
        isDangerous={true}
        onClose={() => setStudentToDelete(null)}
        onConfirm={() => {
          if (studentToDelete) {
            triggerHaptic("heavy"); // Haptic feedback for destructive action
            onDeleteStudent(studentToDelete);
          }
        }}
      />

      <AddStudentModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddStudent={onAddStudent}
        settings={settings}
      />
    </div>
  );
}
