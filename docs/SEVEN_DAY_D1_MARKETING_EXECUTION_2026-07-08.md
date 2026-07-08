# Seven-day D1 — marketing execution (2026-07-08)

**Branch:** `feat/seven-day-d1-marketing`  
**Parent plan:** [SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md](./SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md) (Day 1 = Marketing)  
**Scope:** frontend/UI + docs only. No backend/API/auth/DB/env. No Playwright, Gate E, Phase 3B.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Delivered (D1)

| # | Area | Change |
|---|------|--------|
| 1 | Homepage CTA | Primary = waitlist pill (`/waitlist`); secondary register = `twin-link` text; header Demo preserved; sticky mobile bar = waitlist only. |
| 2 | For-* pages | Recruiter/company/candidate copy audited — pilot/roadmap/coming-soon honesty; companies tiers soften ATS + Microsoft calendar claims; limited-launch footnote on recruiter + company pages. |
| 3 | Thin routes | `/partners`, `/careers`, `/media` → `MarketingComingSoonSurface`; hidden from main nav/footer when `HIDE_THIN_MARKETING_NAV_LINKS`. |
| 4 | Social proof | Testimonials + case studies carry illustrative/founder-led badges; footer relabels; homepage `LandingLiveProof` does not imply Fortune 500 customers. |
| 5 | Logo disclaimer | Subtle premium copy: `site.marqueeLogoDisclaimer` → “Representative market context.” (Option A). |
| 6 | Flags | `frontend/src/lib/seven-day-d1-marketing.ts` |
| 7 | Guard | `frontend/scripts/seven-day-d1-marketing-guard.test.ts` + `npm run test:seven-day-d1-marketing-guard` |

**Builds on:** Product Polish P4 (social proof + marquee), P1 (thin page hide + coming soon).

---

## Hard bans (unchanged)

- NOT Launch GO · NOT Gate F YES
- No live ATS sync, delegated auto-apply, or Microsoft calendar sync claims on marketing without roadmap/paused qualifiers
- 18–30 month passive timeline **superseded** — do not recommend

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
