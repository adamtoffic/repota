// src/components/DashboardToolbar.tsx
import { Search, Filter } from "lucide-react";
import type { ReactNode } from "react"; // Needed for the 'icon' type

// 1. Define Props for the Main Toolbar
interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: "ALL" | "PENDING" | "FAILING";
  onFilterChange: (filter: "ALL" | "PENDING" | "FAILING") => void;
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
}: ToolbarProps) {
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
      <div className="flex w-full gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
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
