import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SchoolSettings, StudentRecord } from "../types";

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
}));

const html2canvasMock = vi.hoisted(() => vi.fn());
const jsPdfInstances = vi.hoisted(
  () =>
    [] as Array<{
      addPage: ReturnType<typeof vi.fn>;
      addImage: ReturnType<typeof vi.fn>;
      output: ReturnType<typeof vi.fn>;
    }>,
);

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: {
    STUDENTS: "ges_v1_students",
    SETTINGS: "ges_v1_settings",
  },
  getStorageType: vi.fn(() => "indexeddb"),
  ...storage,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
  getTimeSinceBackup: vi.fn(() => null),
}));

vi.mock("html2canvas-pro", () => ({
  default: html2canvasMock,
}));

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(function MockJsPdf() {
    const instance = {
      addPage: vi.fn(),
      addImage: vi.fn(),
      output: vi.fn(() => new Blob(["mock-pdf"], { type: "application/pdf" })),
    };
    jsPdfInstances.push(instance);
    return instance;
  }),
}));

import { SchoolProvider } from "../context/SchoolContext";
import { ThemeProvider } from "../context/ThemeContext";
import { useTheme } from "../hooks/useTheme";
import { createAppRouter } from "../router";
import { setUnsavedChanges } from "../utils/preloadErrorHandler";
import { generateBlocksPdfFile, generateReportsPdfFile } from "../utils/pdfPrint";
import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  normalizeChartSvgForLightExport,
  readStoredThemePreference,
  resolveTheme,
  saveThemePreference,
} from "../utils/theme";

const seededSettings: SchoolSettings = {
  schoolName: "Seeded Academy",
  academicYear: "2030/2031",
  term: "Second Term",
  level: "JHS",
  defaultSubjects: ["English", "Mathematics"],
  totalAttendanceDays: 90,
  classScoreMax: 50,
  examScoreMax: 50,
  classSize: 42,
  nextTermStarts: "2031-01-10",
  headTeacherName: "Head Teacher",
  classTeacherName: "Class Teacher",
  className: "JHS 2",
  phoneNumber: "0240000000",
  address: "Seeded Location",
  email: "seeded@example.com",
  schoolMotto: "Learn and Lead",
  logoUrl: "",
  headTeacherSignature: "",
  teacherSignature: "",
  schoolType: "STANDARD",
  examType: "TERMLY",
  componentLibrary: [],
  subjectComponentMap: {},
};

const seededStudents: StudentRecord[] = [
  {
    id: "student-1",
    name: "Ama Mensah",
    className: "JHS 2",
    gender: "Female",
    subjects: [
      {
        id: "sub-1",
        name: "English",
        classScore: 40,
        examScore: 42,
        totalScore: 82,
        grade: 1,
        remark: "Highest",
      },
      {
        id: "sub-2",
        name: "Mathematics",
        classScore: 38,
        examScore: 40,
        totalScore: 78,
        grade: 2,
        remark: "Higher",
      },
    ],
  },
];

function createControllableMatchMedia(initialDark = false) {
  let darkMatches = initialDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mockFn = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" ? darkMatches : false,
    media: query,
    onchange: null,
    addEventListener: (_event: string, cb: (event: MediaQueryListEvent) => void) => {
      if (query === "(prefers-color-scheme: dark)") listeners.add(cb);
    },
    removeEventListener: (_event: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    },
    addListener: (cb: (event: MediaQueryListEvent) => void) => {
      if (query === "(prefers-color-scheme: dark)") listeners.add(cb);
    },
    removeListener: (cb: (event: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    },
    dispatchEvent: vi.fn(),
  }));

  const setDarkMatches = (nextDark: boolean) => {
    darkMatches = nextDark;
    const event = {
      matches: nextDark,
      media: "(prefers-color-scheme: dark)",
    } as MediaQueryListEvent;
    listeners.forEach((cb) => cb(event));
  };

  return { mockFn, setDarkMatches };
}

