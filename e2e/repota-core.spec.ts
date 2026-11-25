import { expect, test, type Page } from "@playwright/test";

function attachErrorCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

function visibleStudentLocator(page: Page, fullName: string, isMobile = false) {
  return isMobile
    ? page.getByText(fullName).first()
    : page.getByRole("table").getByText(fullName).first();
}

async function addStudentOnDashboard(page: Page, fullName: string, isMobile = false) {
  const firstAddBtn = page.getByRole("button", { name: "Add your first student" });
  const addNewBtn = page.getByRole("button", { name: "Add new student" });
  await expect(firstAddBtn.or(addNewBtn)).toBeVisible({ timeout: 10000 });

  if (await firstAddBtn.isVisible()) {
    await firstAddBtn.click();
  } else {
    await addNewBtn.click();
  }

  await page.getByLabel("Full Name").fill(fullName);
  await page.getByRole("button", { name: "Save Student" }).click();
  await expect(visibleStudentLocator(page, fullName, isMobile)).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("repota_welcome_tour_v2", "true");
  });
});

test.describe("Repota Real-Browser Core Flows", () => {
  test("1. cold start -> real IndexedDB persistence -> lossless raw exam score survives reload", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");

    await addStudentOnDashboard(page, "Kwame Persist");

    // Open ScoreEntryModal and enter class score + odd raw exam score (73)
    await visibleStudentLocator(page, "Kwame Persist").click();
    const classInput = page.locator('input[aria-label$="Class Score"]').first();
    const examInput = page.locator('input[aria-label$="Exam Score"]').first();
    await expect(classInput).toBeVisible();

    await classInput.fill("31");
    await examInput.fill("73");
    await page.getByRole("button", { name: "Close modal" }).click();

    // Wait for debounced IndexedDB persistence to complete before reloading
    await expect(page.getByText(/Saved just now/i)).toBeVisible({ timeout: 5000 });

    await page.reload();
    await expect(visibleStudentLocator(page, "Kwame Persist")).toBeVisible();

    await visibleStudentLocator(page, "Kwame Persist").click();
    await expect(page.locator('input[aria-label$="Class Score"]').first()).toHaveValue("31");
    await expect(page.locator('input[aria-label$="Exam Score"]').first()).toHaveValue("73");

    expect(errors).toEqual([]);
  });

  test("2. mobile viewport SBA markbook mounts only mobile inputs and persists across reload", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await addStudentOnDashboard(page, "Ama Mobile", true);
    await expect(page.getByText(/Saved just now/i)).toBeVisible({ timeout: 5000 });

    await page.goto("/sba");

    // Wait for lazy SbaPage/SettingsFormLayout chunks, then apply GES preset if not yet initialized
    const presetBtn = page.getByRole("button", { name: /Use Preset/i }).first();
    const mobileInput = page
      .locator('input[aria-label*="Ama Mobile"][aria-label$="Score (Mobile)"]')
      .first();
    await expect(presetBtn.or(mobileInput)).toBeVisible({ timeout: 10000 });
    if (await presetBtn.isVisible()) {
      await presetBtn.click();
    }

    await expect(mobileInput).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[aria-label^="Ama Mobile "][aria-label$=" Score"]')).toHaveCount(
      0,
    );

    await mobileInput.fill("14");
    await mobileInput.blur();
    await page.waitForTimeout(900);

    await page.reload();
    const reloadedMobileInput = page
      .locator('input[aria-label*="Ama Mobile"][aria-label$="Score (Mobile)"]')
      .first();
    await expect(reloadedMobileInput).toBeVisible({ timeout: 10000 });
    await expect(reloadedMobileInput).toHaveValue("14");
    await expect(page.locator('input[aria-label^="Ama Mobile "][aria-label$=" Score"]')).toHaveCount(
      0,
    );

    expect(errors).toEqual([]);
  });

  test("3. immediate .repota export flushes edits -> clear students -> re-import restores data", async ({
    page,
  }, testInfo) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");

    await addStudentOnDashboard(page, "Esi Backup");
    await visibleStudentLocator(page, "Esi Backup").click();
    const examInput = page.locator('input[aria-label$="Exam Score"]').first();
    await expect(examInput).toBeVisible();
    await examInput.fill("81");
    await page.getByRole("button", { name: "Close modal" }).click();

    // Navigate via SPA link within <500ms debounce and immediately trigger export
    await page.getByLabel("Sidebar navigation").getByRole("link", { name: /Settings/i }).click();
    await page.getByRole("link", { name: /Security & Backup/i }).first().click();
    await expect(page.getByRole("button", { name: "Save Class File" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save Class File" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.repota$/i);

    const backupPath = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(backupPath);

    // Clear all students, then restore from the downloaded .repota file
    await page.getByRole("button", { name: /Remove All Students \(1\)/i }).click();
    await page.getByRole("button", { name: "Yes, Remove All Students" }).click();
    await expect(page.getByRole("button", { name: "Remove All Students" })).toBeDisabled();

    const fileInput = page.locator('input[type="file"][accept*=".repota"]');
    await fileInput.setInputFiles(backupPath);

    const reloadPromise = page.waitForEvent("load");
    await page.getByRole("button", { name: "Yes, Load File" }).click();
    await reloadPromise;

    await page.goto("/");
    await expect(visibleStudentLocator(page, "Esi Backup")).toBeVisible();
    await visibleStudentLocator(page, "Esi Backup").click();
    await expect(page.locator('input[aria-label$="Exam Score"]').first()).toHaveValue("81");

    expect(errors).toEqual([]);
  });

  test("4. two-tab real BroadcastChannel sync propagates new student to second tab without reload", async ({
    context,
  }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    const errors1 = attachErrorCollector(page1);
    const errors2 = attachErrorCollector(page2);

    await page1.goto("/");
    await page2.goto("/");
    await expect(page2.getByRole("button", { name: "Add your first student" })).toBeVisible();

    await addStudentOnDashboard(page1, "Kofi MultiTab");
    await expect(page1.getByText(/Saved just now/i)).toBeVisible({ timeout: 5000 });

    await expect(visibleStudentLocator(page2, "Kofi MultiTab")).toBeVisible({ timeout: 5000 });

    expect(errors1).toEqual([]);
    expect(errors2).toEqual([]);
  });

  test("5. /print renders report card cleanly outside AppShell navigation chrome", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");

    await addStudentOnDashboard(page, "Yaw Print");
    await expect(page.getByText(/Saved just now/i)).toBeVisible({ timeout: 5000 });

    await page.goto("/print");
    await expect(page.getByText("Yaw Print").first()).toBeVisible();
    await expect(page.getByLabel("Mobile bottom navigation")).toHaveCount(0);
    await expect(page.getByLabel("Sidebar navigation")).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test("6. lazy /analytics route loads cleanly and switches across all four tabs", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");

    await addStudentOnDashboard(page, "Abena Analytics");
    await visibleStudentLocator(page, "Abena Analytics").click();
    await page.locator('input[aria-label$="Class Score"]').first().fill("35");
    await page.locator('input[aria-label$="Exam Score"]').first().fill("78");
    await page.getByRole("button", { name: "Close modal" }).click();
    await expect(page.getByText(/Saved just now/i)).toBeVisible({ timeout: 5000 });

    await page.getByLabel("Sidebar navigation").getByRole("link", { name: /Analytics/i }).click();
    await expect(page.getByRole("button", { name: /^Overview$/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /^Subjects$/i }).click();
    await page.getByRole("button", { name: /^Demographics$/i }).click();
    await page.getByRole("button", { name: /^AI Insights$/i }).click();
    await expect(page.getByRole("button", { name: /^AI Insights$/i })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
