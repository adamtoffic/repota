import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to?: string }) => (
    <a href={to || "#"} {...props}>
      {children}
    </a>
  ),
  useSearch: () => ({ id: "nonexistent-id" }),
}));

import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { usePdfShareFlow } from "../hooks/usePdfShareFlow";
import { PrintPreview } from "../pages/PrintPreview";
import { ClassicTemplate } from "../templates/ClassicTemplate";
import { HeritageTemplate } from "../templates/HeritageTemplate";
import { MinimalTemplate } from "../templates/MinimalTemplate";
import { ModernTemplate } from "../templates/ModernTemplate";
import { OriginalTemplate } from "../templates/OriginalTemplate";
import { TEMPLATE_REGISTRY } from "../templates/registry";
import { ScholarTemplate } from "../templates/ScholarTemplate";
import type { ProcessedStudent, ProcessedSubject, SchoolSettings } from "../types";
import { shouldUseIOSPdfPrintFallback } from "../utils/iosInteraction";
import {
  buildStageIgnoreElements,
  downloadPdfFile,
  resolvePdfCaptureScale,
} from "../utils/pdfPrint";
import { buildTemplatePreviewStudent } from "../utils/templatePreviewData";

function makeSubjects(count: number): ProcessedSubject[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `sub-${idx + 1}`,
    name: `Subject ${idx + 1}`,
    classScore: 36,
    examScore: 42,
    totalScore: 78,
    grade: 2,
    remark: "Proficient",
    subjectPosition: "2nd",
  }));
}

function makeStudent(overrides: Partial<ProcessedStudent> = {}): ProcessedStudent {
  const subjects = overrides.subjects ?? makeSubjects(6);
  return {
    id: "stu-wave3-1",
    name: "Kwame Boateng",
    className: "Basic 5",
    gender: "Male",
    age: 11,
    attendancePresent: undefined,
    conduct: "Diligent",
    interest: "Science",
    teacherRemark: "",
    promotionStatus: "Promoted to Basic 6",
    feeArrears: 250,
    totalScore: subjects.length * 78,
    averageScore: 78,
    classPosition: "3rd",
    aggregate: 9,
    ...overrides,
    subjects,
  };
}

const baseSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Sunrise Model School",
  schoolType: "PRIVATE",
  level: "PRIMARY",
  className: "Basic 5A",
  classScoreMax: 40,
  examScoreMax: 60,
  totalAttendanceDays: 65,
  nextTermStarts: "2026-09-07",
  showStudentFeeArrearsOnReport: true,
  showFeeSchedule: true,
  privateFeeItems: [
    { id: "fee-1", label: "Tuition", amount: 600, cycle: "Per Term", enabled: true },
  ],
};

