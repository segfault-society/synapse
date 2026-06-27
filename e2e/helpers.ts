import { Page, expect } from "@playwright/test";

/**
 * Switch the persona switcher in the header to the member whose name matches
 * the given string (partial match, case-insensitive).
 */
export async function switchPersona(page: Page, nameFragment: string): Promise<void> {
  const header = page.locator("header");

  // Click the Select trigger (the combobox role)
  await header.getByRole("combobox").click();

  // Click the option that contains the name fragment
  await page.getByRole("option", { name: new RegExp(nameFragment, "i") }).click();

  // Wait for the badge in the header to appear (persona is now active)
  await expect(header.locator('[data-slot="badge"]')).toBeVisible({ timeout: 10000 });
}

/**
 * Click the first free (non-disabled) slot button on the resource detail page.
 * Returns the aria-label of the clicked slot.
 *
 * Strategy: wait for networkidle (Supabase busy-fetch done), then iterate all
 * slot buttons and click the first one that has no HTML disabled attribute.
 * Using explicit iteration avoids stale-element races from lazy re-evaluation.
 */
export async function clickFirstFreeSlot(page: Page): Promise<string> {
  // Wait for network to settle so busy-state Supabase fetch completes
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
    // networkidle may not resolve in some cases; continue anyway
  });

  // Find all slot buttons (they all have aria-label with time ranges).
  // Web-first assertion (replaces fixed sleep): wait until the slot grid has
  // rendered AND at least one FREE (non-disabled) slot — the element we are
  // about to click — is visible. Busy slots carry the HTML `disabled` attr, so
  // `:not([disabled])` targets exactly the free ones.
  const allSlotButtons = page.locator("button[aria-label]");
  await expect(allSlotButtons.first()).toBeVisible({ timeout: 10000 });
  const freeSlotButtons = page.locator("button[aria-label]:not([disabled])");
  await expect(freeSlotButtons.first()).toBeVisible({ timeout: 10000 });

  // Iterate to find a button that is NOT HTML-disabled and NOT marked busy
  const count = await allSlotButtons.count();
  let targetLabel: string | null = null;

  for (let i = 0; i < count; i++) {
    const btn = allSlotButtons.nth(i);
    const isDisabled = await btn.getAttribute("disabled");
    const ariaLabel = await btn.getAttribute("aria-label");
    // Skip if HTML disabled present, or the slot is already booked. Booked
    // slots are now contendable (no `disabled` attr) and carry "(booked …" in
    // their aria-label, so match that to find a genuinely FREE slot.
    if (isDisabled !== null || (ariaLabel && ariaLabel.includes("(booked"))) {
      continue;
    }
    targetLabel = ariaLabel;
    break;
  }

  if (!targetLabel) {
    throw new Error("No free slot found on this resource page");
  }

  // Click by exact aria-label using attribute selector
  await page.locator(`button[aria-label="${targetLabel}"]`).click();
  return targetLabel;
}

/**
 * Pick a deterministic free slot "a few days out" so two separate test runs
 * (Mihir then Sarah) target the SAME slot. Strategy: collect every free
 * (non-booked) slot label in DOM order and return the one at `index`.
 *
 * After Mihir books a slot it becomes amber/booked (aria-label contains
 * "(booked"), so Sarah must NOT use this helper to find it — she clicks the
 * exact label string captured from Mihir's run instead.
 *
 * Returns the aria-label of the slot at the given index among free slots.
 */
export async function pickFreeSlotLabel(page: Page, index = 0): Promise<string> {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

  const allSlotButtons = page.locator("button[aria-label]");
  await expect(allSlotButtons.first()).toBeVisible({ timeout: 10000 });

  const count = await allSlotButtons.count();
  const freeLabels: string[] = [];
  for (let i = 0; i < count; i++) {
    const ariaLabel = await allSlotButtons.nth(i).getAttribute("aria-label");
    if (!ariaLabel) continue;
    // Free slots have a plain time-range label; booked ones include "(booked".
    if (ariaLabel.includes("(booked")) continue;
    freeLabels.push(ariaLabel);
  }

  if (freeLabels.length <= index) {
    throw new Error(
      `Need a free slot at index ${index} but only found ${freeLabels.length}`,
    );
  }
  return freeLabels[index];
}

/**
 * Navigate to Lab-A resource detail page.
 * Clicks the Lab-A card from the homepage (or navigates via grid).
 */
export async function goToLabA(page: Page): Promise<void> {
  await page.goto("/");

  // Wait for spinner to go away
  await expect(page.locator(".animate-spin")).not.toBeVisible({ timeout: 15000 });

  // Click the link that contains the Lab-A heading (the card is a Link wrapper)
  await page.getByRole("link", { name: /Lab-A/ }).first().click();

  // Wait for the resource detail page URL to change
  await page.waitForURL(/\/resources\//, { timeout: 10000 });

  // Wait for the resource detail page to show the slot picker (Book a slot heading)
  await expect(page.getByRole("heading", { name: "Book a slot" })).toBeVisible({
    timeout: 15000,
  });
}
