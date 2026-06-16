import { expect, test } from "@playwright/test";

import { loginPathWithNext } from "../src/lib/login-redirect";

const DEEPLINK_CASES = [
  { path: "/recruiter/pipeline", login: "/login/recruiter" },
  { path: "/recruiter/talent-radar/digest", login: "/login/recruiter" },
  { path: "/dashboard/career", login: "/login/candidate" },
  { path: "/company/talent-pool", login: "/login/company" },
  { path: "/investor/metrics", login: "/login/investor" },
] as const;

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.describe("workspace deep-link new tab", () => {
  for (const row of DEEPLINK_CASES) {
    test(`unauthenticated ${row.path} exposes login with next=`, async ({ page, context }) => {
      await context.clearCookies();
      await context.addInitScript(() => {
        try {
          window.localStorage?.clear();
          window.sessionStorage?.clear();
        } catch {
          // ignore
        }
      });
      const loginHref = loginPathWithNext(row.login, row.path);
      await page.goto(row.path, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForFunction(
        ([login, dest, href]) => {
          const url = new URL(window.location.href);
          if (url.pathname === login && url.searchParams.get("next") === dest) return true;
          const link = document.querySelector(`a[href="${href}"]`);
          return link instanceof HTMLAnchorElement;
        },
        [row.login, row.path, loginHref],
        { timeout: 45_000 },
      );
    });
  }

  test("recruiter hub module card exposes real href for pipeline", async ({ page, context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      try {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      } catch {
        // ignore
      }
    });
    const loginHref = loginPathWithNext("/login/recruiter", "/recruiter");
    await page.goto("/recruiter", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForFunction(
      ([href]) => {
        const card = document.querySelector("[data-workspace-module='pipeline'] a[href]");
        if (card instanceof HTMLAnchorElement && /\/recruiter\/pipeline/.test(card.getAttribute("href") ?? "")) {
          return true;
        }
        const url = new URL(window.location.href);
        if (url.pathname === "/login/recruiter" && url.searchParams.get("next") === "/recruiter") {
          return true;
        }
        return Boolean(document.querySelector(`a[href="${href}"]`));
      },
      [loginHref],
      { timeout: 45_000 },
    );
  });
});
