import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudentList } from "../components/StudentList";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { ProcessedStudent } from "../types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

function buildStudents(count: number): ProcessedStudent[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `student-${idx}`,
    name: `Student ${idx + 1}`,
    className: "Basic 5",
    gender: idx % 2 === 0 ? "Female" : "Male",
    subjects: [],
    totalScore: 0,
    averageScore: 0,
    classPosition: "Pending...",
    aggregate: undefined,
  }));
}

describe("StudentList mobile virtualization", () => {
  it("mounts only a windowed subset of mobile cards when rendering large classes", () => {
    const manyStudents = buildStudents(80);
    const contextValue = {
      students: manyStudents,
      settings: DEFAULT_SETTINGS,
    } as unknown as SchoolContextType;

    render(
      <SchoolContext.Provider value={contextValue}>
        <StudentList
          students={manyStudents}
          onAddStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
          onEditStudent={vi.fn()}
        />
      </SchoolContext.Provider>,
    );

    const renderedMobileCards = screen.getAllByTestId("mobile-student-card");
    expect(renderedMobileCards.length).toBeGreaterThan(0);
    expect(renderedMobileCards.length).toBeLessThan(20);
    expect(screen.getAllByText("Student 1").length).toBeGreaterThan(0);
  });
});
