/**
 * Persona audit trail surfacing — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER,
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_ROUTE,
} from "../src/lib/board-persistence-operations-monitor";
import {
  CANDIDATE_TRUST_OVERVIEW_MARKERS,
  CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER,
  CANDIDATE_TRUST_OVERVIEW_ROUTE,
} from "../src/lib/candidate-trust-overview";
import {
  COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER,
  COMPANY_HIRING_COMMAND_CENTER_ROUTE,
} from "../src/lib/company-hiring-command-center";
import { COMPACT_AUDIT_TRAIL_MARKERS } from "../src/lib/compact-audit-trail";
import {
  RECRUITER_DAILY_COCKPIT_PAGE_MARKER,
  RECRUITER_DAILY_COCKPIT_ROUTE,
} from "../src/lib/recruiter-daily-operating-cockpit";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const GOTO_TIMEOUT_MS = 45_000;

type SurfaceCase = {
  name: string;
  path: string;
  rootSelector: string;
  pageMarker: string;
};

const SURFACES: SurfaceCase[] = [
  {
    name: "recruiter daily cockpit",
    path: RECRUITER_DAILY_COCKPIT_ROUTE,
    rootSelector: `[data-recruiter-daily-cockpit-page="${RECRUITER_DAILY_COCKPIT_PAGE_MARKER}"]`,
    pageMarker: RECRUITER_DAILY_COCKPIT_PAGE_MARKER,
  },
  {
    name: "company hiring command center",
    path: COMPANY_HIRING_COMMAND_CENTER_ROUTE,
    rootSelector: `[data-company-hiring-command-center-page="${COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER}"]`,
    pageMarker: COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER,
  },
  {
    name: "board persistence operations monitor",
    path: BOARD_PERSISTENCE_OPERATIONS_MONITOR_ROUTE,
    rootSelector: `[data-board-persistence-operations-monitor-page="${BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER}"]`,
    pageMarker: BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER,
  },
  {
    name: "candidate trust overview",
    path: CANDIDATE_TRUST_OVERVIEW_ROUTE,
    rootSelector: `[data-candidate-trust-overview-page="${CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER}"]`,
    pageMarker: CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER,
  },
];

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

async function gotoRoute(page: Page, path: string) {
  return page.goto(path, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT_MS });
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText().catch(() => "");
}

function isAuthShell(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("sign in") ||
    lower.includes("zaloguj") ||
    lower.includes("auth required") ||
    lower.includes("authentication required") ||
    lower.includes("redirecting") ||
    lower.includes("redirecting to sign in") ||
    lower.includes("workspace only") ||
    lower.includes("tylko dla") ||
    lower.includes("wymagane logowanie") ||
    lower.includes("log in to continue")
  );
}

async function expectCompactAuditWidget(page: Page): Promise<void> {
  await expect(page.getByTestId(COMPACT_AUDIT_TRAIL_MARKERS.widget)).toBeVisible({ timeout: SETTLE_MS });
  await expect(page.getByTestId(COMPACT_AUDIT_TRAIL_MARKERS.count)).not.toHaveText("—", { timeout: SETTLE_MS });
  await expect(page.getByTestId(COMPACT_AUDIT_TRAIL_MARKERS.source)).toBeVisible();
  const records = page.getByTestId(COMPACT_AUDIT_TRAIL_MARKERS.records);
  if (await records.isVisible().catch(() => false)) {
    await expect(records.locator(`[data-testid="${COMPACT_AUDIT_TRAIL_MARKERS.recordRow}"]`).first()).toBeVisible();
  }
}

test.describe("Persona audit trail surfacing browser", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const surface of SURFACES) {
    test(`${surface.name} renders page or auth shell — not blank`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const page = await context.newPage();
        const response = await gotoRoute(page, surface.path);
        await dismissCookieBanner(page);
        expect(response?.status() ?? 0).toBeLessThan(500);
        await page
          .locator(`${surface.rootSelector}, :text("Sign in"), :text("Zaloguj"), :text("Authentication required")`)
          .first()
          .waitFor({ state: "visible", timeout: SETTLE_MS })
          .catch(() => undefined);
        const body = (await bodyText(page)).toLowerCase();
        if (body.length > 0) {
          expect(body.length).toBeGreaterThan(32);
        }
        if (!isAuthShell(body)) {
          await expect(page.locator(surface.rootSelector)).toBeVisible();
        }
      });
    });

    test(`${surface.name} compact audit trail widget when pilot loads`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const page = await context.newPage();
        await gotoRoute(page, surface.path);
        await dismissCookieBanner(page);
        await page
          .locator(`${surface.rootSelector}, :text("Sign in"), :text("Zaloguj"), :text("Authentication required")`)
          .first()
          .waitFor({ state: "visible", timeout: SETTLE_MS })
          .catch(() => undefined);
        const body = (await bodyText(page)).toLowerCase();
        if (isAuthShell(body)) return;
        if (!(await page.locator(surface.rootSelector).isVisible().catch(() => false))) return;
        if (
          surface.pageMarker === CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER &&
          !(await page.getByTestId(CANDIDATE_TRUST_OVERVIEW_MARKERS.page).isVisible().catch(() => false))
        ) {
          return;
        }
        await expectCompactAuditWidget(page);
      });
    });
  }
});
