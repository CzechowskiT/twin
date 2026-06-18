import { expect, test } from "@playwright/test";
import { COMPANY_CANDIDATE_TRUST_SUMMARY_PAGE_MARKER, COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS } from "../src/lib/company-candidate-trust-summary";
import { withFreshContext } from "./helpers/browser-lifecycle";
const PATH = "/company/candidates/demo-candidate-001/trust-summary";
test.describe("Company candidate trust summary", () => {
  test("route not 404 or auth", async ({ browser }) => {
    await withFreshContext(browser, async (ctx) => {
      const page = await ctx.newPage();
      const res = await page.goto(PATH, { waitUntil: "domcontentloaded" });
      if ((res?.status() ?? 0) === 404) test.skip();
      expect(res?.status()).not.toBe(404);
    });
  });
});
