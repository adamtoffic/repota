import { describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock("posthog-js", () => ({ default: posthog }));
vi.mock("../App.tsx", () => ({ default: () => null }));

describe("PostHog configuration", () => {
  it("marks primitive labels and supports opting out", async () => {
    const { Input } = await import("../components/ui/Input");
    const { Select } = await import("../components/ui/Select");
    const { Textarea } = await import("../components/ui/Textarea");
    const { FormLabel } = await import("../components/ui/FormLabel");
    const { render } = await import("@testing-library/react");

    const { container } = render(
      <>
        <Input label="Readable input" />
        <Select label="Readable select">
          <option>One</option>
        </Select>
        <Textarea label="Readable textarea" />
        <Input label="Masked input" recordLabel={false} />
        <FormLabel>Readable form label</FormLabel>
      </>,
    );

    expect(container.querySelector('label[data-record="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll('label[data-record="true"]')).toHaveLength(4);
    expect(container.querySelectorAll("label")).toHaveLength(5);
  });

  it("marks static labels in Dashboard and Analytics components with data-record='true' while keeping sensitive data unflagged", async () => {
    posthog.init.mockClear();
    await import("../main");
    expect(posthog.init).toHaveBeenCalledOnce();
    const maskTextFn = posthog.init.mock.calls[0][1].session_recording.maskTextFn as (
      text: string,
      element: Element | null,
    ) => string;

    const { render } = await import("@testing-library/react");
    const { DashboardStats } = await import("../components/DashboardStats");
    const { StatCard: AnalyticsStatCard } = await import("../components/analytics/StatCard");
    const { ChartCard } = await import("../components/analytics/ChartCard");
    const { InsightCard } = await import("../components/analytics/InsightCard");
    const { Users, TrendingUp } = await import("lucide-react");

    // Verify nested child elements inside a data-record="true" ancestor remain unmasked
    const { container: nestedContainer } = render(
      <div data-record="true">
        <span className="nested-static-label">Nested static label</span>
      </div>,
    );
    const nestedStaticEl = nestedContainer.querySelector(".nested-static-label");
    expect(maskTextFn("Nested static label", nestedStaticEl)).toBe("Nested static label");

    // 1. DashboardStats test
    const mockStudent = {
      id: "student-1",
      name: "Kwame Mensah",
      class: "Basic 1",
      gender: "Male" as const,
      subjects: [
        {
          subjectName: "Math",
          classScore: 25,
          examScore: 50,
          totalScore: 75,
          grade: "2",
          position: "1st",
        },
      ],
      totalScore: 75,
      rawAverageScore: 75,
      averageScore: 75,
      classPosition: "1st",
    };
    const mockSettings = {
      schoolName: "Test Academy",
      schoolLogo: "",
      classSize: 40,
      term: "Term 1",
      academicYear: "2025/2026",
      className: "Basic 1",
      nextTermBegins: "",
      vacationDate: "",
      totalAttendanceDays: 60,
      defaultSubjects: [],
      gradingScale: "PRIMARY" as const,
    };

    const { container: dashboardStatsContainer } = render(
      <DashboardStats students={[mockStudent]} settings={mockSettings} />,
    );

    const statLabels = dashboardStatsContainer.querySelectorAll('[data-record="true"]');
    expect(statLabels.length).toBeGreaterThan(0);
    statLabels.forEach((el) => {
      const text = el.textContent || "";
      expect(maskTextFn(text, el)).toBe(text);
    });

    // Dynamic numeric values in DashboardStats must NOT have data-record="true"
    const values = dashboardStatsContainer.querySelectorAll("h3");
    values.forEach((valEl) => {
      expect(valEl.closest('[data-record="true"]')).toBeNull();
      const text = valEl.textContent || "";
      expect(maskTextFn(text, valEl)).toBe("*".repeat(text.length));
    });

    // 2. Analytics StatCard test
    const { container: analyticsStatCardContainer } = render(
      <AnalyticsStatCard title="Male Students" value="12" icon={Users} color="blue" />,
    );
    const titleEl = analyticsStatCardContainer.querySelector('[data-record="true"]');
    expect(titleEl).toBeInTheDocument();
    expect(titleEl?.textContent).toBe("Male Students");
    expect(maskTextFn("Male Students", titleEl)).toBe("Male Students");

    const statValEl = analyticsStatCardContainer.querySelector(".text-main");
    expect(statValEl?.closest('[data-record="true"]')).toBeNull();
    expect(maskTextFn("12", statValEl)).toBe("**");

    // 3. Analytics ChartCard test
    const { container: chartCardContainer } = render(
      <ChartCard title="Grade Distribution" icon={Users}>
        <div className="sensitive-chart-content">Grade A: 15 students</div>
      </ChartCard>,
    );
    const chartTitleEl = chartCardContainer.querySelector('h3[data-record="true"]');
    expect(chartTitleEl).toBeInTheDocument();
    expect(chartTitleEl?.textContent).toContain("Grade Distribution");
    expect(maskTextFn("Grade Distribution", chartTitleEl)).toBe("Grade Distribution");

    const chartContentEl = chartCardContainer.querySelector(".sensitive-chart-content");
    expect(chartContentEl?.closest('[data-record="true"]')).toBeNull();
    expect(maskTextFn("Grade A: 15 students", chartContentEl)).toBe("*".repeat(20));

    // 4. Analytics InsightCard test
    const { container: insightCardContainer } = render(
      <InsightCard
        title="Strongest Subjects"
        icon={TrendingUp}
        variant="success"
        items={[{ name: "Mathematics", value: "85%" }]}
      />,
    );
    const insightTitleEl = insightCardContainer.querySelector('h4[data-record="true"]');
    expect(insightTitleEl).toBeInTheDocument();
    expect(insightTitleEl?.textContent).toContain("Strongest Subjects");
    expect(maskTextFn("Strongest Subjects", insightTitleEl)).toBe("Strongest Subjects");

    // Subject name and score inside InsightCard must be masked
    const itemNameEl = insightCardContainer.querySelector(".font-medium");
    expect(itemNameEl?.closest('[data-record="true"]')).toBeNull();
    expect(maskTextFn("Mathematics", itemNameEl)).toBe("*".repeat(11));
  });
});
