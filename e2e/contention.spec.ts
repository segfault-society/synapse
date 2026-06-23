import { test, expect } from "@playwright/test";

test.describe("Contention simulation — /demo page", () => {
  test("fires simultaneous requests and shows winner + ranked contenders", async ({ page }) => {
    await page.goto("/demo");

    // Wait for the resource Select trigger (id="resource-select" on the SelectTrigger button)
    const resourceTrigger = page.locator("#resource-select");
    await expect(resourceTrigger).toBeVisible({ timeout: 10000 });

    // Wait for resources to finish loading (placeholder changes from "Loading…" to "Pick a resource")
    await expect(resourceTrigger).not.toContainText("Loading", { timeout: 10000 });

    // Click the resource select and pick Lab-A
    await resourceTrigger.click();
    await page.getByRole("option", { name: "Lab-A" }).click();

    // Wait for member checkboxes to load — Sarah, Mihir, Dr. Perera are pre-checked
    const checkedCheckboxes = page.locator('[role="checkbox"][data-state="checked"]');
    await expect(checkedCheckboxes.nth(1)).toBeVisible({ timeout: 10000 });
    const checkedCount = await checkedCheckboxes.count();
    expect(checkedCount).toBeGreaterThanOrEqual(2);

    // The "Fire simultaneous requests" button should be enabled
    const fireButton = page.getByRole("button", { name: "Fire simultaneous requests" });
    await expect(fireButton).toBeEnabled({ timeout: 5000 });

    // Click it
    await fireButton.click();

    // Wait for button to re-enable (firing state ends — simulation complete)
    await expect(fireButton).toBeEnabled({ timeout: 30000 });

    // Assert "Winner" heading/text appears in the results
    await expect(page.getByText("Winner").first()).toBeVisible({ timeout: 15000 });

    // Assert "All contenders (ranked)" section heading visible
    await expect(page.getByText("All contenders (ranked)")).toBeVisible({ timeout: 10000 });

    // Assert at least 2 contender entries — look for rank badges like "#1", "#2"
    // Each ranked contender shows "#N" text
    const rankTexts = page.locator("text=/^#[1-9]/");
    await expect(rankTexts.nth(1)).toBeVisible({ timeout: 10000 });

    // Assert score bars are present (the winner card and contender cards all have progress bars)
    // At least 3 progressbars should be visible (Urgency, Role weight, Fairness deficit)
    const allProgressBars = page.getByRole("progressbar");
    await expect(allProgressBars.first()).toBeVisible({ timeout: 10000 });
    const progressCount = await allProgressBars.count();
    expect(progressCount).toBeGreaterThanOrEqual(3);

    // Assert the winner name badge (bg-cyan-600) is visible in the results section
    const winnerNameBadge = page
      .locator('[class*="bg-cyan-600"]')
      .filter({ hasNot: page.locator('[role="menuitem"]') });
    // Just check the first cyan badge is present (winner name badge)
    await expect(winnerNameBadge.first()).toBeVisible({ timeout: 5000 });
  });
});
