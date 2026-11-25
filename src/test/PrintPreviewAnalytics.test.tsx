import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const posthogMock = vi.hoisted(() => ({
  capture: vi.fn(),
}));

const iosInteractionMock = vi.hoisted(() => ({
  isIOSPWA: vi.fn(() => false),
  shouldUseIOSPdfPrintFallback: vi.fn(() => false),
}));

const pdfPrintMock = vi.hoisted(() => ({
  buildPdfFilename: vi.fn(() => "Basic-6-report-cards.pdf"),
  generateReportsPdfFile: vi.fn(),
  sharePdfFile: vi.fn(),
  downloadPdfFile: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
  useSearch: () => ({ id: undefined }),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

vi.mock("../utils/iosInteraction", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/iosInteraction")>();
  return {
    ...actual,
    ...iosInteractionMock,
  };
});

vi.mock("../utils/pdfPrint", () => pdfPrintMock);

import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { PrintPreview } from "../pages/PrintPreview";
import type { ProcessedStudent, SchoolSettings } from "../types";
import { clearReportAnalyticsLedger } from "../utils/reportAnalytics";
import { registerPostHogClient } from "../utils/analytics";

const testSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Test Academy",
  className: "Basic 6",
  level: "JHS",
  defaultSubjects: ["Mathematics", "English"],
  classScoreMax: 50,
  examScoreMax: 50,
  examType: "TERMLY",
};

function makeStudent(id: string, name: string): ProcessedStudent {
  return {
    id,
    name,
    className: "Basic 6",
    gender: "Female",
    subjects: [
      {
        id: `${id}-m`,
        name: "Mathematics",
        classScore: 35,
        examScore: 40,
        totalScore: 75,
        grade: 2,
        remark: "Very Good",
      },
      {
        id: `${id}-e`,
        name: "English",
        classScore: 30,
        examScore: 35,
        totalScore: 65,
        grade: 3,
        remark: "Good",
      },
    ],
    age: 13,
    totalScore: 140,
    averageScore: 70,
    classPosition: "1st",
    aggregate: 10,
  };
}

function makeSchoolContext(students: ProcessedStudent[]): SchoolContextType {
  return {
    students,
    settings: testSettings,
    isDataLoaded: true,
    isStorageReady: true,
    loadStatus: { students: "ok", settings: "ok" },
    loadError: false,
    isPersistenceSuspended: false,
    isRollbackIncomplete: false,
    isSaving: false,
    setSettings: vi.fn(),
    addStudent: vi.fn(),
    deleteStudent: vi.fn(),
    deletePendingStudents: vi.fn(),
    updateStudent: vi.fn(),
    clearAllScores: vi.fn(),
    clearAllStudents: vi.fn(),
    clearStudentScores: vi.fn(),
    removeAllStudentPhotos: vi.fn(),
    resetAllAppData: vi.fn().mockResolvedValue(true),
    loadDemoData: vi.fn(),
    updateClassNameForAll: vi.fn(),
    detectComponentMismatches: () => ({ hasOutdated: false, hasMissing: false }),
    syncSubjectComponentsFromSettings: vi.fn(),
    applySbaConfig: vi.fn(),
    updateAssessmentWeights: vi.fn(),
    checkDuplicateName: vi.fn(() => false),
    restoreDefaults: vi.fn(),
    autoGenerateRemarks: vi.fn(),
    retryLoad: vi.fn(),
    startFresh: vi.fn(),
    suspendPersistence: vi.fn(),
    resumePersistence: vi.fn(),
    markIncompleteRollback: vi.fn(),
    clearIncompleteRollback: vi.fn(),
  };
}

function getCapturedEvents(eventName: string) {
  return posthogMock.capture.mock.calls
    .filter(([name]) => name === eventName)
    .map(([, props]) => props as Record<string, unknown>);
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("PrintPreview confirmed multi-channel analytics", () => {
  const originalPrint = window.print;

  beforeEach(() => {
    vi.clearAllMocks();
    registerPostHogClient(posthogMock);
    localStorage.clear();
    clearReportAnalyticsLedger();
    iosInteractionMock.isIOSPWA.mockReturnValue(false);
    iosInteractionMock.shouldUseIOSPdfPrintFallback.mockReturnValue(false);
  });

  afterEach(() => {
    window.print = originalPrint;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("tracks native Print button confirmation via beforeprint", () => {
    window.print = vi.fn(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    const ctx = makeSchoolContext([makeStudent("s1", "Ama"), makeStudent("s2", "Kofi")]);
    render(
      <SchoolContext.Provider value={ctx}>
        <PrintPreview />
      </SchoolContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Print" }));

    expect(getCapturedEvents("Print_Preview_Opened")).toEqual([
      {
        students_count: 2,
        real_students_count: 2,
        ready_count: 2,
        missing_photos_count: 2,
        print_scope: "all",
        is_demo: false,
        template_id: "original_v1",
        school_level: "JHS",
        school_type: "STANDARD",
      },
    ]);

    expect(window.print).toHaveBeenCalledOnce();
    const generated = getCapturedEvents("Report_Card_Generated");
    expect(generated).toHaveLength(2);
    expect(generated[0]).toMatchObject({ print_channel: "native_print", readiness: "ready" });

    const printed = getCapturedEvents("Printed_Reports");
    expect(printed).toHaveLength(1);
    expect(printed[0]).toMatchObject({
      print_channel: "native_print",
      new_unique_reports_count: 2,
      is_reprint: false,
    });
  });

  it("ignores rapid double clicks within cooldown and marks subsequent prints as reprints", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
    window.print = vi.fn(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    const ctx = makeSchoolContext([makeStudent("s1", "Ama"), makeStudent("s2", "Kofi")]);
    render(
      <SchoolContext.Provider value={ctx}>
        <PrintPreview />
      </SchoolContext.Provider>,
    );

    const printButton = screen.getByRole("button", { name: "Print" });
    fireEvent.click(printButton);
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(getCapturedEvents("Printed_Reports")).toHaveLength(1);
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalledTimes(2);
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(2);
    const printed = getCapturedEvents("Printed_Reports");
    expect(printed).toHaveLength(2);
    expect(printed[1]).toMatchObject({
      print_channel: "native_print",
      new_unique_reports_count: 0,
      is_reprint: true,
    });
  });

  it("tracks desktop keyboard Ctrl+P / beforeprint without button click", () => {
    const ctx = makeSchoolContext([makeStudent("s1", "Ama")]);
    render(
      <SchoolContext.Provider value={ctx}>
        <PrintPreview />
      </SchoolContext.Provider>,
    );

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    const generated = getCapturedEvents("Report_Card_Generated");
    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({ print_channel: "keyboard_print" });

    const printed = getCapturedEvents("Printed_Reports");
    expect(printed).toHaveLength(1);
    expect(printed[0]).toMatchObject({
      print_channel: "keyboard_print",
      new_unique_reports_count: 1,
    });
  });

  it("emits zero events when iOS PWA window.print() fails silently", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
    iosInteractionMock.isIOSPWA.mockReturnValue(true);
    iosInteractionMock.shouldUseIOSPdfPrintFallback.mockReturnValue(false);
    window.print = vi.fn();

    const ctx = makeSchoolContext([makeStudent("s1", "Ama")]);
    render(
      <SchoolContext.Provider value={ctx}>
        <PrintPreview />
      </SchoolContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Print" }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(window.print).toHaveBeenCalledOnce();
    expect(getCapturedEvents("Printed_Reports")).toHaveLength(0);
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(0);
    expect(getCapturedEvents("Ios_Pdf_Fallback_Used")).toHaveLength(0);
  });

  it("tracks iOS 27+ PDF fallback only on share completion or PDF download, never on abort", async () => {
    iosInteractionMock.isIOSPWA.mockReturnValue(true);
    iosInteractionMock.shouldUseIOSPdfPrintFallback.mockReturnValue(true);

    const mockFile = new File(["%PDF-1.4"], "Basic-6-report-cards.pdf", {
      type: "application/pdf",
    });
    pdfPrintMock.generateReportsPdfFile.mockResolvedValue(mockFile);

    const ctx = makeSchoolContext([makeStudent("s1", "Ama")]);

    // 1. Aborted Share Sheet -> zero report generation events, logs fallback outcome
    pdfPrintMock.sharePdfFile.mockResolvedValueOnce("aborted");
    const { unmount } = render(
      <SchoolContext.Provider value={ctx}>
        <PrintPreview />
      </SchoolContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    await flushMicrotasks();

    expect(pdfPrintMock.sharePdfFile).toHaveBeenCalledOnce();
    expect(getCapturedEvents("Printed_Reports")).toHaveLength(0);
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(0);
    expect(getCapturedEvents("Ios_Pdf_Fallback_Used")).toEqual([
      {
        trigger_reason: "ios27_auto",
        outcome: "aborted",
        source: "report_cards",
      },
    ]);
    unmount();

    // 2. Shared via Share Sheet -> ios_pdf_share
    pdfPrintMock.sharePdfFile.mockResolvedValueOnce("shared");
    const sharedRender = render(
      <SchoolContext.Provider value={ctx}>
        <PrintPreview />
      </SchoolContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    await flushMicrotasks();

    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(1);
    expect(getCapturedEvents("Report_Card_Generated")[0]).toMatchObject({
      print_channel: "ios_pdf_share",
    });
    expect(getCapturedEvents("Printed_Reports")[0]).toMatchObject({
      print_channel: "ios_pdf_share",
      new_unique_reports_count: 1,
    });
    expect(getCapturedEvents("Ios_Pdf_Fallback_Used")[1]).toEqual({
      trigger_reason: "ios27_auto",
      outcome: "shared",
      source: "report_cards",
    });
    sharedRender.unmount();

    // 3. Share unsupported -> user clicks Download PDF -> ios_pdf_download
    vi.clearAllMocks();
    clearReportAnalyticsLedger();
    pdfPrintMock.sharePdfFile.mockResolvedValueOnce("unsupported");
    render(
      <SchoolContext.Provider value={ctx}>
        <PrintPreview />
      </SchoolContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    await flushMicrotasks();

    const downloadBtn = await screen.findByRole("button", { name: /download pdf/i });
    fireEvent.click(downloadBtn);

    expect(pdfPrintMock.downloadPdfFile).toHaveBeenCalledWith(mockFile);
    expect(getCapturedEvents("Report_Card_Generated")).toHaveLength(1);
    expect(getCapturedEvents("Report_Card_Generated")[0]).toMatchObject({
      print_channel: "ios_pdf_download",
    });
    expect(getCapturedEvents("Printed_Reports")[0]).toMatchObject({
      print_channel: "ios_pdf_download",
      new_unique_reports_count: 1,
    });
    expect(getCapturedEvents("Ios_Pdf_Fallback_Used")).toEqual([
      {
        trigger_reason: "ios27_auto",
        outcome: "downloaded",
        source: "report_cards",
      },
    ]);
  });
});
