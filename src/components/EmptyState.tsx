import { UserPlus, BookOpen } from "lucide-react";

interface Props {
  onAddStudent: () => void;
  onLoadDemo: () => void;
}

export function EmptyState({ onAddStudent, onLoadDemo }: Props) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm sm:px-8">
      <div className="bg-primary/10 mb-5 flex h-16 w-16 items-center justify-center rounded-full">
        <BookOpen className="text-primary h-8 w-8" />
      </div>

      <h2 className="text-main mb-2 text-xl font-bold tracking-tight">
        Welcome to your new Class Dashboard!
      </h2>

      <p className="text-muted mb-8 max-w-md text-sm leading-relaxed">
        Click below to add your first student and start creating reports.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <button
          onClick={onAddStudent}
          className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-bold text-white shadow-md transition-all active:scale-95"
        >
          <UserPlus className="h-5 w-5" />
          Add Student
        </button>

        <button
          onClick={onLoadDemo}
          className="bg-background text-muted rounded-lg border border-gray-200 px-6 py-3 font-bold transition-all hover:bg-gray-100 active:scale-95"
        >
          Load Demo Data (Test)
        </button>
      </div>
    </div>
  );
}
