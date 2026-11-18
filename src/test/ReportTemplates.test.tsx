import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { ClassicTemplate } from "../templates/ClassicTemplate";
import { ExecutiveTemplate } from "../templates/ExecutiveTemplate";
import { MinimalTemplate } from "../templates/MinimalTemplate";
import { ModernTemplate } from "../templates/ModernTemplate";
import { OriginalTemplate } from "../templates/OriginalTemplate";
import type { ProcessedStudent, SchoolSettings } from "../types";

const baseStudent: ProcessedStudent = {
  id: "stu-1",
  name: "Ama Serwaa",
  className: "Basic 5",
  gender: "Female",
  age: 11,
  attendancePresent: 64,
  conduct: "Respectful",
  interest: "Reading",
  teacherRemark: "Keep up the hard work.",
  promotionStatus: "Promoted to Basic 6",
  admissionNumber: "ADM-101",
  feeStatus: "PART_PAID",
  feeArrears: 150,
  totalScore: 245,
  averageScore: 81.7,
  classPosition: "2nd",
  aggregate: 7,
  subjects: [
    {
      id: "sub-1",
      name: "Mathematics",
      classScore: 42,
      examScore: 45,
      totalScore: 87,
      grade: 1,
      remark: "Advance",
      subjectPosition: "1st",
    },
    {
      id: "sub-2",
      name: "English Language",
      classScore: 38,
      examScore: 40,
      totalScore: 78,
      grade: 2,
      remark: "Proficient",
      subjectPosition: "3rd",
    },
    {
      id: "sub-3",
      name: "Science",
      classScore: 39,
      examScore: 41,
      totalScore: 80,
      grade: 1,
      remark: "Advance",
      subjectPosition: "2nd",
    },
  ],
};

const baseSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Heritage Academy",
  className: "Basic 5",
  schoolType: "PRIVATE",
  level: "PRIMARY",
  term: "Third Term",
  privateFeeItems: [
    { id: "slot-1", label: "Tuition Fee", amount: 650, cycle: "Per Term", enabled: true },
    { id: "slot-2", label: "School Bus", amount: 180, cycle: "Per Month", enabled: false },
    { id: "slot-3", label: "ICT Practical", amount: 75, cycle: "Per Term", enabled: true },
  ],
  showFeeSchedule: true,
  showStudentFeeArrearsOnReport: true,
};

const TEMPLATES = [
  { name: "OriginalTemplate", Component: OriginalTemplate },
  { name: "ClassicTemplate", Component: ClassicTemplate },
  { name: "ModernTemplate", Component: ModernTemplate },
  { name: "MinimalTemplate", Component: MinimalTemplate },
  { name: "ExecutiveTemplate", Component: ExecutiveTemplate },
] as const;

describe("Report Templates — Position Toggles, Private Fee Slots & Custom Colors", () => {
  it.each(TEMPLATES)(
    "$name renders enabled custom fee slots, hides disabled slots, and shows arrears when enabled",
    ({ Component }) => {
      render(<Component student={baseStudent} settings={baseSettings} printMode="color" />);

      expect(screen.getByText(/Tuition Fee/i)).toBeInTheDocument();
      expect(screen.getByText(/ICT Practical/i)).toBeInTheDocument();
      expect(screen.queryByText(/School Bus/i)).not.toBeInTheDocument();
      expect(screen.getByText(/150\.00/)).toBeInTheDocument();
    },
  );

  it.each(TEMPLATES)(
    "$name hides overall class position when showClassPosition is false while preserving subject position",
    ({ Component }) => {
      const settings: SchoolSettings = {
        ...baseSettings,
        showClassPosition: false,
        showSubjectPosition: true,
      };
      render(<Component student={baseStudent} settings={settings} printMode="color" />);

      // Overall classPosition is 2nd; Science subjectPosition is also 2nd, so check explicit position labels/header
      expect(screen.queryByText(/^Position in Class:$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Position:$/i)).not.toBeInTheDocument();
      // Subject positions column should still render 1st and 3rd
      expect(screen.getByText("1st")).toBeInTheDocument();
      expect(screen.getByText("3rd")).toBeInTheDocument();
    },
  );

  it.each(TEMPLATES)(
    "$name hides subject position column when showSubjectPosition is false while keeping class position",
    ({ Component }) => {
      const settings: SchoolSettings = {
        ...baseSettings,
        showClassPosition: true,
        showSubjectPosition: false,
      };
      render(<Component student={baseStudent} settings={settings} printMode="color" />);

      // Subject positions 1st / 3rd should not appear, while overall classPosition 2nd should appear
      expect(screen.queryByText("1st")).not.toBeInTheDocument();
      expect(screen.queryByText("3rd")).not.toBeInTheDocument();
      expect(screen.getAllByText("2nd").length).toBeGreaterThanOrEqual(1);
    },
  );

  it.each(TEMPLATES)(
    "$name hides fee schedule completely when showFeeSchedule is false",
    ({ Component }) => {
      const settings: SchoolSettings = {
        ...baseSettings,
        showFeeSchedule: false,
      };
      render(<Component student={baseStudent} settings={settings} printMode="color" />);

      expect(screen.queryByText(/Tuition Fee/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/ICT Practical/i)).not.toBeInTheDocument();
    },
  );

  it.each(TEMPLATES)(
    "$name applies custom school colors in color mode and switches cleanly to B&W when printMode is bw",
    ({ Component }) => {
      const customSettings: SchoolSettings = {
        ...baseSettings,
        useCustomTemplateColor: true,
        primaryColor: "#881337",
        accentColor: "#d97706",
      };

      const { container: colorContainer } = render(
        <Component student={baseStudent} settings={customSettings} printMode="color" />,
      );
      expect(colorContainer.innerHTML).toMatch(/#881337|#620e28|rgb\(136,\s*19,\s*55\)/i);

      const { container: bwContainer } = render(
        <Component student={baseStudent} settings={customSettings} printMode="bw" />,
      );
      expect(bwContainer.innerHTML).not.toMatch(/#881337|#620e28|rgb\(136,\s*19,\s*55\)/i);
    },
  );

  it.each(TEMPLATES)(
    "$name leaves school logo area blank without placeholder text when logoUrl is empty",
    ({ Component }) => {
      render(
        <Component student={baseStudent} settings={{ ...baseSettings, logoUrl: "" }} printMode="color" />,
      );

      expect(screen.queryByText(/^No Logo$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^LOGO$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Crest$/i)).not.toBeInTheDocument();
    },
  );
});
