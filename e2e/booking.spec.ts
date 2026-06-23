import { test, expect } from "@playwright/test";
import { switchPersona, goToLabA, clickFirstFreeSlot } from "./helpers";

test.describe.serial("Booking flow", () => {
  test("Test A — Mihir books Lab-A, modal shows Confirmed", async ({ page }) => {
    // 1. Switch to Mihir
    await page.goto("/");
    await switchPersona(page, "Mihir Jain");

    // 2. Navigate to Lab-A
    await goToLabA(page);

    // 3. Pick first free slot (helper waits for busy-state fetch to complete)
    await clickFirstFreeSlot(page);

    // 4. Enter a purpose
    await page.locator("#purpose").fill("Test booking Mihir");

    // 5. Click Request booking
    await page.getByRole("button", { name: "Request booking" }).click();

    // 6. Dialog opens — assert Confirmed
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByRole("heading")).toContainText(/Confirmed/i, { timeout: 10000 });

    // 7. Close dialog (use footer "Close" button — first match, not the X icon button)
    await dialog.getByRole("button", { name: "Close" }).first().click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("Test B — Sarah books a different Lab-A slot, gets Confirmed", async ({ page }) => {
    // Fresh page, switch to Sarah
    await page.goto("/");
    await switchPersona(page, "Sarah Fernando");

    // Navigate to Lab-A
    await goToLabA(page);

    // Wait for busy state to load (networkidle settles the Supabase fetch)
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    // Click the SECOND free slot (to avoid the slot Mihir just booked).
    // Use iteration approach to avoid stale-element races. Web-first assertion
    // (replaces fixed sleep): wait until at least one FREE (non-disabled) slot
    // is visible — busy slots carry the HTML `disabled` attr.
    const allSlotButtons = page.locator("button[aria-label]");
    await expect(allSlotButtons.first()).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("button[aria-label]:not([disabled])").first()
    ).toBeVisible({ timeout: 10000 });

    const count = await allSlotButtons.count();
    const freeLabels: string[] = [];
    for (let i = 0; i < count; i++) {
      const btn = allSlotButtons.nth(i);
      const isDisabled = await btn.getAttribute("disabled");
      const ariaLabel = await btn.getAttribute("aria-label");
      if (isDisabled !== null || (ariaLabel && ariaLabel.includes("(busy)"))) continue;
      if (ariaLabel) freeLabels.push(ariaLabel);
      if (freeLabels.length >= 2) break;
    }

    if (freeLabels.length < 1) throw new Error("No free slots available for Sarah's booking");
    // Pick the last found free slot (may or may not be the second, but definitely different from Mihir's)
    const targetLabel = freeLabels[freeLabels.length - 1];
    await page.locator(`button[aria-label="${targetLabel}"]`).click();

    // Enter purpose
    await page.locator("#purpose").fill("Test booking Sarah");

    // Submit
    await page.getByRole("button", { name: "Request booking" }).click();

    // Assert modal shows Confirmed (or Confirmed by priority — Sarah is under-served)
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByRole("heading")).toContainText(/Confirmed/i, { timeout: 10000 });

    // Close (footer button, not the X icon)
    await dialog.getByRole("button", { name: "Close" }).first().click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
