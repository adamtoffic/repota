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
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { useMediaQuery } from "../hooks/useMediaQuery";
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
  count?: number;
  dismissible?: boolean;
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobileSheet = useMediaQuery("(max-width: 767px)", false);

  const closeMenu = useCallback((restoreFocus = false) => {
    setShowMenu(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const closeMobileSheet = useCallback(() => {
    closeMenu(true);
  }, [closeMenu]);

  useDialogA11y({
    isOpen: showMenu && isMobileSheet,
    onClose: closeMobileSheet,
    dialogRef: menuRef,
    closeOnEscape: true,
    lockScroll: true,
    trapFocus: true,
  });

  useEffect(() => {
    if (!showMenu || !isMobileSheet) return;
    document.documentElement.dataset.mobileSheetOpen = "true";
    return () => {
      delete document.documentElement.dataset.mobileSheetOpen;
    };
  }, [isMobileSheet, showMenu]);

  useEffect(() => {
    if (!showMenu) return;
    const focusTimer = requestAnimationFrame(() => {
      const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    });
    if (isMobileSheet) {
      return () => cancelAnimationFrame(focusTimer);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isMobileSheet, showMenu]);

  const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

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
            aria-label="Search students"
            className="border-border-strong bg-input text-main placeholder:text-muted focus:border-primary-text focus:ring-primary-text block w-full rounded-lg border py-2.5 pr-10 pl-10 text-sm transition-all outline-none focus:ring-1"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {isSearching ? (
            <div
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center"
              aria-label="Searching"
            >
              <Loader2 className="text-primary-text h-4 w-4 animate-spin" />
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
            className="hover:bg-subtle border-border-strong bg-input text-secondary focus:border-primary-text focus:ring-primary-text h-[42px] shrink-0 rounded-lg border px-2.5 text-xs font-bold shadow-sm outline-none focus:ring-1 sm:px-3 sm:text-sm"
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
            label="All"
            count={counts?.all}
            isActive={activeFilter === "ALL"}
            onClick={() => onFilterChange("ALL")}
          />
          <FilterButton
            label="Incomplete"
            count={counts?.pending}
            isActive={activeFilter === "PENDING"}
            onClick={() => onFilterChange(activeFilter === "PENDING" ? "ALL" : "PENDING")}
            activeColor="bg-orange-700"
          />
          {((counts?.missingPhotos ?? 0) > 0 || activeFilter === "MISSING_PHOTOS") && (
            <FilterButton
              label="Missing Photos"
              count={counts?.missingPhotos}
              isActive={activeFilter === "MISSING_PHOTOS"}
              onClick={() =>
                onFilterChange(activeFilter === "MISSING_PHOTOS" ? "ALL" : "MISSING_PHOTOS")
              }
              activeColor="bg-amber-700"
            />
          )}
          <FilterButton
            label="Failing"
            count={counts?.failing}
            isActive={activeFilter === "FAILING"}
            onClick={() => onFilterChange(activeFilter === "FAILING" ? "ALL" : "FAILING")}
            activeColor="bg-red-600"
          />
          {activeFilter === "NO_SCORES" && (
            <FilterButton
              label="No Scores"
              count={counts?.noScores}
              dismissible
              isActive={true}
              onClick={() => onFilterChange("ALL")}
              activeColor="bg-red-600"
            />
          )}
          {activeFilter === "PARTIAL_SCORES" && (
            <FilterButton
              label="Partial Scores"
              count={counts?.partialScores}
              dismissible
              isActive={true}
              onClick={() => onFilterChange("ALL")}
              activeColor="bg-orange-700"
            />
          )}
        </div>

        {/* Fixed Class Tools Dropdown / Mobile Bottom Sheet */}
        <div className="relative shrink-0">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            aria-expanded={showMenu}
            aria-haspopup="menu"
            className="hover:bg-subtle border-border-strong bg-surface text-secondary flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold shadow-sm active:scale-95 sm:h-9 sm:min-h-0 sm:text-sm"
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
                className="fixed inset-0 z-[45] bg-black/30 backdrop-blur-[1px] md:z-30 md:bg-transparent md:backdrop-blur-none dark:bg-black/60 md:dark:bg-transparent"
                onClick={() => closeMenu(false)}
              />
              <div
                ref={menuRef}
                tabIndex={-1}
                role="menu"
                aria-label="Class Tools"
                aria-modal={isMobileSheet ? "true" : undefined}
                onKeyDown={handleMenuKeyDown}
                className="border-border bg-elevated fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-y-auto rounded-t-3xl border-t p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl focus:outline-none md:absolute md:inset-auto md:top-full md:right-0 md:z-40 md:mt-2 md:max-h-[75dvh] md:w-72 md:rounded-2xl md:border md:p-1.5 md:pb-1.5 md:shadow-xl"
              >
                {/* Mobile Drag Handle & Header */}
                <div className="mb-3 flex flex-col items-center md:hidden">
                  <div className="bg-border-strong mb-2 h-1 w-10 rounded-full" />
                  <div className="flex w-full items-center justify-between px-1">
                    <span className="text-main text-sm font-bold" data-record="true">
                      Class Tools
                    </span>
                    <button
                      type="button"
                      onClick={() => closeMenu(true)}
                      aria-label="Close Class Tools"
                      className="text-muted hover:bg-subtle hover:text-main rounded-full p-2"
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
                  className="flex w-full items-center gap-2.5 rounded-xl bg-amber-50/90 px-3 py-3 text-left text-sm font-bold text-amber-900 hover:bg-amber-100/80 sm:py-2.5 dark:bg-amber-500/12 dark:text-amber-300 dark:hover:bg-amber-500/20"
                  data-record="true"
                >
                  <Wand2 size={16} className="shrink-0 text-amber-700 dark:text-amber-400" /> Auto-Fill Teacher Remarks
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
                        <RefreshCw size={16} className="shrink-0 text-teal-600 dark:text-teal-400" />{" "}
                        <span>Sync Subjects &amp; SBA Tasks</span>
                        <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
                          Update
                        </span>
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium text-orange-700 hover:bg-orange-50 sm:py-2.5 dark:text-orange-400 dark:hover:bg-orange-950/50"
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-700 hover:bg-red-50 sm:py-2.5 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <Trash2 size={16} className="shrink-0" />
                  <span>
                    <span data-record="true">Remove Incomplete Students</span>
                    {counts && counts.pending > 0 ? ` (${counts.pending})` : ""}
                  </span>
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
  count,
  dismissible = false,
  icon,
  isActive,
  onClick,
  activeColor,
  hoverColor = "hover:bg-subtle",
}: FilterButtonProps) {
  const activeStyle = activeColor
    ? `${activeColor} border-transparent text-white shadow-md`
    : "bg-primary border-transparent text-white shadow-sm";

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`flex min-h-10 items-center gap-1 rounded-full border px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors sm:min-h-0 sm:py-1.5 ${
        isActive ? activeStyle : `border-border bg-surface text-secondary ${hoverColor}`
      }`}
    >
      {icon}
      <span data-record="true">{label}</span>
      {count !== undefined ? ` (${count})` : ""}
      {dismissible ? " ×" : ""}
    </button>
  );
}
