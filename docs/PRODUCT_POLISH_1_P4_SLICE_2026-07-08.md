# Product Polish 1.0 — P4 slice (2026-07-08)

**Scope:** frontend/UI only. Builds on P0–P3 (`docs/PRODUCT_POLISH_1_P0_SLICE_2026-07-08.md` through `docs/PRODUCT_POLISH_1_P3_SLICE_2026-07-08.md`). No backend/API/auth/DB/env.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Implemented (P4)

| # | Area | Change |
|---|------|--------|
| 1 | Candidate `/dashboard` | Career compass gated off home (`SHOW_CAREER_COMPASS_ON_DASHBOARD_HOME`); P0 collapsed extended modules + core quick links unchanged. |
| 2 | Recruiter `/recruiter` | Daily Cockpit + Trust Review in collapsed `<details data-recruiter-hub-roadmap-promos>` when primary promos off; inbox next-action stays primary. |
| 3 | Social proof | Testimonials, case studies, homepage `LandingLiveProof` mark illustrative/founder-led; footer relabels links. |
| 4 | Logo marquee | `site.marqueeLogoDisclaimer` → subtle “Representative market context.” |
| 5 | Guard | `frontend/scripts/product-polish-p4-guard.test.ts` + `npm run test:product-polish-p4-guard`. |

**Flags:** `frontend/src/lib/product-polish-p4.ts`

---

## UX impact

- **Dashboard:** Hero + next action + core links only; career compass and heavy islands stay in collapsed extended modules.
- **Recruiter hub:** Live inbox/pipeline/jobs/search first; pilot promos discoverable in roadmap collapse, not violet/emerald hero cards.
- **Marketing honesty:** Illustrative badges on social proof surfaces — no verified-live-proof impression at Launch NO-GO.
- **Marquee:** Shorter disclaimer — premium tone with overclaim mitigation.

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