function makeSchoolContext(students: ProcessedStudent[]): SchoolContextType {
  return {
    students,
    settings: baseSettings,
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

describe("Wave 3: Print Engine, PDF Memory & Cross-Template Parity", () => {
  const originalNavigator = window.navigator;

  afterEach(() => {
    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("P0-6: pdfPrint stage isolation, dynamic scale & iOS PWA download", () => {
    const setUA = (ua: string, standalone = false) => {
      Object.defineProperty(window, "navigator", {
        configurable: true,
        value: {
          userAgent: ua,
          platform: ua.includes("iPhone") ? "iPhone" : "Win32",
          maxTouchPoints: ua.includes("iPhone") ? 5 : 0,
          standalone,
        },
      });
    };

    it("caps html2canvas scale dynamically by device and batch size", () => {
      setUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
      expect(resolvePdfCaptureScale(1)).toBe(2);
      expect(resolvePdfCaptureScale(15)).toBe(2);
      expect(resolvePdfCaptureScale(40)).toBe(1.5);

      setUA(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        true,
      );
      expect(resolvePdfCaptureScale(1)).toBe(1.75);
      expect(resolvePdfCaptureScale(15)).toBe(1.5);
      expect(resolvePdfCaptureScale(40)).toBe(1.25);
    });

    it("buildStageIgnoreElements ignores #root and body siblings while keeping the stage", () => {
      const rootEl = document.createElement("div");
      rootEl.id = "root";
      const stage = document.createElement("div");
      const stageChild = document.createElement("span");
      stage.appendChild(stageChild);
      const siblingOverlay = document.createElement("div");
      const styleTag = document.createElement("style");

      document.body.append(rootEl, stage, siblingOverlay, styleTag);
      try {
        const shouldIgnore = buildStageIgnoreElements(stage);
        expect(shouldIgnore(rootEl)).toBe(true);
        expect(shouldIgnore(siblingOverlay)).toBe(true);
        expect(shouldIgnore(styleTag)).toBe(false);
        expect(shouldIgnore(stage)).toBe(false);
        expect(shouldIgnore(stageChild)).toBe(false);
      } finally {
        rootEl.remove();
        stage.remove();
        siblingOverlay.remove();
        styleTag.remove();
      }
    });

    it("downloadPdfFile opens in a separate viewer window inside iOS standalone PWAs", () => {
      setUA(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
        true,
      );
      const createObjectUrlSpy = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:https://repota.app/fake-pdf");
      const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
      const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);

      const file = new File([new Uint8Array([37, 80, 68, 70])], "reports.pdf", {
        type: "application/pdf",
      });
      downloadPdfFile(file);

      expect(createObjectUrlSpy).toHaveBeenCalledWith(file);
      expect(openSpy).toHaveBeenCalledWith(
        "blob:https://repota.app/fake-pdf",
        "_blank",
        "noopener,noreferrer",
      );
      expect(revokeSpy).not.toHaveBeenCalled();
    });
  });

  describe("P0-12: iOS standalone detection without Version/ & visibilitychange watchdog", () => {
    it("enables PDF fallback for standalone iOS PWAs whose UA omits the Version/ token", () => {
      Object.defineProperty(window, "navigator", {
        configurable: true,
        value: {
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
          platform: "iPhone",
          maxTouchPoints: 5,
          standalone: true,
        },
      });
      expect(shouldUseIOSPdfPrintFallback()).toBe(true);
    });

    it("shows fallback notice when native print never fires and cancels watchdog on visibilitychange", () => {
      vi.useFakeTimers();
      Object.defineProperty(window, "navigator", {
        configurable: true,
        value: {
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
          platform: "iPhone",
          maxTouchPoints: 5,
          standalone: true,
        },
      });

      const { result } = renderHook(() =>
        usePdfShareFlow({
          cacheKey: "k1",
          totalCount: 1,
          buildPdf: vi.fn(),
        }),
      );

      act(() => {
        result.current.runPrintOrPdfFallback(() => {});
      });
      act(() => {
        vi.advanceTimersByTime(1600);
      });
      expect(result.current.showFallbackNotice).toBe(true);

      // Now verify visibilitychange (document.hidden = true) suppresses fallback notice
      let hidden = false;
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => hidden,
      });

      act(() => {
        result.current.dismissFallbackNotice();
      });
      expect(result.current.showFallbackNotice).toBe(false);

      act(() => {
        result.current.runPrintOrPdfFallback(() => {});
        hidden = true;
        document.dispatchEvent(new Event("visibilitychange"));
        vi.advanceTimersByTime(1600);
      });
      expect(result.current.showFallbackNotice).toBe(false);
    });
  });

  describe("P0-7, P0-8, P0-11: Template layout positioning & 3-tier A4 density", () => {
    it("OriginalTemplate root has relative positioning and puts density padding on <td>, not <tr>", () => {
      const student = makeStudent({ subjects: makeSubjects(6) });
      const { container } = render(
        <OriginalTemplate student={student} settings={baseSettings} printMode="color" />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass("relative");
      expect(root).toHaveClass("report-page");

      const bodyRows = container.querySelectorAll("tbody tr");
      expect(bodyRows.length).toBeGreaterThanOrEqual(6);
      bodyRows.forEach((tr) => {
        expect(tr.className).not.toMatch(/\bpy-(?:0\.5|1|1\.5)\b/);
      });
      const firstCells = bodyRows[0].querySelectorAll("td");
      expect(firstCells[0].className).toMatch(/\bpy-3\b/);
    });

    it("Classic, Modern, and Minimal tighten vertical density when subject count exceeds 12", () => {
      const sparse = makeStudent({ subjects: makeSubjects(5) });
      const dense = makeStudent({ subjects: makeSubjects(15) });

      for (const Component of [ClassicTemplate, ModernTemplate, MinimalTemplate]) {
        const { container: sparseDom, unmount: unmountSparse } = render(
          <Component student={sparse} settings={baseSettings} printMode="color" />,
        );
        const sparseCell = sparseDom.querySelector("tbody tr td") as HTMLElement;
        expect(sparseCell.className).toMatch(/\bpy-(?:1\.5|2)\b/);
        unmountSparse();

        const { container: denseDom, unmount: unmountDense } = render(
          <Component student={dense} settings={baseSettings} printMode="color" />,
        );
        const denseCell = denseDom.querySelector("tbody tr td") as HTMLElement;
        expect(denseCell.className).toMatch(/\bpy-0\.5\b/);
        unmountDense();
      }
    });
  });

  describe("P1-23 / P2-1..8: Cross-template fidelity, contrast, Islamic support & invalid ?id=", () => {
    it.each(TEMPLATE_REGISTRY)(
      "$name ($id) uses '-' for missing attendance, never fabricates praise, avoids red arrears in B&W, and uses 296.5mm print height",
      ({ component: TemplateComponent }) => {
        const student = makeStudent({ attendancePresent: undefined, teacherRemark: "" });
        const { container } = render(
          <TemplateComponent student={student} settings={baseSettings} printMode="bw" />,
        );

        const text = container.textContent || "";
        expect(text).toMatch(/-\s*(?:\/|out of)\s*65/);
        expect(text).not.toMatch(/0\s*(?:\/|out of)\s*65/);
        expect(text).not.toMatch(
          /Good progress this term|diligent learner|Consistent engagement|satisfactory progress|Steady academic progress/i,
        );

        expect(container.innerHTML).toContain("print:h-[296.5mm]");
        expect(container.innerHTML).not.toContain("text-red-");
      },
    );

    it("Classic, Modern, and Minimal render the Bismillah header for ISLAMIC schools", () => {
      const islamicSettings: SchoolSettings = { ...baseSettings, schoolType: "ISLAMIC" };
      const student = makeStudent();

      for (const Component of [ClassicTemplate, ModernTemplate, MinimalTemplate]) {
        const { unmount } = render(
          <Component student={student} settings={islamicSettings} printMode="color" />,
        );
        expect(screen.getByText("بسم الله الرحمن الرحيم")).toBeInTheDocument();
        unmount();
      }
    });

    it("Heritage and Scholar lock A4 grid columns without sm: breakpoint overrides", () => {
      const student = makeStudent();
      for (const Component of [HeritageTemplate, ScholarTemplate]) {
        const { container } = render(
          <Component student={student} settings={baseSettings} printMode="color" />,
        );
        expect(container.innerHTML).not.toContain("sm:grid-cols-");
      }
    });

    it("ModernTemplate omits hardcoded text-white when a light custom primary color is active", () => {
      const customLightSettings: SchoolSettings = {
        ...baseSettings,
        useCustomTemplateColor: true,
        primaryColor: "#fcd34d",
        accentColor: "#1e3a8a",
      };
      const student = makeStudent();
      render(
        <ModernTemplate student={student} settings={customLightSettings} printMode="color" />,
      );

      const aggregateCard = screen.getByText("Aggregate").closest("div");
      expect(aggregateCard).toBeInTheDocument();
      expect(aggregateCard).not.toHaveClass("text-white");
    });

    it("buildTemplatePreviewStudent adapts scores and aggregate to level & examType", () => {
      const kgMockStudent = buildTemplatePreviewStudent({
        ...baseSettings,
        level: "KG",
        examType: "MOCK",
      });
      expect(kgMockStudent.aggregate).toBeNull();
      expect(kgMockStudent.subjects[0].classScore).toBe(0);
      expect(kgMockStudent.subjects[0].examScore).toBe(90);

      const termlyStudent = buildTemplatePreviewStudent({
        ...baseSettings,
        level: "JHS",
        examType: "TERMLY",
        classScoreMax: 50,
        examScoreMax: 50,
      });
      expect(termlyStudent.aggregate).toBe(7);
      expect(termlyStudent.subjects[0].classScore).toBe(45);
      expect(termlyStudent.subjects[0].examScore).toBe(45);
    });

    it("PrintPreview renders Student Report Not Found with View All Report Cards link on invalid ?id=", () => {
      const existingStudent = makeStudent({ id: "stu-real", name: "Ama Serwaa" });
      render(
        <SchoolContext.Provider value={makeSchoolContext([existingStudent])}>
          <PrintPreview />
        </SchoolContext.Provider>,
      );

      expect(screen.getByText("Student Report Not Found")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "View All Report Cards" })).toBeInTheDocument();
    });
  });
});
