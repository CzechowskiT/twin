# Product Polish 1.0 — P0 slice (2026-07-08)

**Scope:** frontend/UI only — hide/simplify limited-launch surfaces. No backend/API/auth/DB/env changes.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Audit context:** `docs/PRODUCT_UX_AUDIT_2026-07-08.md` (PR #410, merged to `cursor/phase1-monorepo-scaffold` @ `2c5fd019`).

---

## Implemented (P0)

| # | Area | Change |
|---|------|--------|
| 1 | Candidate `/dashboard` | `NightlyAutoApplyStrip` / `#auto-apply-readiness` removed from home flow; hero = `DashboardCommandCenter` + core quick links; secondary islands in collapsed `<details data-dashboard-extended-modules>`. |
| 2 | Recruiter `/recruiter` | Daily Cockpit + Trust Review promo cards gated off (`SHOW_RECRUITER_HUB_PRIMARY_PROMOS = false`); live quick actions = inbox, pipeline, jobs, search; SoR hub keeps roadmap access. |
| 3 | Demo deep links | `PilotPreviewBoundary` in `SiteChrome` + `isPilotPreviewDeepLinkPath()` — banner copy via `productPolish.pilotPreviewBanner`; routes not deleted. |
| 4 | Homepage CTAs | Primary = waitlist pill; register demoted to `twin-link` text on hero, CTA band, register teaser, inside steps. Header `/demo` + `/waitlist` unchanged. |
| 5 | Logo marquee | `site.marqueeLogoDisclaimer` under full marketing marquee in `SiteTopMarquee`. |
| 6 | Guard | `frontend/scripts/product-polish-p0-guard.test.ts` + `npm run test:product-polish-p0-guard`. |

**Flags:** `frontend/src/lib/product-polish-p0.ts` — flip booleans to restore pre-P0 density without deleting routes.

---

## Deferred (P1+)

- Partners/Careers/Media footer hide or single “coming soon” page.
- Company dashboard guided onboarding (token jargon).
- Trust center single overview vs 10+ cards.
- Mobile header collapse (language + DEMO into menu).
- Microsoft calendar, billing checkout, verified testimonials.

---

## Rationale

- **Dashboard:** Audit Critical #1/#3 — production-feel overload + paused auto-apply strip contradicted limited-launch stance.
- **Recruiter hub:** Audit Critical #2 — violet/emerald promos above live grid.
- **Demo boundary:** Audit High #4 — deep links opened pilot surfaces without context.
- **Marketing CTAs:** Audit High #5 — CTA fatigue and launch-ready visual density at **Launch NO-GO**.
- **Marquee:** Fortune-500 logos without adjacent disclaimer on home.

---

## Backlog pointer

See **Product Polish 1.0 backlog** in `docs/PRODUCT_UX_AUDIT_2026-07-08.md` (P1/P2 items).

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
