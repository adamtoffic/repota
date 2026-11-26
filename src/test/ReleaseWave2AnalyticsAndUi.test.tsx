import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_FACTORY_SETTINGS } from "../constants/defaultSettings";
import { AnalyticsDemographicsTab } from "../components/analytics/AnalyticsDemographicsTab";
import { AnalyticsInsightsTab } from "../components/analytics/AnalyticsInsightsTab";
import { QuickGradebookRow } from "../components/gradebook/QuickGradebookRow";
import { SbaTaskManagerModal } from "../components/sba/SbaTaskManagerModal";
import { SubjectRow } from "../components/SubjectRow";
import { DetailsTab } from "../components/tabs/DetailsTab";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { Analytics } from "../pages/Analytics";
import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";
import {
  calculatePerformanceQuartiles,
  calculateSbaVsExamAnalysis,
  calculateSubjectGenderComparison,
} from "../utils/analyticsCalculator";
import { generateClassPulseHeadline, generateClassStory } from "../utils/classStoryGenerator";
import { processStudent } from "../utils/gradeCalculator";
import { applyAutoRemarksToStudents } from "../utils/remarksBatch";

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

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

const settings: SchoolSettings = {
  ...DEFAULT_FACTORY_SETTINGS,
  schoolName: "Wave 2 Analytics Academy",
  className: "JHS 2A",
  level: "JHS",
  classScoreMax: 50,
  examScoreMax: 50,
  totalAttendanceDays: 80,
};

function makeProcessed(records: StudentRecord[]): ProcessedStudent[] {
  return records.map((r) => processStudent(r, settings.level));
}

