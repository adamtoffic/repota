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

function isTopThreePosition(position: string): boolean {
  return /^[123](st|nd|rd)\b/i.test(position.trim());
}

function getPositionBadgeClass(position: string): string {
  if (isTopThreePosition(position)) {
    return "border-amber-300/90 bg-amber-100/90 text-amber-900 font-bold dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300";
  }
  return "border-border bg-subtle text-secondary font-semibold";
}

interface MobileStudentCardProps {
  student: ProcessedStudent;
  isMockExam: boolean;
  onEditStudent: (student: ProcessedStudent) => void;
  onDeleteRequest: (studentId: string) => void;
  virtualIndex?: number;
  measureRef?: (element: HTMLDivElement | null) => void;
  offsetTop?: number;
}

function MobileStudentCard({
  student,
  isMockExam,
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
      className="border-border-subtle space-y-2 border-b p-3.5"
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
        {student.classPosition.toLowerCase() !== "pending..." && (
          <span
            className={`inline-flex h-7 shrink-0 items-center justify-center rounded-full border px-2.5 text-xs tabular-nums ${getPositionBadgeClass(student.classPosition)}`}
          >
            {student.classPosition}
          </span>
        )}
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        <ScoreProgressBadge student={student} isMockExam={isMockExam} />
        {!student.pictureUrl && (
          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300">
            <CameraOff className="h-3 w-3" /> No Photo
          </span>
        )}
        <span className="bg-subtle text-main inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums">
          Avg: {student.averageScore > 0 ? `${student.averageScore}%` : "Pending"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEditStudent(student)}
          className="bg-primary/10 text-primary-text hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5" />
          <span>Edit Scores</span>
        </button>

        {student.subjects.length > 0 && (
          <Link
            to="/print"
            search={{ id: student.id }}
            aria-label={`Print report for ${student.name}`}
            className="border-border bg-subtle text-secondary hover:bg-subtle/80 hover:text-main flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors"
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
          className="flex min-h-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-red-600 hover:bg-red-100 dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950/80"
          title="Delete Student"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ScoreProgressBadge({
  student,
  isMockExam,
}: {
  student: ProcessedStudent;
  isMockExam: boolean;
}) {
  const { scored, completed, total } = getScoredSubjectCounts(student, isMockExam);
  const toneClass =
    completed === total && total > 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300"
      : scored === 0
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
        : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-300";

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
  const isMockExam = settings.examType === "MOCK";

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
    <div className="border-border bg-surface relative rounded-xl border shadow-sm">
      {/* HEADER */}
      <div className="bg-surface border-border-subtle flex flex-col gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <h2 className="text-main text-lg font-bold tracking-tight" data-record="true">
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

      {/* MOBILE CARDS (Virtualized for large classes; kept up to <lg so 768px-1023px sidebar viewports avoid squeezed 6-col table) */}
      {students.length === 0 ? (
        <div className="text-muted px-4 py-10 text-center text-sm lg:hidden" data-record="true">
          No students found. Click "Add Student" to start.
        </div>
      ) : !shouldVirtualizeMobile ? (
        <div className="lg:hidden">
          {students.map((student) => (
            <MobileStudentCard
              key={student.id}
              student={student}
              isMockExam={isMockExam}
              onEditStudent={onEditStudent}
              onDeleteRequest={setStudentToDelete}
            />
          ))}
        </div>
      ) : (
        <div
          ref={mobileParentRef}
          data-scroll-region="student-list"
          className="max-h-[68vh] overflow-y-auto overscroll-contain lg:hidden"
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
                  isMockExam={isMockExam}
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
        data-scroll-region="student-list"
        className="hidden w-full overflow-x-auto lg:block"
        style={{
          maxHeight: "600px",
          overflow: "auto",
        }}
      >
        <table className="w-full min-w-176 text-left text-sm">
          <thead className="bg-subtle/85 text-secondary border-border sticky top-0 z-10 border-b text-xs font-semibold tracking-wider uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Name
              </th>
              <th scope="col" className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Class
              </th>
              <th scope="col" className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Subjects
              </th>
              <th scope="col" className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Avg. Score
              </th>
              <th scope="col" className="px-4 py-3 sm:px-6 sm:py-4" data-record="true">
                Position
              </th>
              <th scope="col" className="px-4 py-3 text-right sm:px-6 sm:py-4" data-record="true">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-border-subtle divide-y">
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted px-4 py-10 text-center sm:px-6"
                  data-record="true"
                >
                  No students found. Click "Add Student" to start.
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer for virtual scroll positioning */}
                {rowVirtualizer.getVirtualItems().length > 0 &&
                  rowVirtualizer.getVirtualItems()[0].start > 0 && (
                    <tr
                      aria-hidden="true"
                      style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}
                    >
                      <td colSpan={6} className="p-0" />
                    </tr>
                  )}

                {/* Only render visible rows */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const student = students[virtualRow.index];
                  return (
                    <tr
                      key={student.id}
                      onClick={() => onEditStudent(student)}
                      className="group hover:bg-subtle/70 cursor-pointer transition-colors"
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                    >
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditStudent(student);
                          }}
                          className="text-main hover:text-primary-text rounded text-left font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text"
                        >
                          {student.name}
                        </button>
                      </td>
                      <td className="text-secondary px-4 py-3 sm:px-6 sm:py-4">
                        {student.className}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-subtle text-secondary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                            {student.subjects.length} Subjects
                          </span>
                          <ScoreProgressBadge student={student} isMockExam={isMockExam} />
                        </div>
                      </td>
                      <td className="text-main px-4 py-3 font-bold tabular-nums sm:px-6 sm:py-4">
                        {student.averageScore > 0 ? `${student.averageScore}%` : "-"}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        {student.classPosition.toLowerCase() !== "pending..." ? (
                          <span
                            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs tabular-nums ${getPositionBadgeClass(student.classPosition)}`}
                          >
                            {student.classPosition}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6 sm:py-4">
                        <div className="flex justify-end gap-1.5 opacity-100 transition-opacity sm:gap-2 md:opacity-85 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditStudent(student);
                            }}
                            aria-label={`Edit scores for ${student.name}`}
                            className="text-primary-text hover:bg-primary/10 rounded-lg p-2 transition-colors"
                            title="Edit Student"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {student.subjects.length > 0 && (
                            <Link
                              to="/print"
                              search={{ id: student.id }}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Print report for ${student.name}`}
                              className="text-secondary hover:bg-subtle hover:text-main rounded-lg p-2 transition-colors"
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
                            aria-label={`Delete ${student.name}`}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/60 dark:hover:text-red-300"
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
                {rowVirtualizer.getVirtualItems().length > 0 &&
                  rowVirtualizer.getTotalSize() -
                    (rowVirtualizer.getVirtualItems()[
                      rowVirtualizer.getVirtualItems().length - 1
                    ]?.end || 0) >
                    0 && (
                    <tr
                      aria-hidden="true"
                      style={{
                        height: `${
                          rowVirtualizer.getTotalSize() -
                          (rowVirtualizer.getVirtualItems()[
                            rowVirtualizer.getVirtualItems().length - 1
                          ]?.end || 0)
                        }px`,
                      }}
                    >
                      <td colSpan={6} className="p-0" />
                    </tr>
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
