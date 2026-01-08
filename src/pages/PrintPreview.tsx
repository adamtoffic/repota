// src/pages/PrintPreview.tsx
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";

export function PrintPreview() {
  const { students } = useSchoolData();

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      {/* Print Toolbar - Hidden when actually printing */}
      <div className="mx-auto mb-8 flex max-w-4xl items-center justify-between print:hidden">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-bold text-white shadow-md hover:bg-blue-700"
        >
          <Printer className="h-5 w-5" /> Print Reports
        </button>
      </div>

      {/* The Paper Sheet (Visual Preview) */}
      <div className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-[10mm] shadow-xl print:p-0 print:shadow-none">
        <h1 className="mt-20 text-center text-2xl font-bold text-gray-300">Print Preview Mode</h1>
        <p className="mt-4 text-center text-gray-400">
          Ready to generate reports for {students.length} students.
        </p>
      </div>
    </div>
  );
}
