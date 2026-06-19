import { expect, test, type Page } from "@playwright/test";
import { WORK_ITEMS_PAGE_MARKER, WORK_ITEMS_RECRUITER_ROUTE } from "../src/lib/work-items";
import { withFreshContext } from "./helpers/browser-lifecycle";

async function goto(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res?.status() ?? 0).not.toBe(404);
  await page.locator(`[data-work-items-page="${WORK_ITEMS_PAGE_MARKER}"]`).first().waitFor({ timeout: 12000 }).catch(() => undefined);
}

test.describe("Work items browser", () => {
  test("recruiter route resolves", async ({ browser }) => {
    await withFreshContext(browser, async (ctx) => {
      const page = await ctx.newPage();
      await goto(page, WORK_ITEMS_RECRUITER_ROUTE);
      expect((await page.locator("body").innerText()).length).toBeGreaterThan(32);
    });
  });
});
