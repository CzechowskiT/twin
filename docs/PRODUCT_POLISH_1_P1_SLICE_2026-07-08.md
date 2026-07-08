# Product Polish 1.0 — P1 slice (2026-07-08)

**Scope:** frontend/UI only. Builds on P0 (`docs/PRODUCT_POLISH_1_P0_SLICE_2026-07-08.md`). No backend/API/auth/DB/env.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Implemented (P1)

| # | Area | Change |
|---|------|--------|
| 1 | Marketing footer/nav | `/partners`, `/careers`, `/media` removed from main footer + corporate nav more; routes stay live via `MarketingComingSoonSurface`. |
| 2 | Mobile header | Demo CTA `hidden md:inline-flex` on top rail; language picker `hidden md:block` + copy in hamburger. |
| 3 | Trust center | Single overview card + `Advanced (pilot)` `<details>`; `WorkspaceStatusBadge` for pilot tier. |
| 4 | Candidate dashboard | `ProfileScrapePanel` only when elevated scrape UI enabled inside extended modules. |
| 5 | Recruiter hub | `RecruiterHubNextAction` when P0 promos off — inbox-first CTA. |
| 6 | Company dashboard | Guided onboarding empty state; access fields in collapsible connect panel (no token-first screen). |
| 7 | Badges | `coming_soon` tier on `WorkspaceStatusBadge`; shared sizing/tone with LIVE/PILOT/PAUSED. |
| 8 | Guard | `frontend/scripts/product-polish-p1-guard.test.ts` + `npm run test:product-polish-p1-guard`. |

**Flags:** `frontend/src/lib/product-polish-p1.ts`

---

## Deferred (P2+)

- Microsoft calendar OAuth UX polish.
- Billing checkout surface.
- Verified testimonials / partner logo wall.
- Broader inline pilot badge migration (investor rooms, recruiter submodules).

---

## UX impact

- **Marketing:** fewer dead-end footer/nav links; thin pages show honest coming-soon copy.
- **Mobile:** less top-bar clutter; demo + locale in menu on phones.
- **Trust:** calmer first screen; deep lanes still reachable.
- **Company:** first login reads as product onboarding, not API token form.
- **Recruiter:** hub no longer feels empty after promo removal.

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
