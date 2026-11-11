import { beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthog }));
vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }));
vi.mock("../App.tsx", () => ({ default: () => null }));
vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: vi.fn() }),
}));

let capturedConfig: { session_recording?: { maskTextFn?: (text: string, element: Element | null) => string } } | undefined;

describe("PostHog configuration", () => {
  beforeEach(() => {
    posthog.init.mockClear();
  });

  it("initializes autocapture and masks sensitive session-recording data", async () => {
    await import("../main");

    expect(posthog.init).toHaveBeenCalledOnce();
    const [, config] = posthog.init.mock.calls[0];
    capturedConfig = config;
    expect(config).toMatchObject({
      autocapture: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        blockSelector: "img",
      },
    });

    const { maskTextFn } = config.session_recording;
    const outside = document.createElement("span");
    expect(maskTextFn("Sensitive text", outside)).toBe("*".repeat(14));

    const permitted = document.createElement("span");
    permitted.dataset.record = "true";
    const permittedText = document.createTextNode("Visible text");
    permitted.append(permittedText);
    expect(maskTextFn("Visible text", permittedText.parentElement)).toBe("Visible text");

    const nested = document.createElement("span");
    permitted.append(nested);
    expect(maskTextFn("Nested text", nested)).toBe("Nested text");

    const student = document.createElement("span");
    student.textContent = "Ama Student";
    outside.append(student);
    expect(maskTextFn("Ama Student", student)).toBe("*".repeat(11));
  });

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
    await import("../main");
    const maskTextFn =
      capturedConfig?.session_recording?.maskTextFn ??
      ((text: string, element: Element | null) =>
        element?.closest('[data-record="true"]') ? text : "*".repeat(text.length));

    const { render } = await import("@testing-library/react");
    const { DashboardStats } = await import("../components/DashboardStats");
    const { StatCard: AnalyticsStatCard } = await import("../components/analytics/StatCard");
    const { ChartCard } = await import("../components/analytics/ChartCard");
    const { InsightCard } = await import("../components/analytics/InsightCard");
    const { Users, TrendingUp } = await import("lucide-react");

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
