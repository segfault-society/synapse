import { test, expect } from "@playwright/test";

test.describe("Smoke — homepage and resource grid", () => {
  test("wordmark visible and resource cards load", async ({ page }) => {
    await page.goto("/");

    // Wordmark: the header link contains "SYNAPSE"
    await expect(page.locator("header").getByRole("link", { name: /SYNAPSE/i })).toBeVisible({
      timeout: 10000,
    });

    // Wait for spinner to disappear (resources loaded)
    await expect(page.locator(".animate-spin")).not.toBeVisible({ timeout: 15000 });

    // At least one resource card heading should be visible
    const cards = page.locator("h3");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("class filter — pick Computer Lab reduces cards", async ({ page }) => {
    await page.goto("/");

    // Wait for spinner to disappear (resources loaded)
    await expect(page.locator(".animate-spin")).not.toBeVisible({ timeout: 15000 });

    // Count cards before filtering
    const allCards = page.locator('[class*="grid"] h3');
    await expect(allCards.first()).toBeVisible({ timeout: 10000 });
    const countBefore = await allCards.count();

    // Open the class-filter Select (first combobox in main content, not header)
    const main = page.locator("main");
    const classFilterTrigger = main.locator('[data-slot="select-trigger"]').first();
    await classFilterTrigger.click();

    // Pick "Computer Lab"
    await page.getByRole("option", { name: "Computer Lab" }).click();

    // Wait a tick for filter to apply
    await page.waitForTimeout(300);

    // After filtering, count should be <= total
    const filteredCards = page.locator('[class*="grid"] h3');
    const countAfter = await filteredCards.count();
    expect(countAfter).toBeLessThanOrEqual(countBefore);
    expect(countAfter).toBeGreaterThanOrEqual(1);

    // All visible cards should be computer labs — check their headings only show Lab-A/Lab-B
    const cardHeadings = await filteredCards.allTextContents();
    for (const heading of cardHeadings) {
      // Lab-A and Lab-B are the only computer_lab resources
      expect(["Lab-A", "Lab-B"]).toContain(heading.trim());
    }
  });
});
