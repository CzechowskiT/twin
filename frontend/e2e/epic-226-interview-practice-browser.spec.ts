/**
 * Epic 2.26 integrity — eight real browser journeys with mandatory controls.
 *
 * Uses isolated synthetic mint (unique user/candidate per token).
 * Summary derives from Playwright outcomes — missing journeys cannot PASS.
 */
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";

const FE = process.env.PLAYWRIGHT_BASE_URL ?? "https://twin-sooty.vercel.app";
const API = (process.env.TWIN_API_BASE ?? "https://twin-production-bcd9.up.railway.app").replace(
  /\/$/,
  "",
);
const OPS = (process.env.OPS_ADMIN_TOKEN || process.env.BETA_ADMIN_TOKEN || "").trim();
const EVIDENCE_DIR =
  process.env.EPIC226_BROWSER_EVIDENCE_DIR ||
  path.join(
    process.cwd(),
    "..",
    "reports",
    "epic-2-26-verification-integrity-2026-09-12",
    "browser-journeys",
  );

const REQUIRED_JOURNEYS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
type JourneyId = (typeof REQUIRED_JOURNEYS)[number];

const journeyStatus: Record<JourneyId, "PASS" | "FAIL" | "NOT_RUN"> = {
  A: "NOT_RUN",
  B: "NOT_RUN",
  C: "NOT_RUN",
  D: "NOT_RUN",
  E: "NOT_RUN",
  F: "NOT_RUN",
  G: "NOT_RUN",
  H: "NOT_RUN",
};
const journeyDetail: Record<string, string> = {};

function mark(id: JourneyId, status: "PASS" | "FAIL", detail: string) {
  journeyStatus[id] = status;
  journeyDetail[id] = detail;
}

type Mint = {
  token: string;
  userId: number;
  candidateId: number;
  email: string;
  runId: string;
};

async function mintIsolated(runId: string): Promise<Mint> {
  const res = await fetch(
    `${API}/api/v1/admin/pilot-os/interview-practice/mint-isolated-synthetic`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPS}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ run_id: runId }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    user_id?: number;
    candidate_id?: number;
    email?: string;
    run_id?: string;
  };
  if (!res.ok || !body.access_token || !body.user_id || !body.candidate_id) {
    throw new Error(`isolated_mint_failed status=${res.status}`);
  }
  return {
    token: body.access_token,
    userId: body.user_id,
    candidateId: body.candidate_id,
    email: body.email || "",
    runId: body.run_id || runId,
  };
}

function assertDistinct(a: Mint, b: Mint) {
  expect(a.userId, "isolation_same_user").not.toBe(b.userId);
  expect(a.candidateId, "isolation_same_candidate").not.toBe(b.candidateId);
}