async function flushHydrationAndImports() {
  await act(async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await vi.dynamicImportSettled();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function renderThemedApp(initialPath: string) {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createAppRouter(history);

  const utils = render(
    <ThemeProvider>
      <SchoolProvider>
        <RouterProvider router={router} />
      </SchoolProvider>
    </ThemeProvider>,
  );

  return { ...utils, router };
}

describe("Theme system and Dark Mode invariants", () => {
  const originalMatchMedia = window.matchMedia;
  const originalImage = globalThis.Image;

  beforeAll(async () => {
    await Promise.all([
      import("../pages/settings/SettingsHub"),
      import("../pages/PrintPreview"),
    ]);
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setUnsavedChanges(false);

    storage.initStorage.mockReset();
    storage.loadFromStorage.mockReset();
    storage.loadFromStorageResult.mockReset();
    storage.saveToStorage.mockReset();
    storage.migrateFromLocalStorage.mockReset();
    storage.createBackupHeartbeat.mockReset();

    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: true, studentsCount: 0 });
    storage.saveToStorage.mockResolvedValue(true);
    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: seededStudents };
      }
      if (key === "ges_v1_settings") {
        return { status: "found", value: seededSettings };
      }
      return { status: "empty" };
    });

    html2canvasMock.mockReset();
    jsPdfInstances.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
    globalThis.Image = originalImage;
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    delete document.documentElement.dataset.theme;
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Theme utilities (src/utils/theme.ts)", () => {
    it("defaults to system when unset or invalid and resolves OS preference cleanly", () => {
      expect(readStoredThemePreference()).toBe("system");

      localStorage.setItem(THEME_STORAGE_KEY, "sepia");
      expect(readStoredThemePreference()).toBe("system");

      expect(resolveTheme("system", "dark")).toBe("dark");
      expect(resolveTheme("system", "light")).toBe("light");
      expect(resolveTheme("light", "dark")).toBe("light");
      expect(resolveTheme("dark", "light")).toBe("dark");
    });

    it("persists device-local repota_theme only and syncs document + theme-color meta", () => {
      expect(LIGHT_THEME_COLOR).toBe("#FFFFFF");
      expect(DARK_THEME_COLOR).toBe("#090C12");

      const meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      meta.setAttribute("content", LIGHT_THEME_COLOR);
      document.head.appendChild(meta);

      const resolvedDark = saveThemePreference("dark");
      expect(resolvedDark).toBe("dark");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
      expect(localStorage.getItem("ges_v1_settings")).toBeNull();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(meta.getAttribute("content")).toBe("#090C12");

      applyThemeToDocument("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(meta.getAttribute("content")).toBe("#FFFFFF");
    });
  });

  describe("ThemeProvider and useTheme", () => {
    it("follows OS matchMedia changes in system mode and ignores them when explicit", () => {
      const { mockFn, setDarkMatches } = createControllableMatchMedia(false);
      window.matchMedia = mockFn;

      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      });

      expect(result.current.preference).toBe("system");
      expect(result.current.resolvedTheme).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      act(() => {
        setDarkMatches(true);
      });
      expect(result.current.resolvedTheme).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      act(() => {
        result.current.setTheme("light");
      });
      expect(result.current.preference).toBe("light");
      expect(result.current.resolvedTheme).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      act(() => {
        setDarkMatches(false);
        setDarkMatches(true);
      });
      expect(result.current.resolvedTheme).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("provides a working fallback when useTheme is called outside ThemeProvider", () => {
      const { mockFn } = createControllableMatchMedia(false);
      window.matchMedia = mockFn;

      const { result } = renderHook(() => useTheme());
      expect(result.current.preference).toBe("system");
      expect(result.current.resolvedTheme).toBe("light");

      act(() => {
        result.current.setTheme("dark");
      });
      expect(result.current.preference).toBe("dark");
      expect(result.current.resolvedTheme).toBe("dark");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    });
  });

  describe("SettingsHub Appearance card & Privacy invariant", () => {
    it("switches theme via System/Light/Dark controls and keeps data-record strictly on static labels", async () => {
      const { mockFn } = createControllableMatchMedia(false);
      window.matchMedia = mockFn;

      renderThemedApp("/settings");
      await flushHydrationAndImports();

      const heading = await screen.findByRole("heading", { name: "Appearance" });
      expect(heading).toHaveAttribute("data-record", "true");

      const group = screen.getByRole("group", { name: "Appearance theme" });
      const systemBtn = within(group).getByRole("button", { name: "System" });
      const lightBtn = within(group).getByRole("button", { name: "Light" });
      const darkBtn = within(group).getByRole("button", { name: "Dark" });

      expect(systemBtn).toHaveAttribute("data-record", "true");
      expect(lightBtn).toHaveAttribute("data-record", "true");
      expect(darkBtn).toHaveAttribute("data-record", "true");
      expect(systemBtn).toHaveAttribute("aria-pressed", "true");

      // Committed school name (sidebar + PageHeader) must never opt into telemetry recording
      const schoolBanners = screen.getAllByText("Seeded Academy");
      expect(schoolBanners.length).toBeGreaterThanOrEqual(1);
      schoolBanners.forEach((banner) => {
        expect(banner.closest("[data-record='true']")).toBeNull();
      });

      fireEvent.click(darkBtn);

      expect(darkBtn).toHaveAttribute("aria-pressed", "true");
      expect(systemBtn).toHaveAttribute("aria-pressed", "false");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
      expect(localStorage.getItem("ges_v1_settings")).toBeNull();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Paper & Export Light Isolation", () => {
    it("keeps PrintPreview report cards isolated to white paper while dark mode is active", async () => {
      const { mockFn } = createControllableMatchMedia(false);
      window.matchMedia = mockFn;
      saveThemePreference("dark");

      const { container } = renderThemedApp("/print");
      await flushHydrationAndImports();

      expect(document.documentElement.classList.contains("dark")).toBe(true);

      const card = container.querySelector<HTMLElement>('[data-pdf-card="true"]');
      expect(card).not.toBeNull();
      expect(card).toHaveAttribute("data-paper-surface", "true");
      expect(card?.className).toContain("bg-white");
      expect(card?.className).toContain("text-black");
    });

    it("normalizes dark-mode chart SVG colors back to light ink for PNG/PDF exports", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      gridLine.setAttribute("stroke", "#20293a");
      const legacyGrid = document.createElementNS("http://www.w3.org/2000/svg", "line");
      legacyGrid.setAttribute("stroke", "#334155");
      const axisText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      axisText.setAttribute("fill", "#8b98b0");
      const legendLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      legendLabel.style.fill = "#e2e8f0";
      const dataBar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      dataBar.setAttribute("fill", "#3b82f6");

      svg.append(gridLine, legacyGrid, axisText, legendLabel, dataBar);
      normalizeChartSvgForLightExport(svg);

      expect(gridLine.getAttribute("stroke")).toBe("#e5e7eb");
      expect(legacyGrid.getAttribute("stroke")).toBe("#e5e7eb");
      expect(axisText.getAttribute("fill")).toBe("#6b7280");
      expect(legendLabel.style.fill).toBe("#374151");
      expect(dataBar.getAttribute("fill")).toBe("#3b82f6");
    });

    it("forces light-paper document cloning in generateReportsPdfFile and generateBlocksPdfFile while dark mode is active", async () => {
      saveThemePreference("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // Ensure preloadImage resolves immediately in Happy-DOM without a static server
      class ImmediateMockImage {
        complete = true;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          this.onload?.();
        }
      }
      globalThis.Image = ImmediateMockImage as unknown as typeof Image;

      const clonedDocsChecked: Array<{ hasDark: boolean; colorScheme: string }> = [];

      html2canvasMock.mockImplementation(
        async (
          _el: HTMLElement,
          opts: {
            backgroundColor?: string;
            onclone?: (doc: Document) => void;
          },
        ) => {
          expect(opts.backgroundColor).toBe("#ffffff");

          const clonedDoc = document.implementation.createHTMLDocument("clone");
          clonedDoc.documentElement.classList.add("dark");
          clonedDoc.documentElement.style.colorScheme = "dark";
          opts.onclone?.(clonedDoc);

          clonedDocsChecked.push({
            hasDark: clonedDoc.documentElement.classList.contains("dark"),
            colorScheme: clonedDoc.documentElement.style.colorScheme,
          });

          return {
            width: 800,
            height: 600,
            toDataURL: () => "data:image/jpeg;base64,stub",
          } as unknown as HTMLCanvasElement;
        },
      );

      const reportContainer = document.createElement("div");
      const pdfCard = document.createElement("div");
      pdfCard.dataset.pdfCard = "true";
      pdfCard.dataset.paperSurface = "true";
      const sheet = document.createElement("div");
      sheet.className = "report-page";
      pdfCard.appendChild(sheet);
      reportContainer.appendChild(pdfCard);

      const reportPdf = await generateReportsPdfFile(reportContainer, { filename: "reports.pdf" });
      expect(reportPdf.name).toBe("reports.pdf");

      const analyticsBlock = document.createElement("section");
      Object.defineProperty(analyticsBlock, "offsetHeight", { configurable: true, value: 400 });
      Object.defineProperty(analyticsBlock, "offsetWidth", { configurable: true, value: 800 });
      const blockSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const darkLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      darkLine.setAttribute("stroke", "#334155");
      blockSvg.appendChild(darkLine);
      analyticsBlock.appendChild(blockSvg);

      const analyticsPdf = await generateBlocksPdfFile([analyticsBlock], {
        filename: "analytics.pdf",
      });
      expect(analyticsPdf.name).toBe("analytics.pdf");

      expect(clonedDocsChecked).toHaveLength(2);
      expect(clonedDocsChecked).toEqual([
        { hasDark: false, colorScheme: "light" },
        { hasDark: false, colorScheme: "light" },
      ]);

      // Live dark mode on the main document remains active after off-screen export
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});
