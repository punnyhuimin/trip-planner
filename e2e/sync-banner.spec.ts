import { type Page, expect, test } from "@playwright/test";

// When polling stops getting through, the trip page says so, and the banner
// clears once a poll succeeds again. Polls run every 5 s, hence the timeouts.

const POLL = { timeout: 15_000 };
const STATE_URL = /\/api\/trips\/[A-Z0-9]+\/state/;

async function createTrip(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByLabel("Trip name").fill("Sync trip");
  await page.getByLabel("First day").fill("2026-12-01");
  await page.getByLabel("Last day").fill("2026-12-02");
  await page.getByLabel("Your name").first().fill("Ana");
  await page.getByRole("button", { name: "Create trip" }).click();
  await page.waitForURL(/\/t\/[A-Z0-9]{6}$/);
  return page.url().split("/t/")[1];
}

test("offline: shows the last sync time, then clears", async ({ page, context }) => {
  await createTrip(page);
  const banner = page.getByText(/Can't reach the server/);

  await context.setOffline(true);
  await expect(banner).toBeVisible(POLL);
  await expect(banner).toContainText(/showing data from \d{1,2}:\d{2}/);

  await context.setOffline(false);
  await expect(banner).toBeHidden(POLL);
});

test("404: says the trip is gone, then clears", async ({ page }) => {
  await createTrip(page);
  const banner = page.getByText("This trip no longer exists.");

  await page.route(STATE_URL, (route) =>
    route.fulfill({ status: 404, json: { error: "Trip not found" } }),
  );
  await expect(banner).toBeVisible(POLL);
  await expect(page.getByRole("link", { name: "Back to start" })).toBeVisible();

  await page.unroute(STATE_URL);
  await expect(banner).toBeHidden(POLL);
});

test("401: offers a rejoin link that leads back into the trip", async ({ page, context }) => {
  const code = await createTrip(page);

  await context.clearCookies();
  const rejoin = page.getByRole("link", { name: `Rejoin ${code}` });
  await expect(rejoin).toBeVisible(POLL);
  await expect(page.getByText("You're no longer signed in to this trip.")).toBeVisible();

  await rejoin.click();
  await expect(page.getByRole("heading", { name: "Join Sync trip" })).toBeVisible();
  // The rejoin link is a full page load: a fill made before hydration gets
  // wiped, so retry until the join actually lands on the trip.
  await expect(async () => {
    await page.getByLabel("Your name").fill("Ana again");
    await page.getByRole("button", { name: "Join trip" }).click();
    await expect(page.getByRole("tab", { name: "Plan" })).toBeVisible({ timeout: 2_000 });
  }).toPass(POLL);
  await expect(page.getByText("You're no longer signed in to this trip.")).toHaveCount(0);
});
