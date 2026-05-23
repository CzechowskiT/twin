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
});
