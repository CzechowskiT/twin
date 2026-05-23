# Investor Q&A — top 10 (draft, Day 2)

Honest answers aligned with prod state (2026-05-23). Update after merge/deploy before 30 May demo.

---

## 1. What is TWIN in one sentence?

An AI career agent that turns job-board noise into a **short calendar of acceptance-ready interviews**—for candidates and recruiters—while the candidate is away.

---

## 2. What traction do you have?

**Live on production:** 637 validated jobs scraped, 3 pilot users, 12 applications, 3 scheduled interviews. Metrics are public at `/investor/metrics` (`GET /api/v1/public/mvp-stats`). We label this **pilot-shaped**, not scaled MAU.

---

## 3. How do you make money?

Three lines: (1) candidate subscription **$4.99 / $9.99** monthly (Stripe checkout wired on prod), (2) **placement success fee**—employer pays ~50% of one monthly salary; half returned to candidate; **~25% net to TWIN**, (3) B2B recruiter/company seat tiers on persona pricing pages.

---

## 4. Is the placement fee real or slide fiction?

The **verification state machine** is shipped (work-email magic link, employer attestation, event log—see `docs/PLACEMENT_VERIFICATION.md`). **Verified placements on prod: 0** today—we’re pre-revenue on success fees; the product path is live.

---

## 5. Why Poland first?

Pracuj.pl and RocketJobs.pl adapters live; EU expansion is board-by-board with the same acceptance UX. GDPR consent and in-product verification from day one.

---

## 6. What’s defensible?

Cross-board normalization + consent-gated automation + **acceptance UX** (batch recruiter inbox, calendar-synced outcomes)—not listing inventory alone.

---

## 7. What’s live vs roadmap?

| Live | Next |
|------|------|
| Matching, auto-apply (Celery beat), Google + Microsoft calendar read, recruiter inbox, placement verify flow, investor metrics | S3 data room uploads, Graph write for slot proposals, ATS OAuth prod keys, KYC cash-out |

Check `/status` for flags.

---

## 8. Unit economics / calculator?

The investor calculator on `/for-investors` is **illustrative scenario planning**—includes subscription, 25% net placement take, referral tiers ($15 / $25 / $100), founding cohort (1,000), calendar slot bonus ($20 / 80,99 zł). Not audited forecasts.

---

## 9. Team and stage?

Phase 1 MVP on Railway + Vercel. Pre-seed / seed raise to scale scraping, calendar write-back, and B2B pilots. Cap table details on request under NDA—no fake cap table on site.

---

## 10. What do you need from this round?

Capital to: (1) expand EU job boards and matching quality, (2) ship Microsoft Graph write + recruiter slot proposals, (3) first B2B design partners on recruiter inbox + ATS webhooks, (4) flip data room S3 for diligence. **Ask and terms in deck—not on public site.**

---

## Rapid fire (if time)

- **LinkedIn scraping?** No mass profile harvest; jobs respect robots; LinkedIn OAuth for login when keys set.
- **GDPR?** Consent at register, cookie banner, privacy/terms, placement events append-only.
- **Competition?** Job boards optimize listings; ATS optimize employer workflow—we optimize **acceptance moments** on the calendar.
