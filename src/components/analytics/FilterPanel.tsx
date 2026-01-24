// src/components/analytics/FilterPanel.tsx
import React from "react";
import { X, Filter } from "lucide-react";

export interface AnalyticsFilters {
  gender?: "Male" | "Female" | "All";
  performanceLevel?: "All" | "Excellence" | "Pass" | "Fail";
  subjectFilter?: string;
  scoreRange?: { min: number; max: number };
}

interface FilterPanelProps {
  filters: AnalyticsFilters;
  onFilterChange: (filters: AnalyticsFilters) => void;
  availableSubjects: string[];
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  availableSubjects,
}) => {
  const hasActiveFilters =
    filters.gender !== "All" ||
    filters.performanceLevel !== "All" ||
    filters.subjectFilter !== "All" ||
    (filters.scoreRange && (filters.scoreRange.min > 0 || filters.scoreRange.max < 100));

  const clearFilters = () => {
    onFilterChange({
      gender: "All",
      performanceLevel: "All",
      subjectFilter: "All",
      scoreRange: { min: 0, max: 100 },
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-main flex items-center gap-2 text-base font-bold">
          <Filter className="h-4 w-4" />
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-bold transition-colors sm:text-sm"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Gender Filter */}
        <div>
          <label className="text-muted mb-2 block text-xs font-bold tracking-wide uppercase">
            Gender
          </label>
          <select
            value={filters.gender || "All"}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                gender: e.target.value as "Male" | "Female" | "All",
              })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="All">All Students</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Performance Level Filter */}
        <div>
          <label className="text-muted mb-2 block text-xs font-bold tracking-wide uppercase">
            Performance Level
          </label>
          <select
            value={filters.performanceLevel || "All"}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                performanceLevel: e.target.value as "All" | "Excellence" | "Pass" | "Fail",
              })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="All">All Levels</option>
            <option value="Excellence">Excellence (80%+)</option>
            <option value="Pass">Pass (50-79%)</option>
            <option value="Fail">Below Pass (&lt;50%)</option>
          </select>
        </div>

        {/* Subject Filter */}
        <div>
          <label className="text-muted mb-2 block text-xs font-bold tracking-wide uppercase">
            Subject Focus
          </label>
          <select
            value={filters.subjectFilter || "All"}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                subjectFilter: e.target.value,
              })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="All">All Subjects</option>
            {availableSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        {/* Score Range Filter */}
        <div>
          <label className="text-muted mb-2 block text-xs font-bold tracking-wide uppercase">
            Score Range
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={filters.scoreRange?.min || 0}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    scoreRange: {
                      min: Number(e.target.value),
                      max: filters.scoreRange?.max || 100,
                    },
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Min"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.scoreRange?.max || 100}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    scoreRange: {
                      min: filters.scoreRange?.min || 0,
                      max: Number(e.target.value),
                    },
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Max"
              />
            </div>
            <p className="text-xs text-gray-500">
              Filter students by average score ({filters.scoreRange?.min || 0}% -{" "}
              {filters.scoreRange?.max || 100}%)
            </p>
          </div>
        </div>

        {/* Active Filters Count */}
        {hasActiveFilters && (
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-900">
              {
                [
                  filters.gender !== "All" && "Gender",
                  filters.performanceLevel !== "All" && "Performance",
                  filters.subjectFilter !== "All" && "Subject",
                  (filters.scoreRange?.min || 0) > 0 ||
                    ((filters.scoreRange?.max || 100) < 100 && "Score Range"),
                ].filter(Boolean).length
              }{" "}
              active filter(s)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
