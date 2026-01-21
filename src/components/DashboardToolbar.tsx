// src/components/DashboardToolbar.tsx
import {
  Search,
  Download,
  MoreVertical,
  Trash2,
  Upload,
  Wand2,
  Eraser,
  FileSpreadsheet,
} from "lucide-react"; // ✅ Added new icons
import { useState } from "react";
import type { ReactNode } from "react";

// 1. Define Props for the Main Toolbar
interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: "ALL" | "PENDING" | "FAILING";
  onFilterChange: (filter: "ALL" | "PENDING" | "FAILING") => void;
  onExport: () => void;
  onDeletePending: () => void;
  onImport: () => void;
  onAutoRemarks: () => void;
  onClearScores: () => void; // ✅ NEW
  onExportStudentList: () => void; // ✅ NEW
}

// 2. Define Props for the Helper Button
interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: ReactNode;
  activeColor?: string;
  hoverColor?: string;
}

export function DashboardToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onExport,
  onDeletePending,
  onImport,
  onAutoRemarks,
  onClearScores, // ✅ NEW
  onExportStudentList, // ✅ NEW
}: ToolbarProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* ROW 1: Search Bar (Full Width) */}
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-10 text-sm transition-all outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* ROW 2: Filters (Left) & Actions (Right) */}
      <div className="flex items-center justify-between gap-2">
        {/* Scrollable Filters */}
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto pb-1">
          <FilterButton
            label="All"
            isActive={activeFilter === "ALL"}
            onClick={() => onFilterChange("ALL")}
          />
          <FilterButton
            label="Incomplete"
            isActive={activeFilter === "PENDING"}
            onClick={() => onFilterChange("PENDING")}
            activeColor="bg-orange-500"
          />
          <FilterButton
            label="Failing"
            isActive={activeFilter === "FAILING"}
            onClick={() => onFilterChange("FAILING")}
            activeColor="bg-red-500"
          />
        </div>

        {/* Fixed Actions Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="hover:bg-background flex h-9 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm active:scale-95 sm:text-sm"
          >
            Actions <MoreVertical size={14} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute top-full right-0 z-20 mt-2 w-60 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                {/* ✅ Auto-Generate Remarks */}
                <button
                  onClick={() => {
                    onAutoRemarks();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 bg-purple-50 px-4 py-3 text-sm font-bold text-purple-700 hover:bg-purple-100"
                >
                  <Wand2 size={16} className="text-purple-600" /> Auto-Fill Remarks
                </button>

                <div className="my-1 border-t border-gray-100" />

                {/* ✅ Import/Export Actions */}
                <button
                  onClick={() => {
                    onImport();
                    setShowMenu(false);
                  }}
                  className="hover:bg-background flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700"
                >
                  <Upload size={16} className="text-green-600" /> Import Names
                </button>
                <button
                  onClick={() => {
                    onExport();
                    setShowMenu(false);
                  }}
                  className="hover:bg-background flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700"
                >
                  <Download size={16} className="text-blue-600" /> Export Full Data
                </button>
                <button
                  onClick={() => {
                    onExportStudentList();
                    setShowMenu(false);
                  }}
                  className="hover:bg-background flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700"
                >
                  <FileSpreadsheet size={16} className="text-indigo-600" /> Export Student List
                </button>

                <div className="my-1 border-t border-gray-100" />

                {/* ✅ Destructive Actions */}
                <button
                  onClick={() => {
                    onClearScores();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50"
                >
                  <Eraser size={16} /> Clear All Scores
                </button>
                <button
                  onClick={() => {
                    onDeletePending();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} /> Clean Empty Rows
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 3. The Helper Component
function FilterButton({
  label,
  icon,
  isActive,
  onClick,
  activeColor = "bg-primary",
  hoverColor = "hover:bg-background",
}: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
        isActive
          ? `${activeColor} text-white shadow-md`
          : `border border-gray-200 bg-white text-gray-600 ${hoverColor}`
      }`}
    >
      {icon} {label}
    </button>
  );
}
