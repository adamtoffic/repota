// src/components/DashboardToolbar.tsx
import { Search, Download, MoreVertical, Trash2, Upload } from "lucide-react";
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

// ... imports

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
            className="flex h-9 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 sm:text-sm"
          >
            Actions <MoreVertical size={14} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute top-full right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                <button
                  onClick={() => {
                    onImport();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Upload size={16} className="text-green-600" /> Import Names
                </button>
                <button
                  onClick={() => {
                    onExport();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download size={16} className="text-blue-600" /> Export CSV
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
    </div>
  );
}

// ... FilterButton remains the same

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
