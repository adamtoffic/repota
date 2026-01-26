import { UserPlus, BookOpen } from "lucide-react";

interface Props {
  onAddStudent: () => void;
  onLoadDemo: () => void;
}

export function EmptyState({ onAddStudent, onLoadDemo }: Props) {
  return (
    <div className="animate-fade-in mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm sm:px-8">
      <div className="bg-primary/10 mb-5 flex h-20 w-20 items-center justify-center rounded-full">
        <BookOpen className="text-primary h-10 w-10" />
      </div>

      <h2 className="text-main mb-2 text-2xl font-bold tracking-tight">
        Welcome to your new Class Dashboard!
      </h2>

      <p className="text-muted mb-8 max-w-md text-sm leading-relaxed">
        You haven't added any students yet. Get started by adding your first student manually, or
        load some demo data to see how the reports look.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <button
          onClick={onAddStudent}
          className="bg-primary flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-bold text-white shadow-md transition-colors active:opacity-80"
          aria-label="Add your first student"
        >
          <UserPlus className="h-5 w-5" />
          Add First Student
        </button>

        <button
          onClick={onLoadDemo}
          className="bg-background text-muted rounded-lg border-2 border-gray-200 px-6 py-3 font-bold transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:opacity-80"
          aria-label="Load demo student data for testing"
        >
          Load Demo Data (Test)
        </button>
      </div>
    </div>
  );
}
