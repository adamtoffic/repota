import { UserPlus, BookOpen } from "lucide-react";

interface Props {
  onAddStudent: () => void;
  onLoadDemo: () => void;
}

export function EmptyState({ onAddStudent, onLoadDemo }: Props) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-4 py-16 text-center shadow-sm">
      <div className="mb-4 rounded-full bg-blue-50 p-4">
        <BookOpen className="h-8 w-8 text-blue-600" />
      </div>

      <h2 className="text-main mb-2 text-xl font-bold">Welcome to your new Class Dashboard!</h2>

      <p className="text-muted mb-8 max-w-md">
        You haven't added any students yet. Get started by adding your first student manually, or
        load some demo data to see how the reports look.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          onClick={onAddStudent}
          className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-bold text-white shadow-sm transition-all active:scale-95"
        >
          <UserPlus className="h-5 w-5" />
          Add First Student
        </button>

        <button
          onClick={onLoadDemo}
          className="rounded-lg bg-blue-50 px-6 py-3 font-bold text-blue-700 transition-colors hover:bg-blue-100"
        >
          Load Demo Data (Test)
        </button>
      </div>
    </div>
  );
}
