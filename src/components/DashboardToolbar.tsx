// src/components/DashboardToolbar.tsx
import {
  Search,
  Download,
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  Wand2,
  Eraser,
  FileSpreadsheet,
  Loader2,
  X,
  Upload,
  CalendarCheck,
  RefreshCw,
  GraduationCap,
  Table2,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardFilter, StudentSortOption } from "../utils/studentValidation";

export interface DashboardFilterCounts {
  all: number;
  pending: number;
  noScores: number;
  partialScores?: number;
  missingPhotos: number;
  failing: number;
}

// 1. Define Props for the Main Toolbar
interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isSearching?: boolean;
  activeFilter: DashboardFilter;
  onFilterChange: (filter: DashboardFilter) => void;
  sortBy?: StudentSortOption;
  onSortChange?: (sort: StudentSortOption) => void;
  counts?: DashboardFilterCounts;
  onExport: () => void;
  onExportDetailed?: () => void;
  onDeletePending: () => void;
  onImport?: () => void;
  onImportScores?: () => void;
  onBulkAttendance?: () => void;
  onSyncClassSubjects?: () => void;
  onBulkPromotion?: () => void;
  onAutoRemarks: () => void;
  onClearScores: () => void;
  onExportStudentList: () => void;
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
  isSearching = false,
  activeFilter,
  onFilterChange,
  sortBy = "DEFAULT",
  onSortChange,
  counts,
  onExport,
  onExportDetailed,
  onDeletePending,
  onImport,
  onImportScores,
  onBulkAttendance,
  onSyncClassSubjects,
  onBulkPromotion,
  onAutoRemarks,
  onClearScores,
  onExportStudentList,
}: ToolbarProps) {
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!showMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMenu(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMenu]);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5">
      {/* ROW 1: Search Bar & Sort */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="text-muted h-4 w-4" />
          </div>
          <input
            type="text"
            className="border-border-strong bg-input text-main placeholder:text-muted block w-full rounded-lg border py-2.5 pr-10 pl-10 text-sm transition-all outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {isSearching ? (
            <div
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center"
              aria-label="Searching"
            >
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          ) : (
            searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className="text-muted hover:text-main absolute inset-y-0 right-3 flex items-center"
              >
                <X className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        {onSortChange && (
          <select
            aria-label="Sort students"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as StudentSortOption)}
            className="hover:bg-subtle border-border-strong bg-input text-secondary h-[42px] shrink-0 rounded-lg border px-2.5 text-xs font-bold shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:px-3 sm:text-sm"
            data-record="true"
          >
            <option value="DEFAULT">Sort: Roll Order</option>
            <option value="NAME_ASC">Name (A–Z)</option>
            <option value="NAME_DESC">Name (Z–A)</option>
            <option value="AVG_DESC">Avg (High → Low)</option>
            <option value="AVG_ASC">Avg (Low → High)</option>
            <option value="INCOMPLETE_FIRST">Incomplete First</option>
          </select>
        )}
      </div>

      {/* ROW 2: Filters (Left) & Actions (Right) */}
      <div className="flex items-center justify-between gap-2">
        {/* Scrollable Filters */}
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto pb-1">
          <FilterButton
            label={counts ? `All (${counts.all})` : "All"}
            isActive={activeFilter === "ALL"}
            onClick={() => onFilterChange("ALL")}
          />
          <FilterButton
            label={counts ? `Incomplete (${counts.pending})` : "Incomplete"}
            isActive={activeFilter === "PENDING"}
            onClick={() => onFilterChange(activeFilter === "PENDING" ? "ALL" : "PENDING")}
            activeColor="bg-orange-700"
          />
          {((counts?.missingPhotos ?? 0) > 0 || activeFilter === "MISSING_PHOTOS") && (
            <FilterButton
              label={counts ? `Missing Photos (${counts.missingPhotos})` : "Missing Photos"}
              isActive={activeFilter === "MISSING_PHOTOS"}
              onClick={() =>
                onFilterChange(activeFilter === "MISSING_PHOTOS" ? "ALL" : "MISSING_PHOTOS")
              }
              activeColor="bg-amber-700"
            />
          )}
          <FilterButton
            label={counts ? `Failing (${counts.failing})` : "Failing"}
            isActive={activeFilter === "FAILING"}
            onClick={() => onFilterChange(activeFilter === "FAILING" ? "ALL" : "FAILING")}
            activeColor="bg-red-600"
          />
          {activeFilter === "NO_SCORES" && (
            <FilterButton
              label={counts ? `No Scores (${counts.noScores}) ×` : "No Scores ×"}
              isActive={true}
              onClick={() => onFilterChange("ALL")}
              activeColor="bg-red-600"
            />
          )}
          {activeFilter === "PARTIAL_SCORES" && (
            <FilterButton
              label={
                counts && counts.partialScores !== undefined
                  ? `Partial Scores (${counts.partialScores}) ×`
                  : "Partial Scores ×"
              }
              isActive={true}
              onClick={() => onFilterChange("ALL")}
              activeColor="bg-orange-700"
            />
          )}
        </div>

        {/* Fixed Class Tools Dropdown / Mobile Bottom Sheet */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            aria-expanded={showMenu}
            aria-haspopup="menu"
            className="hover:bg-subtle border-border-strong bg-surface text-secondary flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold shadow-sm active:scale-95 sm:text-sm"
            data-record="true"
          >
            <SlidersHorizontal size={14} className="text-primary-text" />
            <span>Class Tools</span>
            <ChevronDown
              size={14}
              className={`text-muted transition-transform ${showMenu ? "rotate-180" : ""}`}
            />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-[45] bg-black/30 backdrop-blur-[1px] sm:z-10 sm:bg-transparent sm:backdrop-blur-none dark:bg-black/60 sm:dark:bg-transparent"
                onClick={() => setShowMenu(false)}
              />
              <div
                role="menu"
                aria-label="Class Tools"
                className="border-border bg-elevated fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:z-20 sm:mt-2 sm:max-h-[75vh] sm:w-72 sm:rounded-2xl sm:border sm:p-1.5 sm:pb-1.5 sm:shadow-xl"
              >
                {/* Mobile Drag Handle & Header */}
                <div className="mb-3 flex flex-col items-center sm:hidden">
                  <div className="bg-border-strong mb-2 h-1 w-10 rounded-full" />
                  <div className="flex w-full items-center justify-between px-1">
                    <span className="text-main text-sm font-bold" data-record="true">
                      Class Tools
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMenu(false)}
                      aria-label="Close Class Tools"
                      className="text-muted hover:bg-subtle hover:text-main rounded-full p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Group 1: Smart Assistant */}
                <p
                  className="text-muted px-3 pt-1 pb-1 text-[11px] font-bold tracking-wider uppercase"
                  data-record="true"
                >
                  Smart Assistant
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onAutoRemarks();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-purple-50 px-3 py-3 text-left text-sm font-bold text-purple-700 hover:bg-purple-100 sm:py-2.5 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-950/90"
                  data-record="true"
                >
                  <Wand2 size={16} className="shrink-0 text-purple-600 dark:text-purple-400" /> Auto-Fill Teacher Remarks
                </button>

                {/* Group 2: Import & Bulk Operations */}
                {(onImport ||
                  onImportScores ||
                  onBulkAttendance ||
                  onSyncClassSubjects ||
                  onBulkPromotion) && (
                  <>
                    <div className="border-border-subtle my-1.5 border-t" />
                    <p
                      className="text-muted px-3 pt-1 pb-1 text-[11px] font-bold tracking-wider uppercase"
                      data-record="true"
                    >
                      Import &amp; Class Setup
                    </p>
                    {onImport && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onImport();
                          setShowMenu(false);
                        }}
                        className="hover:bg-subtle text-secondary flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium sm:py-2.5"
                        data-record="true"
                      >
                        <Upload size={16} className="shrink-0 text-blue-600 dark:text-blue-400" /> Import Student
                        Roster
                      </button>
                    )}
                    {onImportScores && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onImportScores();
                          setShowMenu(false);
                        }}
                        className="hover:bg-subtle text-secondary flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium sm:py-2.5"
                        data-record="true"
                      >
                        <Table2 size={16} className="shrink-0 text-purple-600 dark:text-purple-400" /> Import SBA / Exam
                        Scores
                      </button>
                    )}
                    {onBulkAttendance && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onBulkAttendance();
                          setShowMenu(false);
                        }}
                        className="hover:bg-subtle text-secondary flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium sm:py-2.5"
                        data-record="true"
                      >
                        <CalendarCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" /> Bulk
                        Attendance Entry
                      </button>
                    )}
                    {onSyncClassSubjects && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onSyncClassSubjects();
                          setShowMenu(false);
                        }}
                        className="hover:bg-subtle text-secondary flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium sm:py-2.5"
                        data-record="true"
                      >
                        <RefreshCw size={16} className="shrink-0 text-teal-600 dark:text-teal-400" /> Sync Subjects
                        &amp; SBA Tasks
                      </button>
                    )}
                    {onBulkPromotion && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onBulkPromotion();
                          setShowMenu(false);
                        }}
                        className="hover:bg-subtle text-secondary flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium sm:py-2.5"
                        data-record="true"
                      >
                        <GraduationCap size={16} className="shrink-0 text-indigo-600 dark:text-indigo-400" /> Bulk
                        Promotion Status
                      </button>
                    )}
                  </>
                )}

                <div className="border-border-subtle my-1.5 border-t" />

                {/* Group 3: Export & Share */}
                <p
                  className="text-muted px-3 pt-1 pb-1 text-[11px] font-bold tracking-wider uppercase"
                  data-record="true"
                >
                  Export &amp; Share
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExport();
                    setShowMenu(false);
                  }}
                  className="hover:bg-subtle text-secondary flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium sm:py-2.5"
                  data-record="true"
                >
                  <Download size={16} className="shrink-0 text-blue-600 dark:text-blue-400" /> Export Broadsheet (CSV)
                </button>
                {onExportDetailed && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onExportDetailed();
                      setShowMenu(false);
                    }}
                    className="hover:bg-subtle text-secondary flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium sm:py-2.5"
                    data-record="true"
                  >
                    <FileSpreadsheet size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" /> Export
                    Detailed Broadsheet
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExportStudentList();
                    setShowMenu(false);
                  }}
                  className="hover:bg-subtle text-secondary flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium sm:py-2.5"
                  data-record="true"
                >
                  <FileSpreadsheet size={16} className="shrink-0 text-indigo-600 dark:text-indigo-400" /> Export Student
                  Roll (.txt)
                </button>

                <div className="border-border-subtle my-1.5 border-t" />

                {/* Group 4: Term Cleanup */}
                <p
                  className="text-muted px-3 pt-1 pb-1 text-[11px] font-bold tracking-wider uppercase"
                  data-record="true"
                >
                  Term Cleanup
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClearScores();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium text-orange-600 hover:bg-orange-50 sm:py-2.5 dark:text-orange-400 dark:hover:bg-orange-950/50"
                  data-record="true"
                >
                  <Eraser size={16} className="shrink-0" /> Clear All Scores
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onDeletePending();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 sm:py-2.5 dark:text-red-400 dark:hover:bg-red-950/50"
                  data-record="true"
                >
                  <Trash2 size={16} className="shrink-0" /> Remove Incomplete Students
                  {counts && counts.pending > 0 ? ` (${counts.pending})` : ""}
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
  activeColor,
  hoverColor = "hover:bg-subtle",
}: FilterButtonProps) {
  const activeStyle = activeColor
    ? `${activeColor} border-transparent text-white shadow-md`
    : "bg-slate-900 border-transparent text-white shadow-sm dark:bg-elevated dark:text-main dark:border-border-strong dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]";

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-4 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
        isActive ? activeStyle : `border-border bg-surface text-secondary ${hoverColor}`
      }`}
      data-record="true"
    >
      {icon} {label}
    </button>
  );
}
