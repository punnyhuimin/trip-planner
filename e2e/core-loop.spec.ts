import { type Page, expect, test } from "@playwright/test";

// The baseline loop, by two people at once: create → join → wish → react →
// generate → both see the plan.

async function addWish(page: Page, title: string) {
  await page.getByRole("button", { name: "Add a wish" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a wish" });
  await dialog.getByLabel("What do you want to do?").fill(title);
  await dialog.getByText("Must-do", { exact: true }).click();
  await dialog.getByRole("button", { name: "Add wish" }).click();
  await expect(page.getByRole("article", { name: title })).toBeVisible();
}

test("two people plan a trip together", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  // 1. A creates the trip.
  await a.goto("/");
  await a.getByLabel("Trip name").fill("Smoke test trip");
  await a.getByLabel("First day").fill("2026-12-01");
  await a.getByLabel("Last day").fill("2026-12-03");
  await a.getByLabel("Your name").first().fill("Ana");
  await a.getByRole("button", { name: "Create trip" }).click();
  await a.waitForURL(/\/t\/[A-Z0-9]{10}$/);
  const code = a.url().split("/t/")[1];

  // 2. B joins with the code from the landing page.
  await b.goto("/");
  await b.getByLabel("Trip code").fill(code);
  await b.getByLabel("Your name").last().fill("Ben");
  await b.getByRole("button", { name: "Join trip" }).click();
  await b.waitForURL(`**/t/${code}`);
  await expect(b.getByText("No wishes yet")).toBeVisible();

  // 3. Both add a wish.
  await addWish(a, "Night market");
  await addWish(b, "Surf lesson");

  // 4. Each reacts IN to the other's wish (it arrives by polling).
  await b
    .getByRole("article", { name: "Night market" })
    .getByRole("button", { name: "I'm in" })
    .click();
  await a
    .getByRole("article", { name: "Surf lesson" })
    .getByRole("button", { name: "I'm in" })
    .click({ timeout: 10_000 });
  await expect(a.getByRole("article", { name: "Night market" }).getByText("In 2")).toBeVisible({
    timeout: 10_000,
  });

  // 5. A (the host) generates the plan.
  await a.getByRole("tab", { name: "Plan" }).click();
  await a.getByRole("button", { name: "Generate plan" }).click();
  await expect(a.getByRole("status")).toContainText("Plan updated");

  // 6. Both see it on Day 1.
  for (const page of [a, b]) {
    await page.getByRole("tab", { name: "Plan" }).click();
    const day1 = page.getByRole("tabpanel", { name: "Day 1" });
    await expect(day1.getByRole("article", { name: "Night market" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(day1.getByRole("article", { name: "Surf lesson" })).toBeVisible();
  }

  // B isn't the host, so B can't regenerate.
  await expect(b.getByRole("button", { name: /generate plan/i })).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});
