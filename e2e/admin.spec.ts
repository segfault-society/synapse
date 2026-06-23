import { test, expect } from "@playwright/test";
import { switchPersona } from "./helpers";

/**
 * Navigate to /admin using the in-page nav link after persona is already set.
 * Using in-page navigation preserves the Zustand store state vs. a full page.goto().
 */
async function goToAdmin(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("link", { name: "Admin" }).click();
  // Wait for either admin console or access restricted to appear
  await expect(
    page.getByRole("heading", { name: /Admin console/i }).or(
      page.getByRole("heading", { name: /Access restricted/i })
    )
  ).toBeVisible({ timeout: 15000 });
}

test.describe.serial("Admin console", () => {
  test("Test A — non-admin (Mihir) sees access gate", async ({ page }) => {
    await page.goto("/");
    await switchPersona(page, "Mihir Jain");

    await goToAdmin(page);

    // Should see "Access restricted" heading
    await expect(page.getByRole("heading", { name: /Access restricted/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("Test B — System Admin can access /admin", async ({ page }) => {
    await page.goto("/");
    await switchPersona(page, "System Admin");

    await goToAdmin(page);

    // Should see "Admin console" heading
    await expect(page.getByRole("heading", { name: /Admin console/i })).toBeVisible({
      timeout: 10000,
    });

    // Default tab is Fairness — confirm its content is visible
    await expect(page.getByRole("heading", { name: /Fairness dashboard/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("Test C — Fairness tab shows member rows (after rebalance if needed)", async ({
    page,
  }) => {
    await page.goto("/");
    await switchPersona(page, "System Admin");
    await goToAdmin(page);
    await expect(page.getByRole("heading", { name: /Admin console/i })).toBeVisible({
      timeout: 10000,
    });

    // If no fairness data yet, run rebalance first then go back to Fairness
    const noDataMsg = page.getByText("No fairness data yet");
    const isNoData = await noDataMsg.isVisible().catch(() => false);

    if (isNoData) {
      // Click Ops tab
      await page.getByRole("tab", { name: "Ops" }).click();

      // Click Run rebalance
      await page.getByRole("button", { name: "Run rebalance" }).click();

      // Wait for success toast
      await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 15000 });

      // Go back to Fairness tab
      await page.getByRole("tab", { name: "Fairness" }).click();
    }

    // The fairness table should have rows — look for a table body row
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15000 });
  });

  test("Test D — Ops tab: run rebalance and reaper succeed", async ({ page }) => {
    await page.goto("/");
    await switchPersona(page, "System Admin");
    await goToAdmin(page);
    await expect(page.getByRole("heading", { name: /Admin console/i })).toBeVisible({
      timeout: 10000,
    });

    // Click Ops tab
    await page.getByRole("tab", { name: "Ops" }).click();

    // Wait for ops panel
    await expect(page.getByRole("heading", { name: /Operations/i })).toBeVisible({
      timeout: 5000,
    });

    // Click Run rebalance
    const rebalanceBtn = page.getByRole("button", { name: "Run rebalance" });
    await expect(rebalanceBtn).toBeEnabled({ timeout: 5000 });
    await rebalanceBtn.click();

    // Wait for success toast (Sonner)
    const toast = page.locator("[data-sonner-toast]");
    await expect(toast).toBeVisible({ timeout: 15000 });
    // Should NOT contain "failed"
    await expect(toast).not.toContainText(/failed/i);

    // Dismiss any toasts / wait for them to clear
    await page.waitForTimeout(500);

    // Click Run reaper
    const reaperBtn = page.getByRole("button", { name: "Run reaper" });
    await expect(reaperBtn).toBeEnabled({ timeout: 5000 });
    await reaperBtn.click();

    // Wait for success toast
    await expect(toast).toBeVisible({ timeout: 15000 });
    await expect(toast).not.toContainText(/failed/i);
  });
});
