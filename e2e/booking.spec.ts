import { test, expect } from "@playwright/test";
import { switchPersona, goToLabA, pickFreeSlotLabel } from "./helpers";

test.describe.serial("Booking flow", () => {
  // Shared across the serial tests: the exact slot Mihir books, which Sarah
  // then contends. Both tests run within seconds of each other, so the
  // relative slot generation produces the identical label set.
  let contendedSlotLabel: string;

  test("Test A — Mihir books a Lab-A slot, modal shows Confirmed", async ({ page }) => {
    // 1. Switch to Mihir
    await page.goto("/");
    await switchPersona(page, "Mihir Jain");

    // 2. Navigate to Lab-A
    await goToLabA(page);

    // 3. Pick a deterministic free slot a few days out (so Sarah can target the
    //    same one). Index 30 lands ~3 business days out, well clear of "now".
    contendedSlotLabel = await pickFreeSlotLabel(page, 30);
    await page.locator(`button[aria-label="${contendedSlotLabel}"]`).click();

    // 4. Enter a purpose
    await page.locator("#purpose").fill("casual study");

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

  test("Test B — Sarah contends Mihir's SAME slot → Confirmed by priority", async ({ page }) => {
    // Fresh page, switch to Sarah
    await page.goto("/");
    await switchPersona(page, "Sarah Fernando");

    // Navigate to Lab-A
    await goToLabA(page);

    // Wait for busy state to load — Mihir's slot should now render as amber/booked.
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    // The slot Mihir booked is now "(booked — your request will contend)".
    // Its aria-label is Mihir's plain label + the booked suffix.
    const bookedLabel = `${contendedSlotLabel} (booked — your request will contend)`;
    const bookedButton = page.locator(`button[aria-label="${bookedLabel}"]`);
    await expect(bookedButton).toBeVisible({ timeout: 10000 });

    // Sarah clicks the SAME (now booked/contendable) slot — impossible before the fix.
    await bookedButton.click();

    // Enter a high-priority purpose
    await page.locator("#purpose").fill("capstone project");

    // Submit
    await page.getByRole("button", { name: "Request booking" }).click();

    // Assert modal shows "Confirmed by priority" (Sarah outscores Mihir →
    // priority override demotes Mihir to the waitlist).
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByRole("heading")).toContainText("Confirmed by priority", {
      timeout: 10000,
    });

    // And a contender (Mihir) is shown in the explainer.
    await expect(dialog.getByText(/Mihir/i).first()).toBeVisible({ timeout: 10000 });

    // Close (footer button, not the X icon)
    await dialog.getByRole("button", { name: "Close" }).first().click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
