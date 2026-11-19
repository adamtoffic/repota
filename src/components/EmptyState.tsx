import { UserPlus, BookOpen, Upload } from "lucide-react";

interface Props {
  onAddStudent: () => void;
  onImport?: () => void;
  onLoadDemo: () => void;
}

export function EmptyState({ onAddStudent, onImport, onLoadDemo }: Props) {
  return (
    <div className="animate-fade-in mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white px-5 py-10 text-center shadow-sm sm:mt-4 sm:px-8 sm:py-16">
      <div className="bg-primary/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full sm:mb-5 sm:h-20 sm:w-20">
        <BookOpen className="text-primary h-8 w-8 sm:h-10 sm:w-10" />
      </div>

      <h2 className="text-main mb-2 text-xl font-bold tracking-tight sm:text-2xl" data-record="true">
        Welcome to your new Class Dashboard!
      </h2>

      <p className="text-muted mb-6 max-w-md text-sm leading-relaxed sm:mb-8" data-record="true">
        You haven&apos;t added any students yet. Add your first student manually, import a CSV class
        roster, or load demo data to explore how report cards look.
      </p>

      <div className="flex w-full flex-col flex-wrap justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
        <button
          type="button"
          onClick={onAddStudent}
          className="bg-primary flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-bold text-white shadow-md transition-colors active:opacity-80"
          aria-label="Add your first student"
          data-record="true"
        >
          <UserPlus className="h-5 w-5" />
          Add First Student
        </button>

        {onImport && (
          <button
            type="button"
            onClick={onImport}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-blue-200 bg-blue-50/70 px-6 py-3 font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 active:opacity-80"
            aria-label="Import student roster from CSV"
            data-record="true"
          >
            <Upload className="h-5 w-5" />
            Import Roster (CSV)
          </button>
        )}

        <button
          type="button"
          onClick={onLoadDemo}
          className="bg-background text-muted rounded-lg border-2 border-gray-200 px-6 py-3 font-bold transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:opacity-80"
          aria-label="Load demo student data for testing"
          data-record="true"
        >
          Load Demo Data (Test)
        </button>
      </div>
    </div>
  );
}
