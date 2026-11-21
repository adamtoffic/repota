import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentRecord } from "../types";
import type { ResolveAppEnvOptions } from "../utils/analyticsEnv";

const posthogMock = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

import { resolveAppEnv, shouldSendAnalytics } from "../utils/analyticsEnv";
import {
  REPORT_LEDGER_STORAGE_KEY,
  clearReportAnalyticsLedger,
  hashReportKey,
  sha256Hex,
  trackReportPrint,
  type ReportAnalyticsSettings,
} from "../utils/reportAnalytics";

const baseSettings: ReportAnalyticsSettings = {
  academicYear: "2025/2026",
  term: "First Term",
  examType: "TERMLY",
  level: "JHS",
  schoolType: "STANDARD",
  templateId: "modern_v2",
  defaultSubjects: ["Mathematics", "English"],
};

function makeStudent(
  id: string,
  subjects: Array<{ classScore: number; examScore: number }> = [
    { classScore: 30, examScore: 45 },
    { classScore: 32, examScore: 40 },
  ],
): StudentRecord {
  return {
    id,
    name: `Student ${id}`,
    className: "JHS 2",
    gender: "Female",
    subjects: subjects.map((scores, idx) => ({
      id: `${id}-sub-${idx}`,
      name: baseSettings.defaultSubjects[idx] ?? `Subject ${idx}`,
      classScore: scores.classScore,
      examScore: scores.examScore,
    })),
  };
}

function getCapturedEvents(eventName: string) {
  return posthogMock.capture.mock.calls
    .filter(([name]) => name === eventName)
    .map(([, props]) => props as Record<string, unknown>);
}

