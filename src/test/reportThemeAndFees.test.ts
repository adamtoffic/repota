import { describe, expect, it } from "vitest";
import {
  getActivePrivateFeeItems,
  resolveEditablePrivateFeeItems,
  resolvePositionVisibility,
  syncLegacyFeesFromItems,
} from "../utils/privateSchoolFees";
import {
  getContrastTextColor,
  getReportPalette,
  isValidHexColor,
  mixHex,
} from "../utils/reportTheme";

describe("privateSchoolFees", () => {
  it("migrates legacy fee fields into 3 editable slots when privateFeeItems is undefined", () => {
    const items = resolveEditablePrivateFeeItems({
      schoolGift: 450,
      canteenFees: 15,
      firstAidFees: 0,
    });

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ label: "School Fees", amount: 450, cycle: "Per Term", enabled: true });
    expect(items[1]).toMatchObject({ label: "Canteen Fees", amount: 15, cycle: "Daily", enabled: true });
    expect(items[2]).toMatchObject({ label: "First Aid Fees", amount: 0, cycle: "Per Term", enabled: false });
  });

  it("caps active fee items at 3 and excludes disabled or zero-amount items", () => {
    const active = getActivePrivateFeeItems({
      schoolType: "PRIVATE",
      showFeeSchedule: true,
      privateFeeItems: [
        { id: "1", label: "Tuition", amount: 800, cycle: "Per Term", enabled: true },
        { id: "2", label: "School Bus", amount: 250, cycle: "Per Term", enabled: false },
        { id: "3", label: "ICT & Lab", amount: 120, cycle: "Per Term", enabled: true },
        { id: "4", label: "Extra", amount: 99, cycle: "Per Term", enabled: true },
      ],
    });

    expect(active).toHaveLength(2);
    expect(active.map((i) => i.label)).toEqual(["Tuition", "ICT & Lab"]);
  });

  it("returns no fee items when showFeeSchedule is false or schoolType is not PRIVATE", () => {
    expect(
      getActivePrivateFeeItems({
        schoolType: "STANDARD",
        schoolGift: 500,
      }),
    ).toEqual([]);

    expect(
      getActivePrivateFeeItems({
        schoolType: "PRIVATE",
        showFeeSchedule: false,
        schoolGift: 500,
      }),
    ).toEqual([]);
  });

  it("syncs legacy fee scalars cleanly from enabled items", () => {
    const legacy = syncLegacyFeesFromItems([
      { id: "1", label: "Tuition", amount: 900, cycle: "Per Term", enabled: true },
      { id: "2", label: "Bus", amount: 100, cycle: "Daily", enabled: false },
      { id: "3", label: "Books", amount: 150, cycle: "Per Term", enabled: true },
    ]);

    expect(legacy).toEqual({
      schoolGift: 900,
      canteenFees: undefined,
      firstAidFees: 150,
    });
  });

  it("resolves class and subject position visibility independently while preserving KG defaults", () => {
    expect(resolvePositionVisibility({ level: "PRIMARY" })).toEqual({
      showClassPositionHeader: true,
      showClassPositionSummary: true,
      showSubjectPosition: true,
    });

    expect(resolvePositionVisibility({ level: "KG" })).toEqual({
      showClassPositionHeader: true,
      showClassPositionSummary: false,
      showSubjectPosition: false,
    });

    expect(
      resolvePositionVisibility({
        level: "JHS",
        showClassPosition: false,
        showSubjectPosition: true,
      }),
    ).toEqual({
      showClassPositionHeader: false,
      showClassPositionSummary: false,
      showSubjectPosition: true,
    });

    expect(
      resolvePositionVisibility({
        level: "KG",
        showClassPosition: false,
        showSubjectPosition: true,
      }),
    ).toEqual({
      showClassPositionHeader: false,
      showClassPositionSummary: false,
      showSubjectPosition: true,
    });
  });
});

describe("reportTheme", () => {
  it("validates hex colors and computes high-contrast text colors", () => {
    expect(isValidHexColor("#1e3a8a")).toBe(true);
    expect(isValidHexColor("#FFF")).toBe(false);
    expect(isValidHexColor("blue")).toBe(false);

    expect(getContrastTextColor("#1e3a8a")).toBe("#ffffff");
    expect(getContrastTextColor("#fcd34d")).toBe("#0f172a");
  });

  it("mixes solid hex tints cleanly", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("overrides custom school colors with strict monochrome in B&W print mode", () => {
    const bwPalette = getReportPalette({
      settings: {
        useCustomTemplateColor: true,
        primaryColor: "#881337",
        accentColor: "#f59e0b",
      },
      printMode: "bw",
      defaultPrimary: "#1e3a8a",
    });

    expect(bwPalette.isBW).toBe(true);
    expect(bwPalette.isCustomActive).toBe(false);
    expect(bwPalette.primary).toBe("#000000");
    expect(bwPalette.primarySoft).toBe("#f3f4f6");
  });

  it("uses school custom colors when enabled in color mode", () => {
    const customPalette = getReportPalette({
      settings: {
        useCustomTemplateColor: true,
        primaryColor: "#881337",
        accentColor: "#d97706",
      },
      printMode: "color",
      defaultPrimary: "#1e3a8a",
    });

    expect(customPalette.isCustomActive).toBe(true);
    expect(customPalette.primary).toBe("#881337");
    expect(customPalette.accent).toBe("#d97706");
    expect(customPalette.onPrimary).toBe("#ffffff");
  });
});
