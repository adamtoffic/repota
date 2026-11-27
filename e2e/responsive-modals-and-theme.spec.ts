import { expect, test, type Page } from "@playwright/test";

function attachErrorCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

async function expectNoHorizontalOverflow(page: Page, contextLabel: string) {
  const dims = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    dims.scrollWidth,
    `${contextLabel}: scrollWidth (${dims.scrollWidth}) exceeded clientWidth (${dims.clientWidth})`,
  ).toBeLessThanOrEqual(dims.clientWidth + 1);
}

async function seedOneScoredStudent(page: Page) {
  await page.goto("/");
  const firstAddBtn = page.getByRole("button", { name: "Add your first student" });
  const addNewBtn = page.getByRole("button", { name: "Add new student" });
  await expect(firstAddBtn.or(addNewBtn)).toBeVisible({ timeout: 10000 });

  if (await firstAddBtn.isVisible()) {
    await firstAddBtn.click();
  } else {
    await addNewBtn.click();
  }

  await page.getByLabel("Full Name").fill("Kwame Responsive");
  await page.getByRole("button", { name: "Save Student" }).click();

  await page.getByRole("button", { name: "Kwame Responsive" }).first().click();
  const classInput = page.locator('input[aria-label$="Class Score"]').first();
  const examInput = page.locator('input[aria-label$="Exam Score"]').first();
  await expect(classInput).toBeVisible();
  await classInput.fill("38");
  await examInput.fill("75");
  await expect(page.getByTitle("All changes saved")).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Close modal" }).click();
  await expect(page.getByRole("button", { name: "Quick add student" })).toBeVisible({
    timeout: 5000,
  });
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("repota_welcome_tour_v2", "true");
  });
});