describe("reportAnalytics & analyticsEnv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearReportAnalyticsLedger();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("computes standard SHA-256 digests and normalizes academic period keys", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    const k1 = hashReportKey("2025/2026|first term|TERMLY|student-1");
    expect(k1).toHaveLength(32);

    trackReportPrint({
      students: [makeStudent("student-1")],
      settings: {
        ...baseSettings,
        academicYear: "  2025/2026 ",
        term: "First   Term" as ReportAnalyticsSettings["term"],
        examType: "termly" as ReportAnalyticsSettings["examType"],
      },
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });

    trackReportPrint({
      students: [makeStudent("student-1")],
      settings: {
        ...baseSettings,
        academicYear: "2025/2026",
        term: "First Term",
        examType: "TERMLY",
      },
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });

    const generated = getCapturedEvents("Report_Card_Generated");
    expect(generated).toHaveLength(1);
    expect(generated[0].report_key).toBe(k1);
  });

  it("deduplicates 30 repeated prints of 35 real students to exactly 35 unique reports", () => {
    const students = Array.from({ length: 35 }, (_, i) => makeStudent(`stu-${i + 1}`));

    for (let attempt = 0; attempt < 30; attempt++) {
      const summary = trackReportPrint({
        students,
        settings: baseSettings,
        printMode: "color",
        printScope: "all",
        printChannel: "native_print",
      });

      if (attempt === 0) {
        expect(summary.newUniqueReportsCount).toBe(35);
        expect(summary.isReprint).toBe(false);
      } else {
        expect(summary.newUniqueReportsCount).toBe(0);
        expect(summary.isReprint).toBe(true);
      }
    }

    const generated = getCapturedEvents("Report_Card_Generated");
    expect(generated).toHaveLength(35);

    const printedEvents = getCapturedEvents("Printed_Reports");
    expect(printedEvents).toHaveLength(30);
    expect(printedEvents[0]).toMatchObject({
      students_count: 35,
      new_unique_reports_count: 35,
      is_reprint: false,
    });
    for (let i = 1; i < 30; i++) {
      expect(printedEvents[i]).toMatchObject({
        students_count: 35,
        new_unique_reports_count: 0,
        is_reprint: true,
      });
    }
  });

  it("deduplicates single-student preview print followed by full-class print", () => {
    const students = Array.from({ length: 35 }, (_, i) => makeStudent(`stu-${i + 1}`));

    const first = trackReportPrint({
      students: [students[0]],
      settings: baseSettings,
      printMode: "color",
      printScope: "single",
      printChannel: "native_print",
    });
    expect(first.newUniqueReportsCount).toBe(1);

    const second = trackReportPrint({
      students,
      settings: baseSettings,
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });
    expect(second.newUniqueReportsCount).toBe(34);

    const generated = getCapturedEvents("Report_Card_Generated");
    expect(generated).toHaveLength(35);
    expect(new Set(generated.map((e) => e.report_key)).size).toBe(35);
  });

  it("counts only newly added late students when reprinting the class", () => {
    const initial = Array.from({ length: 35 }, (_, i) => makeStudent(`stu-${i + 1}`));
    trackReportPrint({
      students: initial,
      settings: baseSettings,
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });

    const withLateAdditions = [...initial, makeStudent("stu-36"), makeStudent("stu-37")];
    const summary = trackReportPrint({
      students: withLateAdditions,
      settings: baseSettings,
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });

    expect(summary.newUniqueReportsCount).toBe(2);
    expect(summary.isReprint).toBe(false);
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(37);
  });

  it("counts fresh reports when term or exam type changes", () => {
    const students = Array.from({ length: 5 }, (_, i) => makeStudent(`stu-${i + 1}`));

    trackReportPrint({
      students,
      settings: { ...baseSettings, term: "First Term", examType: "TERMLY" },
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });
    trackReportPrint({
      students,
      settings: { ...baseSettings, term: "Second Term", examType: "TERMLY" },
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });
    trackReportPrint({
      students,
      settings: { ...baseSettings, term: "Second Term", examType: "MOCK" },
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });

    const generated = getCapturedEvents("Report_Card_Generated");
    expect(generated).toHaveLength(15);
    expect(new Set(generated.map((e) => e.report_key)).size).toBe(15);
  });

  it("excludes demo students from Report_Card_Generated and marks demo telemetry", () => {
    const demoStudents = Array.from({ length: 10 }, (_, i) => makeStudent(`demo-${i + 1}`));

    const demoOnlySummary = trackReportPrint({
      students: demoStudents,
      settings: baseSettings,
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });

    expect(demoOnlySummary).toMatchObject({
      studentsCount: 10,
      realStudentsCount: 0,
      demoStudentsCount: 10,
      newUniqueReportsCount: 0,
      isDemo: true,
      isReprint: false,
    });
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(0);
    expect(getCapturedEvents("Printed_Reports")[0]).toMatchObject({
      demo_students_count: 10,
      real_students_count: 0,
      is_demo: true,
      new_unique_reports_count: 0,
    });

    const mixedSummary = trackReportPrint({
      students: [demoStudents[0], makeStudent("real-1")],
      settings: baseSettings,
      printMode: "bw",
      printScope: "all",
      printChannel: "native_print",
    });

    expect(mixedSummary).toMatchObject({
      studentsCount: 2,
      realStudentsCount: 1,
      demoStudentsCount: 1,
      newUniqueReportsCount: 1,
      isDemo: false,
    });
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(1);
  });

  it("excludes completely unscored students from Report_Card_Generated", () => {
    const unscored = makeStudent("unscored-1", [
      { classScore: 0, examScore: 0 },
      { classScore: 0, examScore: 0 },
    ]);
    const scored = makeStudent("scored-1");

    const summary = trackReportPrint({
      students: [unscored, scored],
      settings: baseSettings,
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });

    expect(summary).toMatchObject({
      studentsCount: 2,
      realStudentsCount: 2,
      readyStudentsCount: 1,
      unscoredStudentsCount: 1,
      newUniqueReportsCount: 1,
    });
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(1);
    expect(getCapturedEvents("Printed_Reports")[0]).toMatchObject({
      unscored_students_count: 1,
      new_unique_reports_count: 1,
    });
  });

  it("supports a one-time partial-to-ready upgrade without double counting total unique reports", () => {
    const partialStudent = makeStudent("stu-upgrade", [
      { classScore: 30, examScore: 40 },
      { classScore: 0, examScore: 0 },
    ]);
    const readyStudent = makeStudent("stu-upgrade", [
      { classScore: 30, examScore: 40 },
      { classScore: 28, examScore: 42 },
    ]);

    const first = trackReportPrint({
      students: [partialStudent],
      settings: baseSettings,
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });
    expect(first).toMatchObject({
      newUniqueReportsCount: 1,
      newUniqueReadyReportsCount: 0,
      isReprint: false,
    });

    const second = trackReportPrint({
      students: [readyStudent],
      settings: baseSettings,
      printMode: "color",
      printScope: "ready_filter",
      printChannel: "native_print",
    });
    expect(second).toMatchObject({
      newUniqueReportsCount: 0,
      newUniqueReadyReportsCount: 1,
      isReprint: false,
    });

    const third = trackReportPrint({
      students: [readyStudent],
      settings: baseSettings,
      printMode: "color",
      printScope: "ready_filter",
      printChannel: "native_print",
    });
    expect(third).toMatchObject({
      newUniqueReportsCount: 0,
      newUniqueReadyReportsCount: 0,
      isReprint: true,
    });

    const generated = getCapturedEvents("Report_Card_Generated");
    expect(generated).toHaveLength(2);
    expect(generated[0]).toMatchObject({
      readiness: "partial",
      is_readiness_upgrade: false,
    });
    expect(generated[1]).toMatchObject({
      report_key: generated[0].report_key,
      readiness: "ready",
      is_readiness_upgrade: true,
    });
  });

  it("falls back to in-memory deduplication when localStorage throws", () => {
    const realStorage = window.localStorage;
    vi.stubGlobal("localStorage", {
      get length() {
        return realStorage.length;
      },
      key: (i: number) => realStorage.key(i),
      getItem: (k: string) => realStorage.getItem(k),
      removeItem: (k: string) => realStorage.removeItem(k),
      clear: () => realStorage.clear(),
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    });

    const student = makeStudent("stu-mem");

    const first = trackReportPrint({
      students: [student],
      settings: baseSettings,
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });
    const second = trackReportPrint({
      students: [student],
      settings: baseSettings,
      printMode: "color",
      printScope: "all",
      printChannel: "native_print",
    });

    expect(first.newUniqueReportsCount).toBe(1);
    expect(second.newUniqueReportsCount).toBe(0);
    expect(second.isReprint).toBe(true);
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(1);
    expect(localStorage.getItem(REPORT_LEDGER_STORAGE_KEY)).toBeNull();
  });

  it("resolves app_env and gates analytics strictly to live production hosts", () => {
    const cases: Array<{
      opts: ResolveAppEnvOptions;
      expectedEnv: "production" | "preview" | "development";
      expectedSend: boolean;
    }> = [
      { opts: { hostname: "repota.app", vercelEnv: "production", isDevBuild: false }, expectedEnv: "production", expectedSend: true },
      { opts: { hostname: "www.repota.app", vercelEnv: "production", isDevBuild: false }, expectedEnv: "production", expectedSend: true },
      { opts: { hostname: "repota.vercel.app", vercelEnv: "production", isDevBuild: false }, expectedEnv: "production", expectedSend: true },
      { opts: { hostname: "repota.app", vercelEnv: "", isDevBuild: false }, expectedEnv: "production", expectedSend: true },
      { opts: { hostname: "repota.vercel.app", vercelEnv: "", isDevBuild: false }, expectedEnv: "production", expectedSend: true },
      { opts: { hostname: "repota-git-feat-x.vercel.app", vercelEnv: "preview", isDevBuild: false }, expectedEnv: "preview", expectedSend: false },
      { opts: { hostname: "repota-git-feat-x.vercel.app", vercelEnv: "", isDevBuild: false }, expectedEnv: "preview", expectedSend: false },
      { opts: { hostname: "repota-abc123-adamtoffic.vercel.app", vercelEnv: "production", isDevBuild: false }, expectedEnv: "preview", expectedSend: false },
      { opts: { hostname: "localhost", vercelEnv: "production", isDevBuild: false }, expectedEnv: "development", expectedSend: false },
      { opts: { hostname: "127.0.0.1", vercelEnv: "", isDevBuild: false }, expectedEnv: "development", expectedSend: false },
      { opts: { hostname: "192.168.1.10", vercelEnv: "", isDevBuild: true }, expectedEnv: "development", expectedSend: false },
      { opts: { hostname: "[::1]", vercelEnv: "", isDevBuild: false }, expectedEnv: "development", expectedSend: false },
    ];

    for (const testCase of cases) {
      const env = resolveAppEnv(testCase.opts);
      expect(env).toBe(testCase.expectedEnv);
      expect(shouldSendAnalytics(env)).toBe(testCase.expectedSend);
    }
  });
});
