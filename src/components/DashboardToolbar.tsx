// src/components/DashboardToolbar.tsx
import { Search, Filter, Download, MoreVertical, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react"; // Needed for the 'icon' type

// 1. Define Props for the Main Toolbar
interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: "ALL" | "PENDING" | "FAILING";
  onFilterChange: (filter: "ALL" | "PENDING" | "FAILING") => void;
  onExport: () => void;
  onDeletePending: () => void;
  onImport: () => void;
}

// 2. Define Props for the Helper Button (The Fix!)
interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: ReactNode; // Optional icon
  activeColor?: string; // Optional class string
  hoverColor?: string; // Optional class string
}

export function DashboardToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onExport,
  onDeletePending,
  onImport,
}: ToolbarProps) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
      {/* Search Input */}
      <div className="relative w-full md:w-96">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-10 transition-all outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filter Buttons */}
      <div className="no-scrollbar flex w-full gap-2 overflow-x-auto pb-2 md:w-auto md:pb-0">
        <FilterButton
          label="All Students"
          isActive={activeFilter === "ALL"}
          onClick={() => onFilterChange("ALL")}
        />
        <FilterButton
          label="Incomplete"
          icon={<Filter className="h-3 w-3" />}
          isActive={activeFilter === "PENDING"}
          onClick={() => onFilterChange("PENDING")}
          activeColor="bg-orange-500"
          hoverColor="hover:bg-orange-50"
        />
        <FilterButton
          label="Needs Attention"
          isActive={activeFilter === "FAILING"}
          onClick={() => onFilterChange("FAILING")}
          activeColor="bg-red-500"
          hoverColor="hover:bg-red-50"
        />
      </div>

      {/* ✅ NEW: ACTIONS DROPDOWN */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          Actions <MoreVertical size={16} />
        </button>

        {showMenu && (
          <>
            {/* Click outside closer */}
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />

            <div className="absolute top-full right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              <button
                onClick={() => {
                  onExport();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download size={16} className="text-blue-600" /> Export CSV
              </button>

              <button
                onClick={() => {
                  onImport();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Upload size={16} className="text-green-600" /> Import Names
              </button>
              <div className="my-1 border-t border-gray-100" />
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
  );
}

// 3. The Helper Component (Now Strictly Typed)
function FilterButton({
  label,
  icon,
  isActive,
  onClick,
  activeColor = "bg-gray-900",
  hoverColor = "hover:bg-gray-50",
}: FilterButtonProps) {
  // <--- Replaced 'any' with 'FilterButtonProps'
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