describe("Wave 2 — Analytics Integrity, Attendance Remarks, Task Confirmation & Decimal Inputs", () => {
  it("P1-15: returns 'no recorded scores yet' for ungraded non-empty rosters without fabricating 0% pass rates", () => {
    const ungradedRoster: StudentRecord[] = [
      {
        id: "u1",
        name: "Ama",
        className: "JHS 2A",
        gender: "Female",
        subjects: [{ id: "m1", name: "Mathematics", classScore: 0, examScore: 0 }],
      },
      {
        id: "u2",
        name: "Kofi",
        className: "JHS 2A",
        gender: "Male",
        subjects: [{ id: "m2", name: "Mathematics", classScore: 0, examScore: 0 }],
      },
    ];

    const story = generateClassStory(ungradedRoster, settings);
    expect(story.gradedCount).toBe(0);
    expect(story.ungradedCount).toBe(2);
    expect(story.headline).toContain("no recorded scores yet");
    expect(story.headline).not.toContain("0% pass rate");
    expect(generateClassPulseHeadline(ungradedRoster, settings)).toContain("no recorded scores yet");
  });

  it("P1-16: scopes Overview class metrics to the selected subject filter", async () => {
    const user = userEvent.setup();
    const roster = makeProcessed([
      {
        id: "s1",
        name: "Ama Serwaa",
        className: "JHS 2A",
        gender: "Female",
        subjects: [
          { id: "m1", name: "Mathematics", classScore: 45, examScore: 45 }, // 90
          { id: "e1", name: "English Language", classScore: 20, examScore: 20 }, // 40 (overall 65)
        ],
      },
      {
        id: "s2",
        name: "Kofi Mensah",
        className: "JHS 2A",
        gender: "Male",
        subjects: [
          { id: "m2", name: "Mathematics", classScore: 40, examScore: 40 }, // 80
          { id: "e2", name: "English Language", classScore: 20, examScore: 20 }, // 40 (overall 60)
        ],
      },
    ]);

    const ctx = { students: roster, settings } as unknown as SchoolContextType;
    render(
      <SchoolContext.Provider value={ctx}>
        <Analytics />
      </SchoolContext.Provider>,
    );

    // Overall class average: (65 + 60) / 2 = 62.5%
    expect(screen.getAllByText(/62\.5\s*%/i).length).toBeGreaterThan(0);

    // Filter to Mathematics -> average becomes (90 + 80) / 2 = 85%
    await user.selectOptions(screen.getByDisplayValue("All Subjects"), "Mathematics");
    expect(screen.getAllByText(/85(?:\.0)?\s*%/i).length).toBeGreaterThan(0);
  });

  it("P1-17 & P1-18 & P2-23: blocks single-gender gap cards, skips incomplete SBA-vs-Exam subjects, and guards small-class quartiles", () => {
    const allMaleRoster: StudentRecord[] = [
      {
        id: "m1",
        name: "Kwame",
        className: "JHS 2A",
        gender: "Male",
        subjects: [{ id: "1", name: "Mathematics", classScore: 40, examScore: 45 }],
      },
    ];
    expect(calculateSubjectGenderComparison(allMaleRoster, settings)).toEqual([]);

    const singleGenderStory = generateClassStory(allMaleRoster, settings);
    render(
      <AnalyticsInsightsTab
        classStory={singleGenderStory}
        copiedBrief={false}
        onCopyStaffBrief={vi.fn()}
        onInspectSubject={vi.fn()}
        borderlineStudents={[]}
        sbaVsExam={{
          available: false,
          classSbaAvgPercent: 0,
          classExamAvgPercent: 0,
          examUnderperformers: [],
          lowClassworkStudents: [],
          subjectBreakdown: [],
        }}
        atRiskStudents={[]}
        onReviewStudents={vi.fn()}
        performanceQuartiles={{ q1: 85, q2: 85, q3: 85, q4Count: 1, strugglingStudents: [] }}
        attendanceInsights={{
          averageAttendance: 0,
          perfectAttendance: 0,
          poorAttendance: 0,
          correlationWithPerformance: "neutral",
          correlationCoefficient: 0,
        }}
        classMetrics={{
          totalStudents: 1,
          averageScore: 85,
          medianScore: 85,
          highestScore: 85,
          lowestScore: 85,
          passRate: 100,
          excellenceRate: 100,
          averageAttendance: 0,
        }}
        subjectInsights={{ strongest: [], weakest: [], needsAttention: [] }}
        genderAnalysis={{
          maleCount: 1,
          femaleCount: 0,
          maleAverage: 85,
          femaleAverage: 0,
          totalCount: 1,
        }}
      />,
    );
    expect(screen.queryByText(/Gender Performance Gap/i)).not.toBeInTheDocument();

    // Mid-term SBA only (examScore: 0) must not trigger false exam underperformance
    const midTermSbaOnly: StudentRecord = {
      id: "mid-1",
      name: "Mid Term",
      className: "JHS 2A",
      subjects: [{ id: "m", name: "Mathematics", classScore: 45, examScore: 0 }],
    };
    const sbaExam = calculateSbaVsExamAnalysis([midTermSbaOnly], settings);
    expect(sbaExam.available).toBe(false);
    expect(sbaExam.examUnderperformers).toEqual([]);

    // Small class where all students pass >= 80% must not label anyone struggling
    const highScoringSmallClass: StudentRecord[] = [
      { ...allMaleRoster[0], id: "a" },
      { ...allMaleRoster[0], id: "b" },
    ];
    expect(calculatePerformanceQuartiles(highScoringSmallClass, settings).strugglingStudents).toEqual([]);
  });

  it("P2-23: renders Performance by Age Group even when attendanceRanges is empty", () => {
    render(
      <AnalyticsDemographicsTab
        genderAnalysis={{
          maleCount: 2,
          femaleCount: 1,
          maleAverage: 75,
          femaleAverage: 80,
          totalCount: 3,
        }}
        attendanceInsights={{
          averageAttendance: 0,
          perfectAttendance: 0,
          poorAttendance: 0,
          correlationWithPerformance: "neutral",
          correlationCoefficient: 0,
        }}
        totalAttendanceDays={80}
        attendanceByGender={{
          maleAttendanceRate: 0,
          femaleAttendanceRate: 0,
          attendanceRanges: [],
        }}
        performanceByAge={[{ ageRange: "12-13", avgScore: 78, count: 3 }]}
        ageDistribution={[]}
      />,
    );

    expect(screen.getByText("Performance by Age Group")).toBeInTheDocument();
  });

  it("P1-19: preserves undefined attendancePresent in DetailsTab and applyAutoRemarksToStudents", () => {
    const highScorer: StudentRecord = {
      id: "r1",
      name: "Ama",
      className: "JHS 2A",
      subjects: [{ id: "m1", name: "Mathematics", classScore: 45, examScore: 45 }],
    };
    const remarked = applyAutoRemarksToStudents([highScorer], settings);
    expect(remarked[0].attendancePresent).toBeUndefined();
    expect(remarked[0].teacherRemark?.length).toBeGreaterThan(0);

    const onUpdate = vi.fn();
    const ctx = {
      students: [processStudent(highScorer, "JHS")],
      settings,
    } as unknown as SchoolContextType;

    render(
      <SchoolContext.Provider value={ctx}>
        <DetailsTab student={processStudent(highScorer, "JHS")} onUpdate={onUpdate} />
      </SchoolContext.Provider>,
    );

    const attInput = screen.getByLabelText(/Days Present/i) as HTMLInputElement;
    expect(attInput.value).toBe("");
    fireEvent.change(attInput, { target: { value: "75" } });
    expect(onUpdate.mock.calls[0][0].attendancePresent).toBe(75);
    fireEvent.change(attInput, { target: { value: "" } });
    expect(onUpdate.mock.calls[1][0].attendancePresent).toBeUndefined();
  });

  it("P1-21: requires confirmation in SbaTaskManagerModal when deleting a task in All Subjects mode with divergent overrides", async () => {
    const user = userEvent.setup();
    const divergentSettings: SchoolSettings = {
      ...settings,
      defaultSubjects: ["Mathematics", "Science"],
      subjectComponentMap: {
        Mathematics: [
          { name: "CAT 1", maxScore: 15, category: "CAT" },
          { name: "Project", maxScore: 35, category: "PROJECT" },
        ],
        Science: [
          { name: "CAT 1", maxScore: 15, category: "CAT" },
          { name: "Lab Work", maxScore: 35, category: "GROUP" },
        ],
      },
    };
    const studentsWithOverrideScore: StudentRecord[] = [
      {
        id: "st1",
        name: "Kojo",
        className: "JHS 2A",
        subjects: [
          {
            id: "sub-m",
            name: "Mathematics",
            classScore: 0,
            examScore: 0,
            classScoreComponents: [{ id: "c1", name: "CAT 1", score: 0, maxScore: 15 }],
          },
          {
            id: "sub-s",
            name: "Science",
            classScore: 10,
            examScore: 0,
            classScoreComponents: [
              { id: "c2", name: "CAT 1", score: 0, maxScore: 15 },
              { id: "c3", name: "Lab Work", score: 10, maxScore: 35 },
            ],
          },
        ],
      },
    ];

    const onCommitConfig = vi.fn();
    render(
      <SbaTaskManagerModal
        isOpen={true}
        onClose={vi.fn()}
        activeSubject="Mathematics"
        defaultSubjects={["Mathematics", "Science"]}
        students={studentsWithOverrideScore}
        settings={divergentSettings}
        onCommitConfig={onCommitConfig}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /All Subjects/i }));
    const removeCatBtn = screen.getByRole("button", { name: /Remove CAT 1/i });
    await user.click(removeCatBtn);
    expect(onCommitConfig).not.toHaveBeenCalled();
    expect(screen.getByText(/Remove "CAT 1"\?/i)).toBeInTheDocument();
  });

  it("P2-19: preserves intermediate decimal drafts ('12.') across SubjectRow & QuickGradebookRow", () => {
    const onChangeSpy = vi.fn();
    function SubjectRowHarness() {
      const [sub, setSub] = useState({
        id: "sub1",
        name: "Mathematics",
        classScore: 0,
        examScore: 0,
        classScoreComponents: [{ id: "c1", name: "CAT 1", score: 0, maxScore: 20 }],
      });
      return (
        <SubjectRow
          subject={sub}
          level="JHS"
          maxClassScore={50}
          maxExamScore={50}
          onChange={(updated) => {
            onChangeSpy(updated);
            setSub({
              ...updated,
              classScoreComponents: updated.classScoreComponents ?? [],
            });
          }}
        />
      );
    }

    render(<SubjectRowHarness />);

    const compInput = screen.getByLabelText("Mathematics CAT 1 Score") as HTMLInputElement;
    fireEvent.change(compInput, { target: { value: "12." } });
    expect(compInput.value).toBe("12.");
    fireEvent.change(compInput, { target: { value: "12.5" } });
    expect(onChangeSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        classScoreComponents: [expect.objectContaining({ score: 12.5 })],
      }),
    );

    const onCommitSpy = vi.fn();
    function QuickRowHarness() {
      const [stu, setStu] = useState<ProcessedStudent>(() =>
        processStudent(
          {
            id: "qg1",
            name: "Ama",
            className: "JHS 2A",
            subjects: [
              {
                id: "sub-qg",
                name: "Mathematics",
                classScore: 0,
                examScore: 0,
                classScoreComponents: [{ id: "c2", name: "CAT 1", score: 0, maxScore: 20 }],
              },
            ],
          },
          "JHS",
        ),
      );
      return (
        <QuickGradebookRow
          student={stu}
          index={0}
          visibleStudents={[stu]}
          activeSubject="Mathematics"
          schoolLevel="JHS"
          isMockExam={false}
          maxClassScore={50}
          maxExamScore={50}
          activeFocusColumn="COMP:CAT 1"
          activeComponentName="CAT 1"
          sbaTaskOptions={[{ name: "CAT 1", maxScore: 20 }]}
          idPrefix="test"
          examDraft={undefined}
          onSetExamDraft={vi.fn()}
          onScheduleBlurCleanup={vi.fn()}
          onClearBlurCleanup={vi.fn()}
          onRegisterInput={vi.fn()}
          onFocusAdjacent={vi.fn()}
          onColumnPaste={vi.fn()}
          onCommitSubjectUpdate={(student, updatedSub) => {
            onCommitSpy(student, updatedSub);
            setStu((prev) => ({
              ...prev,
              subjects: prev.subjects.map((s) =>
                s.id === updatedSub.id ? { ...s, ...updatedSub } : s,
              ),
            }));
          }}
          onAddSubjectToStudent={vi.fn()}
          onSelectSbaTaskForStudent={vi.fn()}
        />
      );
    }

    render(<QuickRowHarness />);
    const qgCompInput = screen.getByLabelText("Ama CAT 1 Score") as HTMLInputElement;
    fireEvent.change(qgCompInput, { target: { value: "14." } });
    expect(qgCompInput.value).toBe("14.");
    fireEvent.change(qgCompInput, { target: { value: "14.5" } });
    expect(onCommitSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "qg1" }),
      expect.objectContaining({
        classScoreComponents: [expect.objectContaining({ score: 14.5 })],
      }),
    );
  });
});
