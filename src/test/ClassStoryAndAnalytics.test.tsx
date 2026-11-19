import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { ToastContext } from "../context/ToastContextDefinition";
import { Analytics } from "../pages/Analytics";
import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";
import { generateClassStory } from "../utils/classStoryGenerator";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: () => <div data-testid="recharts-bar" />,
  Bar: () => null,
  PieChart: () => <div data-testid="recharts-pie" />,
  Pie: () => null,
  Cell: () => null,
  RadarChart: () => <div data-testid="recharts-radar" />,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  ComposedChart: () => <div data-testid="recharts-composed" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LabelList: () => null,
}));

const settings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Heritage Academy",
  className: "JHS 2A",
  level: "JHS",
  schoolType: "PRIVATE",
  totalAttendanceDays: 80,
};

const sampleStudents: StudentRecord[] = [
  {
    id: "s1",
    name: "Ama Serwaa",
    className: "JHS 2A",
    gender: "Female",
    attendancePresent: 78,
    feeStatus: "PAID",
    subjects: [
      {
        id: "m1",
        name: "Mathematics",
        classScore: 44,
        examScore: 44,
        classScoreComponents: [
          { id: "c1", name: "CAT 1", score: 18, maxScore: 20, category: "CAT" },
        ],
      },
      { id: "e1", name: "English Language", classScore: 42, examScore: 40 },
    ],
  },
  {
    id: "s2",
    name: "Kofi Mensah",
    className: "JHS 2A",
    gender: "Male",
    attendancePresent: 68,
    feeStatus: "OWING",
    feeArrears: 250,
    subjects: [
      { id: "m2", name: "Mathematics", classScore: 20, examScore: 26 },
      { id: "e2", name: "English Language", classScore: 24, examScore: 26 },
    ],
  },
  {
    id: "s3",
    name: "Yaw Boateng",
    className: "JHS 2A",
    gender: "Male",
    attendancePresent: 72,
    subjects: [
      { id: "m3", name: "Mathematics", classScore: 42, examScore: 15 }, // Strong SBA, low exam
      { id: "e3", name: "English Language", classScore: 40, examScore: 18 },
    ],
  },
];

describe("classStoryGenerator & Analytics UI", () => {
  it("generates an actionable offline Class Story with strengths, watchouts, and staff brief", () => {
    const story = generateClassStory(sampleStudents, settings);

    expect(story.gradedCount).toBe(3);
    expect(story.headline).toContain("JHS 2A");
    expect(story.narrativeParagraphs.length).toBeGreaterThanOrEqual(2);
    expect(story.watchouts.some((w) => w.includes("SBA classwork"))).toBe(true);
    expect(story.watchouts.some((w) => w.includes("250.00"))).toBe(true);
    expect(story.actionPlan.length).toBeGreaterThanOrEqual(1);
    expect(story.plainTextBrief).toContain("NEXT-WEEK ACTION PLAN:");
  });

  it("handles empty or ungraded classes gracefully", () => {
    const emptyStory = generateClassStory([], settings);
    expect(emptyStory.gradedCount).toBe(0);
    expect(emptyStory.headline).toContain("no recorded scores yet");
  });

  it("renders Class Pulse, Private Fee Tracking, and full AI Insights narrative tab", async () => {
    const user = userEvent.setup();
    const processed = sampleStudents.map((s, idx) => ({
      ...s,
      age: 13,
      totalScore: 120,
      averageScore: idx === 0 ? 85 : idx === 1 ? 48 : 57.5,
      classPosition: `${idx + 1}`,
      aggregate: 12,
      subjects: s.subjects.map((sub) => ({
        ...sub,
        totalScore: sub.classScore + sub.examScore,
        grade: 2 as const,
        remark: "Higher",
      })),
    })) as ProcessedStudent[];

    const ctx = {
      students: processed,
      settings,
    } as unknown as SchoolContextType;

    render(
      <ToastContext.Provider value={{ showToast: vi.fn() }}>
        <SchoolContext.Provider value={ctx}>
          <Analytics />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    expect(screen.getByText(/Class Pulse Story/i)).toBeInTheDocument();
    expect(screen.getByText(/Private School Fee Tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Arrears: GH₵250\.00/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Full AI Story & Plan/i }));

    expect(await screen.findByText(/AI Class Story & Intervention Brief/i)).toBeInTheDocument();
    expect(screen.getByText(/Borderline Cohort/i)).toBeInTheDocument();
    expect(screen.getByText(/SBA Classwork vs\. Exam Discrepancy Spotlight/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy Staff Brief/i })).toBeInTheDocument();
  });

  it("renders clean Analytics heading without emoji, visible CSV/PDF labels, and mobile active filter badge + clear button", async () => {
    const user = userEvent.setup();
    const processed = sampleStudents.map((s, idx) => ({
      ...s,
      age: 13,
      totalScore: 120,
      averageScore: idx === 0 ? 85 : idx === 1 ? 48 : 57.5,
      classPosition: `${idx + 1}`,
      aggregate: 12,
      subjects: s.subjects.map((sub) => ({
        ...sub,
        totalScore: sub.classScore + sub.examScore,
        grade: 2 as const,
        remark: "Higher",
      })),
    })) as ProcessedStudent[];

    const ctx = {
      students: processed,
      settings,
    } as unknown as SchoolContextType;

    render(
      <ToastContext.Provider value={{ showToast: vi.fn() }}>
        <SchoolContext.Provider value={ctx}>
          <Analytics />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    const heading = screen.getByRole("heading", { name: "Advanced Analytics" });
    expect(heading.textContent).not.toContain("📊");
    expect(screen.getByRole("button", { name: /CSV/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /PDF/i })).toBeInTheDocument();
    expect(screen.getByText(/3 of 3 students/i)).toBeInTheDocument();

    // Apply Female gender filter and check active count badge + Clear button
    await user.selectOptions(screen.getByDisplayValue("All Students"), "Female");
    expect(screen.getByText(/1 of 3 students/i)).toBeInTheDocument();

    const filterBtn = screen.getByRole("button", { name: /^Filters/i });
    expect(filterBtn.textContent).toContain("1");

    await user.click(screen.getByRole("button", { name: "Clear active filters" }));
    expect(screen.getByText(/3 of 3 students/i)).toBeInTheDocument();
  });
});