test.describe("Responsive Modals, Input Alignment & Self-Hosted Font (E2E)", () => {
  test("1. loads self-hosted Inter font and renders Desktop & Mobile routes with zero overflow in Light & Dark modes", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedOneScoredStudent(page);

    const fontLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(document.fonts).some(
        (font) => font.family.replace(/['"]/g, "") === "Inter" && font.status === "loaded",
      );
    });
    expect(fontLoaded).toBe(true);

    const routes = [
      "/",
      "/sba",
      "/analytics",
      "/settings",
      "/settings/school",
      "/settings/academic",
      "/settings/templates",
      "/settings/security",
      "/print",
    ] as const;

    // Desktop Light Mode
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main#main-content")).toBeVisible({ timeout: 10000 });
      await expectNoHorizontalOverflow(page, `Desktop light ${route}`);
    }

    // Switch to Dark Mode via real UI toggle
    await page.goto("/");
    await page.getByRole("button", { name: "Use dark theme" }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    // Mobile Dark Mode across all routes + explicit Next Term Begins date box alignment
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main#main-content")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      await expectNoHorizontalOverflow(page, `Mobile dark ${route}`);

      if (route === "/settings/academic") {
        const attendanceInput = page.getByLabel("Total Attendance Days");
        const nextTermInput = page.getByLabel("Next Term Begins");
        await expect(nextTermInput).toBeVisible();
        const attendanceBox = await attendanceInput.boundingBox();
        const nextTermBox = await nextTermInput.boundingBox();
        expect(attendanceBox).not.toBeNull();
        expect(nextTermBox).not.toBeNull();
        expect(nextTermBox!.x).toBeGreaterThanOrEqual(0);
        expect(nextTermBox!.x + nextTermBox!.width).toBeLessThanOrEqual(391);
        expect(Math.abs(nextTermBox!.x - attendanceBox!.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(nextTermBox!.width - attendanceBox!.width)).toBeLessThanOrEqual(2);
      }
    }

    expect(errors).toEqual([]);
  });

  test("2. aligns ScoreEntryModal inputs cleanly on Academic & Details tabs (Desktop & Mobile)", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedOneScoredStudent(page);

    // Open ScoreEntryModal on Desktop
    await page.getByRole("button", { name: "Kwame Responsive" }).first().click();

    const classInput = page.locator('input[aria-label$="Class Score"]').first();
    const examInput = page.locator('input[aria-label$="Exam Score"]').first();
    await expect(classInput).toBeVisible();
    await expect(examInput).toBeVisible();

    const classBox = await classInput.boundingBox();
    const examBox = await examInput.boundingBox();
    expect(classBox).not.toBeNull();
    expect(examBox).not.toBeNull();
    expect(Math.abs(classBox!.y - examBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(classBox!.height - examBox!.height)).toBeLessThanOrEqual(2);

    // Switch to Student Details tab & verify Days Present vs Promotion Status & DOB vs Gender alignment
    await page.getByRole("tab", { name: /Student Details/i }).click();

    const daysInput = page.getByLabel("Days Present");
    const promotionSelect = page.getByLabel("Promotion Status");
    await expect(daysInput).toBeVisible();
    await daysInput.fill("65");

    // Verify attendance rating badge appears without misaligning inputs
    await expect(page.getByText(/%\s*·/)).toBeVisible();

    const daysBox = await daysInput.boundingBox();
    const promoBox = await promotionSelect.boundingBox();
    expect(daysBox).not.toBeNull();
    expect(promoBox).not.toBeNull();
    expect(Math.abs(daysBox!.y - promoBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(daysBox!.height - promoBox!.height)).toBeLessThanOrEqual(2);

    const dobInput = page.getByLabel("Date of Birth");
    const maleBtn = page.getByRole("button", { name: "Male", exact: true });
    const dobBox = await dobInput.boundingBox();
    const maleBox = await maleBtn.boundingBox();
    expect(dobBox).not.toBeNull();
    expect(maleBox).not.toBeNull();
    expect(Math.abs(dobBox!.y - maleBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(dobBox!.height - maleBox!.height)).toBeLessThanOrEqual(2);

    // Switch back to Academic tab on Mobile 390x844
    await page.getByRole("tab", { name: /Academic Scores/i }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page, "Mobile ScoreEntryModal");

    const mobileClassBox = await classInput.boundingBox();
    const mobileExamBox = await examInput.boundingBox();
    expect(mobileClassBox).not.toBeNull();
    expect(mobileExamBox).not.toBeNull();
    expect(Math.abs(mobileClassBox!.y - mobileExamBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(mobileClassBox!.height - mobileExamBox!.height)).toBeLessThanOrEqual(2);
    expect(mobileExamBox!.x + mobileExamBox!.width).toBeLessThanOrEqual(391);

    await page.getByRole("tab", { name: /Student Details/i }).click();
    await expect(dobInput).toBeVisible();
    const mobileDobBox = await dobInput.boundingBox();
    expect(mobileDobBox).not.toBeNull();
    expect(mobileDobBox!.x).toBeGreaterThanOrEqual(0);
    expect(mobileDobBox!.x + mobileDobBox!.width).toBeLessThanOrEqual(391);
    await expectNoHorizontalOverflow(page, "Mobile ScoreEntryModal Details tab");

    expect(errors).toEqual([]);
  });

  test("3. fits Dashboard modals cleanly inside Mobile 390x844 viewport without overflow", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedOneScoredStudent(page);

    const assertDialogFitsMobile = async (label: string) => {
      const dialog = page.locator('[role="dialog"]').last();
      await expect(dialog, `${label} dialog visible`).toBeVisible({ timeout: 5000 });
      const box = await dialog.boundingBox();
      expect(box, `${label} boundingBox`).not.toBeNull();
      expect(box!.x, `${label} left edge`).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width, `${label} right edge`).toBeLessThanOrEqual(391);
      expect(box!.height, `${label} height`).toBeLessThanOrEqual(845);
      await expectNoHorizontalOverflow(page, `Mobile ${label}`);
    };

    // 1. AddStudentModal
    await page.getByRole("button", { name: "Quick add student" }).click();
    await assertDialogFitsMobile("AddStudentModal");
    await page.getByRole("button", { name: "Close modal" }).click();

    // 2. BulkAttendanceModal via Class Tools sheet
    await page.getByRole("button", { name: /Class Tools/i }).click();
    await page.getByRole("menuitem", { name: /Bulk Attendance Entry/i }).click();
    await assertDialogFitsMobile("BulkAttendanceModal");
    await expect(page.getByRole("button", { name: "Save Attendance" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    // 3. BulkPromotionModal via Class Tools sheet
    await page.getByRole("button", { name: /Class Tools/i }).click();
    await page.getByRole("menuitem", { name: /Bulk Promotion Status/i }).click();
    await assertDialogFitsMobile("BulkPromotionModal");
    await expect(page.getByRole("button", { name: "Apply Promotion Status" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    // 4. BulkImportModal
    await page.getByRole("button", { name: /Class Tools/i }).click();
    await page.getByRole("menuitem", { name: /Import Student Roster/i }).click();
    await assertDialogFitsMobile("BulkImportModal");
    await page.getByRole("button", { name: "Close modal" }).click();

    // 5. ScoreImportModal
    await page.getByRole("button", { name: "Import Scores" }).click();
    await assertDialogFitsMobile("ScoreImportModal");
    await page.getByRole("button", { name: "Close modal" }).click();

    expect(errors).toEqual([]);
  });
});
