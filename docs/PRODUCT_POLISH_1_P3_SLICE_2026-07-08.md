# Product Polish 1.0 — P3 slice (2026-07-08)

**Scope:** frontend/UI only. Builds on P0/P1/P2 (`docs/PRODUCT_POLISH_1_P0_SLICE_2026-07-08.md`, `docs/PRODUCT_POLISH_1_P1_SLICE_2026-07-08.md`, `docs/PRODUCT_POLISH_1_P2_SLICE_2026-07-08.md`). No backend/API/auth/DB/env.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Implemented (P3)

| # | Area | Change |
|---|------|--------|
| 1 | Badges | `DemoJourneyPilotStatus` + `WorkspaceStatusBadge` on remaining demo journey workspaces (candidate trust, recruiter collaboration/pipeline/360, company trust, investor proof). |
| 2 | Investor login | `needs_setup` → invite-only preview copy; `/login/investor` premium banner. |
| 3 | Demo copy | Unified `productPolish.demoJourneyLead` — demo data, pilot preview, not public launch, human decision required. |
| 4 | Status labels | `statusPilot` → **Limited Pilot**; technical IDs hidden from visible scheduling/hiring journey headers. |
| 5 | Deep links | Status/copy only on career, evidence, interview-prep, referrals, placement, scheduling — routes unchanged. |
| 6 | Guard | `frontend/scripts/product-polish-p3-guard.test.ts` + `npm run test:product-polish-p3-guard`. |

**Flags:** `frontend/src/lib/product-polish-p3.ts`

---

## Hotfix polish included in P3

| # | Area | Change |
|---|------|--------|
| 1 | Homepage marquee | Partner logo cards narrowed — `width: auto`, `min-width: 88px`, `max-width: 140px`, `padding: 0.75rem 1rem` (`.partner-logo-card` in `globals.css`). |
| 2 | Pilot preview bar | Hidden on public auth/landing: `/login`, `/register`, `/waitlist`, `/first-1000`, `/demo`, `/how-it-works` (and subpaths). |
| 3 | Pilot chrome gating | `PilotPreviewBoundary` only mounts when `isPilotPreviewChromePath()` — true pilot/deep workspace demo paths only. |
| 4 | Scope guard | No route deletion, no backend/API/auth/DB/env changes, launch stance unchanged. |

**Commit:** `7827637e` — `fix(ui): tighten logo marquee cards and hide pilot preview bar on /login`

---

## Post-merge visual QA checklist

- [ ] **Homepage marquee:** logo cards not oversized; plates hug logo marks.
- [ ] **`/login`, `/register`, `/demo`:** no amber pilot preview bar in site chrome.
- [ ] **Pilot/deep workspace path** (e.g. `/recruiter/daily-cockpit`): pilot preview boundary still visible.
- [ ] **Investor login** (`/login/investor`): invite-only preview badge — not “needs setup”.

---

## UX impact

- **Demo journeys:** One calm badge tier (Preview / Limited Pilot) instead of ad-hoc amber chips and raw `pilotBadge` strings.
- **Investor login:** Reads as invite-only preview, not “needs setup”.
- **Deep links:** Bookmarked pilot routes show honest preview status before sample content.

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
