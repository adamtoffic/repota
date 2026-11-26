import { expect, test, type Page } from "@playwright/test";

function attachErrorCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

async function addStudentOnDashboard(page: Page, fullName: string) {
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
  await expect(page.getByRole("table").getByText(fullName).first()).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("repota_welcome_tour_v2", "true");
  });
});

test.describe("Repota Real-Browser Peak E2E Flows", () => {
  test("1. PIN setup -> reload triggers LockScreen -> wrong PIN rejected -> valid PIN unlocks", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/settings/security");

    await page.getByRole("button", { name: "Enable PIN Lock" }).click();
    await page.getByRole("button", { name: "Get Started" }).click();

    await page.getByPlaceholder("••••").fill("1357");
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByPlaceholder("••••").fill("1357");
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: /Next: Set Security Questions/i }).click();
    await page.getByRole("button", { name: "Skip" }).click();

    const changePinBtn = page.getByRole("button", { name: "Change PIN" });
    const skipBiometricBtn = page.getByRole("button", { name: "Skip for Now" });
    await expect(changePinBtn.or(skipBiometricBtn)).toBeVisible({ timeout: 5000 });
    if (await skipBiometricBtn.isVisible()) {
      await skipBiometricBtn.click();
    }

    await expect(changePinBtn).toBeVisible({ timeout: 5000 });

    await page.reload();

    const pinInput = page.getByPlaceholder("••••");
    await expect(pinInput).toBeVisible({ timeout: 5000 });

    await pinInput.fill("0000");
    await expect(page.getByText(/Incorrect PIN/i)).toBeVisible({ timeout: 5000 });

    await pinInput.fill("1357");
    await expect(page.getByRole("button", { name: "Change PIN" })).toBeVisible({ timeout: 5000 });

    expect(errors).toEqual([]);
  });

  test("2. template selection persists to /print with Color/B&W Ink Mode toggle and invalid ?id= recovery", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");

    await addStudentOnDashboard(page, "Esi Template");
    await expect(page.getByText(/Saved just now/i)).toBeVisible({ timeout: 5000 });

    await page.goto("/settings/templates");
    const scholarCard = page.getByRole("button", { name: /Editorial Scholar/i });
    await scholarCard.click();
    await expect(scholarCard).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/Saved just now/i)).toBeVisible({ timeout: 5000 });

    await page.goto("/print");
    await expect(page.getByText("Esi Template").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".report-page").first()).toContainText("Candidate Name");

    const inkGroup = page.getByRole("group", { name: "Ink mode" });
    await expect(inkGroup).toBeVisible();
    const bwBtn = inkGroup.getByRole("button", { name: "B&W" });
    await bwBtn.click();
    await expect(bwBtn).toHaveAttribute("aria-pressed", "true");

    await page.goto("/print?id=nonexistent-student-999");
    await expect(page.getByText("Student Report Not Found")).toBeVisible({ timeout: 5000 });
    await page.getByRole("link", { name: "View All Report Cards" }).click();
    await expect(page.getByText("Esi Template").first()).toBeVisible({ timeout: 5000 });

    expect(errors).toEqual([]);
  });

  test("3. Service Worker caches app shell for offline reload with IndexedDB student intact", async ({
    page,
    context,
  }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");

    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    const hasController = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
    if (!hasController) {
      await page.reload();
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), {
        timeout: 10000,
      });
    }

    await addStudentOnDashboard(page, "Kojo Offline");
    await expect(page.getByText(/Saved just now/i)).toBeVisible({ timeout: 5000 });

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByRole("table").getByText("Kojo Offline").first()).toBeVisible({
        timeout: 10000,
      });
    } finally {
      await context.setOffline(false);
    }

    expect(errors).toEqual([]);
  });
});
