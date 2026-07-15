import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.env.DEMO_URL ?? "http://127.0.0.1:3001";
const out = join(process.cwd(), "reports/demo-frame-audit/dark-mockup-fidelity-2026-07-15");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
await page.addInitScript(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query) => {
      const q = String(query);
      return {
        matches: q.includes("prefers-reduced-motion") && q.includes("reduce"),
        media: q,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    },
  });
});

async function openRole(role) {
  await page.goto(`${base}/demo?lang=pl`, { waitUntil: "networkidle", timeout: 90000 });
  const skip = page.locator("[data-demo-video-skip]");
  if (await skip.count()) {
    await skip.click().catch(() => {});
  }
  await page.waitForSelector(`[data-demo-role-card="${role}"]`, { timeout: 30000 });
  await page.locator(`[data-demo-role-card="${role}"]`).first().click();
  await page.waitForSelector("[data-interactive-role-flow]", { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function jumpToPhase(phase) {
  const steps = page.locator("[data-demo-flow-step]");
  await steps.first().waitFor({ timeout: 10000 });
  const count = await steps.count();
  for (let i = 0; i < count; i++) {
    await steps.nth(i).click();
    await page.waitForTimeout(200);
    const p = await page.getAttribute("[data-demo-interactive-stage]", "data-demo-flow-phase");
    if (p === phase) return true;
  }
  return false;
}

for (const role of ["recruiter", "candidate"]) {
  await openRole(role);
  console.log(role, "highlight", await jumpToPhase("highlight"));
  await page.locator("[data-demo-cockpit-shell]").screenshot({
    path: join(out, `interactive-${role}-1440x900-highlight.png`),
  });
  console.log(role, "decision", await jumpToPhase("decision"));
  await page.locator("[data-demo-cockpit-shell]").screenshot({
    path: join(out, `interactive-${role}-1440x900-decision.png`),
  });
}

await browser.close();
console.log("captured", out);
