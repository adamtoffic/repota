import type { PrivateFeeItem, SchoolSettings } from "../types";

export const MAX_PRIVATE_FEE_ITEMS = 3;

export const DEFAULT_PAYMENT_NOTE =
  "All fees must be paid on or before the beginning of the term. Please present this bill when making payment and demand an official receipt.";

export const DEFAULT_PRIVATE_FEE_SLOTS: PrivateFeeItem[] = [
  {
    id: "school-fees",
    label: "School Fees",
    amount: 0,
    cycle: "Per Term",
    enabled: true,
  },
  {
    id: "canteen-fees",
    label: "Canteen Fees",
    amount: 0,
    cycle: "Daily",
    enabled: true,
  },
  {
    id: "first-aid-fees",
    label: "First Aid Fees",
    amount: 0,
    cycle: "Per Term",
    enabled: true,
  },
];

/**
 * Resolves the 3 editable private-school fee slots, migrating seamlessly from legacy
 * `schoolGift`, `canteenFees`, and `firstAidFees` fields when `privateFeeItems` is absent.
 */
export function resolveEditablePrivateFeeItems(
  settings: Pick<
    SchoolSettings,
    "privateFeeItems" | "schoolGift" | "canteenFees" | "firstAidFees"
  >,
): PrivateFeeItem[] {
  if (settings.privateFeeItems && settings.privateFeeItems.length > 0) {
    const normalized = settings.privateFeeItems.slice(0, MAX_PRIVATE_FEE_ITEMS).map((item, i) => ({
      id: item.id || DEFAULT_PRIVATE_FEE_SLOTS[i].id,
      label: item.label ?? DEFAULT_PRIVATE_FEE_SLOTS[i].label,
      amount: Number.isFinite(item.amount) ? Math.max(0, item.amount) : 0,
      cycle: item.cycle || DEFAULT_PRIVATE_FEE_SLOTS[i].cycle,
      enabled: Boolean(item.enabled),
    }));

    while (normalized.length < MAX_PRIVATE_FEE_ITEMS) {
      const fallback = DEFAULT_PRIVATE_FEE_SLOTS[normalized.length];
      normalized.push({ ...fallback, enabled: false });
    }
    return normalized;
  }

  return [
    {
      ...DEFAULT_PRIVATE_FEE_SLOTS[0],
      amount: settings.schoolGift ?? 0,
      enabled: settings.schoolGift !== undefined ? settings.schoolGift > 0 : true,
    },
    {
      ...DEFAULT_PRIVATE_FEE_SLOTS[1],
      amount: settings.canteenFees ?? 0,
      enabled: settings.canteenFees !== undefined ? settings.canteenFees > 0 : true,
    },
    {
      ...DEFAULT_PRIVATE_FEE_SLOTS[2],
      amount: settings.firstAidFees ?? 0,
      enabled: settings.firstAidFees !== undefined ? settings.firstAidFees > 0 : true,
    },
  ];
}

/**
 * Returns the active (enabled, positive-amount, labeled) fee items for A4 report rendering.
 * Enforces the 3-item A4 budget and respects the master `showFeeSchedule` toggle.
 */
export function getActivePrivateFeeItems(
  settings: Pick<
    SchoolSettings,
    | "schoolType"
    | "showFeeSchedule"
    | "privateFeeItems"
    | "schoolGift"
    | "canteenFees"
    | "firstAidFees"
  >,
): PrivateFeeItem[] {
  if (settings.schoolType !== "PRIVATE") return [];
  if (settings.showFeeSchedule === false) return [];

  return resolveEditablePrivateFeeItems(settings)
    .slice(0, MAX_PRIVATE_FEE_ITEMS)
    .filter((item) => item.enabled && item.amount > 0 && item.label.trim().length > 0);
}

/**
 * Keeps legacy scalar fields (`schoolGift`, `canteenFees`, `firstAidFees`) aligned with the 3 slots
 * for backward compatibility with older exports/tests.
 */
export function syncLegacyFeesFromItems(items: PrivateFeeItem[]): {
  schoolGift: number | undefined;
  canteenFees: number | undefined;
  firstAidFees: number | undefined;
} {
  const activeAmount = (index: number): number | undefined => {
    const item = items[index];
    if (!item || !item.enabled || item.amount <= 0) return undefined;
    return item.amount;
  };

  return {
    schoolGift: activeAmount(0),
    canteenFees: activeAmount(1),
    firstAidFees: activeAmount(2),
  };
}

/**
 * Formats an ISO `YYYY-MM-DD` (or parseable) date string in local calendar coordinates without
 * UTC midnight timezone shifts or `"Invalid Date"` strings.
 */
export function formatReportDate(rawDate: string | undefined, fallback: string): string {
  const trimmed = rawDate?.trim();
  if (!trimmed) return fallback;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const localDate = new Date(year, month - 1, day);
    if (
      localDate.getFullYear() === year &&
      localDate.getMonth() === month - 1 &&
      localDate.getDate() === day
    ) {
      return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
    }
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }
  return parsed.toLocaleDateString("en-GB");
}

/**
 * Resolves position visibility across templates while preserving legacy KG behavior when toggles
 * are not explicitly set.
 */
export function resolvePositionVisibility(
  settings: Pick<SchoolSettings, "level" | "showClassPosition" | "showSubjectPosition">,
): {
  showClassPositionHeader: boolean;
  showClassPositionSummary: boolean;
  showSubjectPosition: boolean;
} {
  const isKG = settings.level === "KG";
  return {
    showClassPositionHeader:
      settings.showClassPosition !== undefined ? settings.showClassPosition : !isKG,
    showClassPositionSummary:
      settings.showClassPosition !== undefined ? settings.showClassPosition : !isKG,
    showSubjectPosition:
      settings.showSubjectPosition !== undefined ? settings.showSubjectPosition : !isKG,
  };
}
