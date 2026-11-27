import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Input } from "../components/ui/Input";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SettingsFormContext, type SettingsFormContextType } from "../context/SettingsFormContextDefinition";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: {
    STUDENTS: "ges_v1_students",
    SETTINGS: "ges_v1_settings",
  },
  getStorageType: vi.fn(() => "indexeddb"),
  subscribeToStorageSync: vi.fn(() => () => {}),
  ...storage,
}));

import { AcademicSessionSection } from "../components/settings/AcademicSessionSection";

describe("Pre-Launch Readiness (Mobile Date Inputs, Unified Settings Labels, and CSP)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders date inputs with block, min-w-0, max-w-full, appearance-none, and text-left classes", () => {
    const { container } = render(
      <Input label="Next Term Begins" type="date" value="2026-09-07" onChange={() => {}} />,
    );
    const wrapper = container.firstElementChild;
    const input = screen.getByLabelText("Next Term Begins");

    expect(wrapper).toHaveClass("min-w-0");
    expect(input).toHaveClass("block", "min-w-0", "max-w-full", "appearance-none", "text-left");
  });

  it("normalizes native WebKit date inputs and mobile tap targets in src/index.css", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "src/index.css"), "utf8");
    expect(css).toContain('input[type="date"]');
    expect(css).toContain("-webkit-appearance: none;");
    expect(css).toContain("::-webkit-date-and-time-value");
    expect(css).toContain("text-align: left;");
    expect(css).toContain("min-height: 2.75rem;");
  });

  it("renders AcademicSessionSection with accessible Next Term Begins date input and unified Select for Term / Semester", async () => {
    const setFormData = vi.fn();
    const schoolCtx: SchoolContextType = {
      students: [],
      settings: DEFAULT_SETTINGS,
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
      updateClassNameForAll: vi.fn(),
      clearAllStudents: vi.fn(),
      restoreDefaults: vi.fn(),
      resetAllAppData: vi.fn(),
      deleteAllStudentPhotos: vi.fn(),
      loadDemoData: vi.fn(),
      generateAllRemarks: vi.fn(() => 0),
      updateAssessmentWeights: vi.fn(() => DEFAULT_SETTINGS),
      retryLoad: vi.fn(async () => {}),
      startFreshAfterLoadError: vi.fn(async () => {}),
      suspendPersistence: vi.fn(),
      resumePersistence: vi.fn(),
      markIncompleteRollback: vi.fn(),
      clearIncompleteRollback: vi.fn(),
      waitForMigration: vi.fn(async () => {}),
    };

    const formCtx: SettingsFormContextType = {
      formData: { ...DEFAULT_SETTINGS, nextTermStarts: "2027-01-12" },
      setFormData,
      committedSchoolName: DEFAULT_SETTINGS.schoolName,
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      isPersistenceSuspended: false,
      handleLevelChange: vi.fn(),
      handleClassNameBlur: vi.fn(),
      flushPendingSave: vi.fn(),
      syncCommittedSettings: vi.fn(),
      newSubject: "",
      setNewSubject: vi.fn(),
      addSubject: vi.fn(),
      removeSubject: vi.fn(),
      isBiometricSupported: false,
      isBiometricEnrolled: false,
      isPinEnabled: false,
      biometricName: "Biometrics",
      showPinSetup: false,
      setShowPinSetup: vi.fn(),
      showPinRecovery: false,
      setShowPinRecovery: vi.fn(),
      handleDisablePin: vi.fn(),
      handleToggleBiometric: vi.fn(),
      handleClearAllStudentsClick: vi.fn(),
      handleFactoryResetClick: vi.fn(),
      handleFullAppResetClick: vi.fn(),
      handleLogoUpload: vi.fn(),
      handleHeadSignatureUpload: vi.fn(),
      handleTeacherSignatureUpload: vi.fn(),
      handleResetDefaults: vi.fn(),
      hasSignature: false,
      canUseCustomBrandColor: true,
      feeValidationErrors: {},
      feeRowRefs: { current: {} },
      handleToggleSchoolType: vi.fn(),
      handleAddFeeItem: vi.fn(),
      handleUpdateFeeItem: vi.fn(),
      handleRemoveFeeItem: vi.fn(),
    };

    const rootRoute = createRootRoute({ component: () => <Outlet /> });
    const academicRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/settings/academic",
      component: () => (
        <SchoolContext.Provider value={schoolCtx}>
          <SettingsFormContext.Provider value={formCtx}>
            <AcademicSessionSection />
          </SettingsFormContext.Provider>
        </SchoolContext.Provider>
      ),
    });
    const sbaRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/sba",
      component: () => null,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([academicRoute, sbaRoute]),
      history: createMemoryHistory({ initialEntries: ["/settings/academic"] }),
    });

    render(<RouterProvider router={router} />);

    const dateInput = await screen.findByLabelText("Next Term Begins");
    const termSelect = screen.getByLabelText("Term / Semester");

    expect(dateInput).toHaveAttribute("type", "date");
    expect(dateInput).toHaveValue("2027-01-12");
    expect(dateInput).toHaveClass("block", "min-w-0", "max-w-full", "appearance-none");
    expect(termSelect.tagName).toBe("SELECT");
    expect(termSelect).toHaveClass("min-w-0", "max-w-full");

    fireEvent.change(dateInput, { target: { value: "2027-01-18" } });
    expect(setFormData).toHaveBeenCalled();
  });

  it("enforces Content-Security-Policy in vercel.json matching both LF and CRLF SHA-256 hashes of index.html inline boot script", () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as {
      headers: Array<{
        source: string;
        headers: Array<{ key: string; value: string }>;
      }>;
    };

    const indexHtml = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");
    const scriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();

    const rawScript = scriptMatch![1];
    const lfScript = rawScript.replace(/\r\n/g, "\n");
    const crlfScript = lfScript.replace(/\n/g, "\r\n");
    const lfHash = `sha256-${crypto.createHash("sha256").update(lfScript).digest("base64")}`;
    const crlfHash = `sha256-${crypto.createHash("sha256").update(crlfScript).digest("base64")}`;

    const rootHeaders = vercelConfig.headers.find((rule) => rule.source === "/(.*)")?.headers ?? [];
    const csp = rootHeaders.find((h) => h.key === "Content-Security-Policy")?.value;

    expect(csp).toBeTruthy();
    expect(csp).toContain(`'${lfHash}'`);
    expect(csp).toContain(`'${crlfHash}'`);
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
