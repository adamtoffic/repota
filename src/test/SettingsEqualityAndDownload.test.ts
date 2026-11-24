import { describe, expect, it, vi } from "vitest";
import { DEFAULT_FACTORY_SETTINGS } from "../constants/defaultSettings";
import type { SchoolSettings, StudentRecord } from "../types";
import { DEMO_STUDENT_PREFIX, createDemoStudents } from "../utils/demoData";
import { downloadBlob } from "../utils/fileDownload";
import { applyAutoRemarksToStudents } from "../utils/remarksBatch";
import { areSettingsEqual } from "../utils/settingsEquality";

describe("Branch 4 settings equality, shared blob download, demoData, and remarksBatch", () => {
  it("compares SchoolSettings structurally without JSON.stringify allocation", () => {
    const base: SchoolSettings = {
      ...DEFAULT_FACTORY_SETTINGS,
      schoolName: "Accra Academy",
      logoUrl: "data:image/png;base64,HUGE_LOGO_PAYLOAD",
      defaultSubjects: ["Mathematics", "English"],
      subjectComponentMap: {
        Mathematics: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
      },
      privateFeeItems: [{ id: "f1", label: "Tuition", amount: 500, cycle: "Term", enabled: true }],
    };

    const cloned: SchoolSettings = {
      ...base,
      defaultSubjects: ["Mathematics", "English"],
      subjectComponentMap: {
        Mathematics: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
      },
      privateFeeItems: [{ id: "f1", label: "Tuition", amount: 500, cycle: "Term", enabled: true }],
    };

    expect(areSettingsEqual(base, base)).toBe(true);
    expect(areSettingsEqual(base, cloned)).toBe(true);
    expect(areSettingsEqual(base, { ...cloned, schoolName: "Other School" })).toBe(false);
    expect(areSettingsEqual(base, { ...cloned, defaultSubjects: ["Mathematics", "Science"] })).toBe(
      false,
    );
    expect(
      areSettingsEqual(base, {
        ...cloned,
        subjectComponentMap: { Mathematics: [{ name: "CAT 1", maxScore: 20, category: "CAT" }] },
      }),
    ).toBe(false);
  });

  it("defers URL.revokeObjectURL by 1000ms in downloadBlob for iOS WebKit safety", () => {
    vi.useFakeTimers();
    try {
      const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:ios-safe-test");
      const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      downloadBlob(new Blob(["hello"], { type: "text/plain" }), "notes.txt");

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(999);
      expect(revokeSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(revokeSpy).toHaveBeenCalledWith("blob:ios-safe-test");
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it("generates prefixed demo students and batch-populates unique teacher remarks", async () => {
    const settings: SchoolSettings = {
      ...DEFAULT_FACTORY_SETTINGS,
      className: "Basic 5",
      level: "PRIMARY",
      defaultSubjects: ["Mathematics", "English"],
      subjectComponentMap: {
        Mathematics: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
      },
    };

    const demoStudents = createDemoStudents(settings);
    expect(demoStudents).toHaveLength(10);
    expect(demoStudents.every((s) => s.id.startsWith(DEMO_STUDENT_PREFIX))).toBe(true);
    expect(demoStudents[0].subjects[0].classScoreComponents?.[0]?.name).toBe("CAT 1");

    const baseStudents: StudentRecord[] = demoStudents.slice(0, 3).map((s) => ({
      ...s,
      teacherRemark: undefined,
      conduct: undefined,
      interest: undefined,
    }));

    const progressCalls: Array<[number, number]> = [];
    const remarked = applyAutoRemarksToStudents(baseStudents, settings, (current, total) => {
      progressCalls.push([current, total]);
    });

    await Promise.resolve();

    expect(remarked).toHaveLength(3);
    remarked.forEach((student) => {
      expect(student.teacherRemark?.length).toBeGreaterThan(0);
      expect(student.conduct?.length).toBeGreaterThan(0);
      expect(student.interest?.length).toBeGreaterThan(0);
    });
    expect(progressCalls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
});