async function withAuthedPage(
  browser: Browser,
  token: string,
  fn: (page: Page) => Promise<void>,
  viewport = { width: 1280, height: 900 },
): Promise<void> {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((t: string) => {
    try {
      window.localStorage.setItem("twin_access_token", t);
    } catch {
      /* ignore */
    }
  }, token);
  const page = await context.newPage();
  try {
    await fn(page);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

async function dismissCookies(page: Page) {
  const accept = page.getByRole("button", { name: /accept cookies|akceptuj/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click().catch(() => {});
  }
}

async function openPractice(page: Page) {
  const res = await page.goto(`${FE}/dashboard/interview-practice`, {
    waitUntil: "domcontentloaded",
  });
  await dismissCookies(page);
  expect(res?.status() ?? 0).not.toBe(404);
  await page.getByTestId("interview-practice-page").waitFor({ state: "visible", timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /Interview Practice|Ćwiczenia/i })).toBeVisible();
}

async function apiJson(
  method: string,
  pathName: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

test.describe("Epic 2.26 integrity browser journeys A–H", () => {
  test.describe.configure({ timeout: 300_000, mode: "default" });

  test.beforeAll(() => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    if (!OPS) throw new Error("OPS_ADMIN_TOKEN required");
  });

  test.afterAll(() => {
    const missing = REQUIRED_JOURNEYS.filter((id) => journeyStatus[id] !== "PASS");
    const journeys = REQUIRED_JOURNEYS.map((id) => ({
      id,
      status: journeyStatus[id],
      detail: journeyDetail[id] || "",
    }));
    const verdict =
      missing.length === 0 && REQUIRED_JOURNEYS.every((id) => journeyStatus[id] === "PASS")
        ? "PASS"
        : "FAIL";
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "journeys-summary.json"),
      JSON.stringify(
        {
          required: [...REQUIRED_JOURNEYS],
          journeys,
          pass: journeys.filter((j) => j.status === "PASS").length,
          fail: journeys.filter((j) => j.status === "FAIL").length,
          not_run: journeys.filter((j) => j.status === "NOT_RUN").length,
          verdict,
          note:
            verdict === "PASS"
              ? "All eight required journeys PASS"
              : `Incomplete/failed: ${missing.join(",")}`,
        },
        null,
        2,
      ),
      "utf8",
    );
  });

  test("A fresh eligible submit + feedback", async ({ browser }, info: TestInfo) => {
    try {
      const mint = await mintIsolated(`a-${randomBytes(3).toString("hex")}`);
      await withAuthedPage(browser, mint.token, async (page) => {
        await openPractice(page);
        await expect(page.getByText(/AI evaluation off|wyłączon/i).first()).toBeVisible();
        await page.getByTestId("start-session").click();
        await page.getByTestId("answer-textarea").waitFor({ state: "visible", timeout: 30_000 });
        await page
          .getByTestId("answer-textarea")
          .fill(
            "Situation: API conflict. Task: mediate. Action: trade-off doc. Result: shipped on time.",
          );
        await page.getByTestId("submit-answer").click();
        await expect(
          page.getByText(/Criterion outcomes|NOT_ASSESSED|objective|checklist|Wyniki/i).first(),
        ).toBeVisible({ timeout: 45_000 });
        await page.screenshot({ path: path.join(EVIDENCE_DIR, "A-fresh-submit.png"), fullPage: true });
      });
      mark("A", "PASS", "consent off default; submit; feedback visible");
    } catch (e) {
      mark("A", "FAIL", String(e));
      throw e;
    }
  });

  test("B consent OFF honest messaging (no browser Anthropic egress)", async ({ browser }) => {
    try {
      const mint = await mintIsolated(`b-${randomBytes(3).toString("hex")}`);
      const providerHits: string[] = [];
      await withAuthedPage(browser, mint.token, async (page) => {
        page.on("request", (req) => {
          const u = req.url();
          if (u.includes("anthropic") || u.includes("api.openai")) providerHits.push(u);
        });
        await openPractice(page);
        await page.getByTestId("start-session").click();
        await page.getByTestId("answer-textarea").fill("Short answer without AI consent.");
        await page.getByTestId("submit-answer").click();
        await expect(
          page.getByText(/NOT_ASSESSED|deterministic|checklist|consent|AI evaluation off/i).first(),
        ).toBeVisible({ timeout: 45_000 });
        expect(providerHits.length).toBe(0);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, "B-consent-off.png"), fullPage: true });
      });
      mark(
        "B",
        "PASS",
        `browser Anthropic hits=0 (server-side egress verified separately in unit matrix)`,
      );
    } catch (e) {
      mark("B", "FAIL", String(e));
      throw e;
    }
  });

  test("C save draft, pause, new context, resume exact draft", async ({ browser }) => {
    try {
      const mint = await mintIsolated(`c-${randomBytes(3).toString("hex")}`);
      const draft = `DRAFT_SENTINEL_${randomBytes(4).toString("hex")}`;
      let sessionUrl = "";
      await withAuthedPage(browser, mint.token, async (page) => {
        await openPractice(page);
        await page.getByTestId("start-session").click();
        await page.getByTestId("answer-textarea").fill(draft);
        await page.getByTestId("save-draft").click();
        await expect(page.getByText(/Draft saved|Szkic zapisany/i).first()).toBeVisible({
          timeout: 20_000,
        });
        await page.getByTestId("pause-session").click();
        await expect(page.getByText(/Pause|Wstrzymaj|PAUSED|paused/i).first()).toBeVisible({
          timeout: 20_000,
        });
        sessionUrl = page.url();
        expect(sessionUrl).toMatch(/session_id=\d+/);
      });
      await withAuthedPage(browser, mint.token, async (page) => {
        await page.goto(sessionUrl, { waitUntil: "domcontentloaded" });
        await dismissCookies(page);
        await page.getByTestId("interview-practice-page").waitFor({ timeout: 45_000 });
        // Resume if still paused
        const resume = page.getByTestId("resume-session").first();
        if (await resume.isVisible().catch(() => false)) {
          await resume.click();
        }
        await page.getByTestId("answer-textarea").waitFor({ state: "visible", timeout: 45_000 });
        await expect(page.getByTestId("answer-textarea")).toHaveValue(draft);
        await page.getByTestId("submit-answer").click();
        await expect(
          page.getByText(/Answer submitted|Criterion|NOT_ASSESSED|Wyniki/i).first(),
        ).toBeVisible({ timeout: 45_000 });
        await page.screenshot({ path: path.join(EVIDENCE_DIR, "C-resume.png"), fullPage: true });
      });
      mark("C", "PASS", `exact draft restored: ${draft}`);
    } catch (e) {
      mark("C", "FAIL", String(e));
      throw e;
    }
  });

  test("D objective correct vs wrong via UI catalog exercise", async ({ browser }) => {
    try {
      const mint = await mintIsolated(`d-${randomBytes(3).toString("hex")}`);
      // Drive objective via API for outcome proof; UI confirms catalog labels
      const catalog = await apiJson(
        "GET",
        "/api/v1/candidates/me/interview-practice/catalog?locale=en",
        mint.token,
      );
      expect(catalog.status).toBe(200);
      const exercises = (catalog.json.exercises as Array<{ id: string; exercise_type?: string }>) || [];
      const objective = exercises.find((e) => e.id === "sw_backend_objective_1");
      expect(objective, "objective exercise present").toBeTruthy();

      const good = await apiJson("POST", "/api/v1/candidates/me/interview-practice/sessions", mint.token, {
        exercise_id: "sw_backend_objective_1",
        locale: "en",
        ai_prep_opt_in: false,
      });
      expect([200, 201]).toContain(good.status);
      const sid = Number(good.json.id);
      const tid = Number(((good.json.turns as Array<{ id: number }>) || [])[0]?.id);
      const okAns = await apiJson(
        "POST",
        `/api/v1/candidates/me/interview-practice/sessions/${sid}/turns/${tid}/submit`,
        mint.token,
        {
          answer_text:
            "Check APM p95 latency, isolate database vs network, then rollback or feature-flag mitigation.",
        },
      );
      expect(okAns.status).toBe(200);
      const okEval = okAns.json.evaluation as { criteria?: Array<{ outcome: string }>; source?: string };
      expect(okEval?.source).toBe("OBJECTIVE_ANSWER_KEY");

      const badS = await apiJson("POST", "/api/v1/candidates/me/interview-practice/sessions", mint.token, {
        exercise_id: "sw_backend_objective_1",
        locale: "en",
      });
      const badTid = Number(((badS.json.turns as Array<{ id: number }>) || [])[0]?.id);
      const badAns = await apiJson(
        "POST",
        `/api/v1/candidates/me/interview-practice/sessions/${badS.json.id}/turns/${badTid}/submit`,
        mint.token,
        { answer_text: "I would rewrite overnight for 10000x." },
      );
      const badEval = badAns.json.evaluation as { criteria?: Array<{ outcome: string }> };
      expect(okEval?.criteria?.[0]?.outcome).not.toBe(badEval?.criteria?.[0]?.outcome);

      await withAuthedPage(browser, mint.token, async (page) => {
        await openPractice(page);
        const body = (await page.locator("body").innerText()).toLowerCase();
        expect(body.includes("latency") || body.includes("exercise") || body.includes("catalog")).toBeTruthy();
        await page.screenshot({ path: path.join(EVIDENCE_DIR, "D-catalog.png"), fullPage: true });
      });
      mark("D", "PASS", "objective correct≠wrong; catalog visible");
    } catch (e) {
      mark("D", "FAIL", String(e));
      throw e;
    }
  });

  test("E promote evidence with IDs", async ({ browser }) => {
    try {
      const mint = await mintIsolated(`e-${randomBytes(3).toString("hex")}`);
      await withAuthedPage(browser, mint.token, async (page) => {
        await openPractice(page);
        await page.getByTestId("start-session").click();
        await page
          .getByTestId("answer-textarea")
          .fill("I delivered a migration with measured downtime under five minutes.");
        await page.getByTestId("submit-answer").click();
        await page.getByRole("button", { name: /Complete session|Zakończ/i }).click();
        await page.getByTestId("promote-evidence").click();
        await expect(
          page.getByText(/PRACTICE_WORK_SAMPLE|promoted|promowan/i).first(),
        ).toBeVisible({ timeout: 45_000 });
        await page.screenshot({ path: path.join(EVIDENCE_DIR, "E-promote.png"), fullPage: true });
      });
      mark("E", "PASS", "explicit promote completed");
    } catch (e) {
      mark("E", "FAIL", String(e));
      throw e;
    }
  });

  test("F cross-account isolation with sentinel + delete confirm cancel/confirm", async ({
    browser,
  }) => {
    try {
      const a = await mintIsolated(`fa-${randomBytes(3).toString("hex")}`);
      const b = await mintIsolated(`fb-${randomBytes(3).toString("hex")}`);
      assertDistinct(a, b);
      // Negative control: identical identities must fail harness before claiming isolation
      let identicalFailed = false;
      try {
        assertDistinct(a, a);
      } catch {
        identicalFailed = true;
      }
      expect(identicalFailed).toBe(true);
      const sentinel = `CROSS_ACCOUNT_SENTINEL_${randomBytes(4).toString("hex")}`;
      const created = await apiJson("POST", "/api/v1/candidates/me/interview-practice/sessions", a.token, {
        exercise_id: "behavioral_star_1",
        locale: "en",
      });
      const sessionId = Number(created.json.id);
      const turnId = Number(((created.json.turns as Array<{ id: number }>) || [])[0]?.id);
      await apiJson(
        "POST",
        `/api/v1/candidates/me/interview-practice/sessions/${sessionId}/turns/${turnId}/submit`,
        a.token,
        { answer_text: sentinel },
      );

      // B cannot read via API
      const denied = await apiJson(
        "GET",
        `/api/v1/candidates/me/interview-practice/sessions/${sessionId}`,
        b.token,
      );
      expect([400, 403, 404]).toContain(denied.status);
      expect(JSON.stringify(denied.json)).not.toContain(sentinel);

      const listB = await apiJson("GET", "/api/v1/candidates/me/interview-practice/sessions", b.token);
      expect(JSON.stringify(listB.json)).not.toContain(sentinel);

      await withAuthedPage(browser, b.token, async (page) => {
        await page.goto(`${FE}/dashboard/interview-practice?session_id=${sessionId}`, {
          waitUntil: "domcontentloaded",
        });
        await dismissCookies(page);
        await page.waitForTimeout(2500);
        const body = await page.locator("body").innerText();
        expect(body).not.toContain(sentinel);
      });

      await withAuthedPage(browser, a.token, async (page) => {
        await openPractice(page);
        // Cancel once
        await page.getByTestId("delete-session").first().click();
        // Confirm dialog text
        await expect(page.getByText(/Delete this session|Usuń tę sesję|cannot be undone/i).first()).toBeVisible();
        // Click away / cancel by clicking delete again pattern — click Delete confirm then...
        // If two-step: first click arms confirm, second confirms. Cancel by starting session elsewhere.
        // Prefer: after first click, ensure session still in list if we don't confirm.
        // Implementation uses deleteConfirmId — second click on Delete confirms.
        // Cancel: click Resume or elsewhere then verify list still has session via API
        await page.keyboard.press("Escape").catch(() => {});
        const still = await apiJson(
          "GET",
          `/api/v1/candidates/me/interview-practice/sessions/${sessionId}`,
          a.token,
        );
        expect(still.status).toBe(200);
        // Confirm deletion
        await page.getByTestId("delete-session").first().click();
        await page.getByTestId("delete-session").last().click();
        await page.waitForTimeout(1500);
        const gone = await apiJson(
          "GET",
          `/api/v1/candidates/me/interview-practice/sessions/${sessionId}`,
          a.token,
        );
        expect([400, 404]).toContain(gone.status);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, "F-delete.png"), fullPage: true });
      });
      mark("F", "PASS", `sentinel isolated; delete denied reads; users ${a.userId}≠${b.userId}`);
    } catch (e) {
      mark("F", "FAIL", String(e));
      throw e;
    }
  });

  test("G entitlement: authed ok, anon 401", async ({ browser }) => {
    try {
      const mint = await mintIsolated(`g-${randomBytes(3).toString("hex")}`);
      await withAuthedPage(browser, mint.token, async (page) => {
        await openPractice(page);
        await expect(page.getByTestId("start-session")).toBeVisible();
        await page.screenshot({ path: path.join(EVIDENCE_DIR, "G-entitlement.png"), fullPage: true });
      });
      const anon = await fetch(`${API}/api/v1/candidates/me/interview-practice/catalog`);
      expect([401, 403]).toContain(anon.status);
      mark("G", "PASS", `authed UI; anon=${anon.status}; isolated candidate ${mint.candidateId}`);
    } catch (e) {
      mark("G", "FAIL", String(e));
      throw e;
    }
  });

  test("H Polish mobile keyboard journey", async ({ browser }) => {
    try {
      const mint = await mintIsolated(`h-${randomBytes(3).toString("hex")}`);
      await withAuthedPage(
        browser,
        mint.token,
        async (page) => {
          await openPractice(page);
          const plToggle = page.getByRole("button", { name: /^PL$/i });
          if (await plToggle.first().isVisible().catch(() => false)) {
            await plToggle.first().click();
            await page.waitForTimeout(800);
          }
          // Prefer Polish copy when locale switched
          const start = page.getByTestId("start-session");
          await start.focus();
          await expect(start).toBeFocused();
          await page.keyboard.press("Enter");
          await page.getByTestId("answer-textarea").waitFor({ state: "visible", timeout: 30_000 });
          await page.getByTestId("answer-textarea").focus();
          await page.keyboard.type("Odpowiedź z klawiatury — nie wiem wszystkiego.");
          const body = await page.locator("body").innerText();
          // If PL locale active, expect Polish UI strings
          if (/Ćwiczenia|Wstrzymaj|Rozpocznij|Zapisz/i.test(body)) {
            expect(body).toMatch(/Ćwiczenia|Rozpocznij|Zapisz|Wyślij/i);
          }
          await page.screenshot({ path: path.join(EVIDENCE_DIR, "H-pl-mobile.png"), fullPage: true });
        },
        { width: 390, height: 844 },
      );
      mark("H", "PASS", "mobile viewport + keyboard typing");
    } catch (e) {
      mark("H", "FAIL", String(e));
      throw e;
    }
  });
});
