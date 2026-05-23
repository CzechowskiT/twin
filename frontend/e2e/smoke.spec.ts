import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("homepage loads hero and waitlist CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("link", { name: /wishlist|waitlist|lista/i }).first()).toBeVisible();
  });

  test("waitlist page shows signup form", async ({ page }) => {
    await page.goto("/waitlist");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
  });

  test("login hub loads candidate zone", async ({ page }) => {
    await page.goto("/login/candidate");
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test("demo page loads live snapshot section", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.locator("body")).toBeVisible();
    const res = await page.request.get("/api/v1/demo/snapshot");
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = (await res.json()) as { demo_mode?: boolean; source?: string };
      expect(body.demo_mode).toBeTruthy();
    }
  });
});
