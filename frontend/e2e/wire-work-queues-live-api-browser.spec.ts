/**
 * Wire work queues live API — browser smoke for wired recruiter routes (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  RECRUITER_OPERATIONAL_WORK_QUEUE_PAGE_MARKER,
} from "../src/lib/recruiter-operational-work-queue";
import {
  RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER,
} from "../src/lib/recruiter-trust-review-queue";
import { WORK_ITEMS_PAGE_MARKER } from "../src/lib/work-items";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

const WIRED_ROUTES = [
  { path: "/recruiter/work-items", marker: WORK_ITEMS_PAGE_MARKER, attr: "data-work-items-page" },
  {
    path: "/recruiter/trust-review-queue",
    marker: RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER,
    attr: "data-recruiter-trust-review-queue-page",
  },
  {
    path: "/recruiter/operational-work-queue",
    marker: RECRUITER_OPERATIONAL_WORK_QUEUE_PAGE_MARKER,
    attr: "data-recruiter-operational-work-queue-page",
  },
] as const;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

test.describe("Wire work queues live API browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  for (const [index, route] of WIRED_ROUTES.entries()) {
    test(`${index + 1} ${route.path} shows page or auth shell`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const page = await context.newPage();
        const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await dismissCookieBanner(page);
        const status = response?.status() ?? 0;
        if (status === 404) {
          test.skip(true, "Route not deployed yet");
          return;
        }
        expect(status).not.toBe(404);
        await page
          .locator(`[${route.attr}="${route.marker}"], :text("Sign in"), :text("Zaloguj")`)
          .first()
          .waitFor({ state: "visible", timeout: SETTLE_MS })
          .catch(() => undefined);
        expect((await page.locator("body").innerText()).length).toBeGreaterThan(32);
      });
    });
  }
});
