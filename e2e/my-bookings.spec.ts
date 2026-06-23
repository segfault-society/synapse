import { test, expect } from "@playwright/test";
import { switchPersona, goToLabA, clickFirstFreeSlot } from "./helpers";

test.describe("My Bookings (/me) page", () => {
  test("Mihir books a slot, sees it on /me, checks in", async ({ page }) => {
    // 1. Switch to Mihir
    await page.goto("/");
    await switchPersona(page, "Mihir Jain");

    // 2. Navigate to Lab-A
    await goToLabA(page);

    // 3. Pick a free slot
    await clickFirstFreeSlot(page);

    // 4. Enter purpose and submit
    await page.locator("#purpose").fill("My bookings test");
    await page.getByRole("button", { name: "Request booking" }).click();

    // 5. Wait for modal showing Confirmed, then close it
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByRole("heading")).toContainText(/Confirmed/i, { timeout: 10000 });
    await dialog.getByRole("button", { name: "Close" }).first().click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // 6. Navigate to /me
    await page.goto("/me");

    // 7. Assert the booking appears — look for purpose text (unique to this booking)
    await expect(page.getByText("My bookings test")).toBeVisible({ timeout: 15000 });

    // 8. Click "Check in" on the booking
    const checkInBtn = page.getByRole("button", { name: "Check in" }).first();
    await expect(checkInBtn).toBeVisible({ timeout: 5000 });
    await checkInBtn.click();

    // 9. Assert success toast or "Checked in" badge appears
    const successToast = page.locator("[data-sonner-toast]");
    const checkedInBadge = page.getByText("Checked in");

    // Wait for either the toast or the badge
    await Promise.race([
      expect(successToast).toBeVisible({ timeout: 10000 }),
      expect(checkedInBadge).toBeVisible({ timeout: 10000 }),
    ]).catch(async () => {
      // If neither visible immediately, try toast
      await expect(successToast).toBeVisible({ timeout: 10000 });
    });

    // 10. Navigate away then come back — booking (or checked-in state) is persisted
    await page.goto("/");
    await page.goto("/me");

    // Booking should still be visible — the purpose text persists (or checked-in badge)
    await expect(
      page.getByText("My bookings test").or(page.getByText("Checked in")).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
