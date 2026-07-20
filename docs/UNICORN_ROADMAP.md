# TWIN unicorn-scale roadmap (evidence-based)

**Date:** 2026-07-20  
**Branch baseline:** `cursor/phase1-monorepo-scaffold`  
**Stance (docs truth):** P0 CLOSED · Gate E PASS (Phase 3B historical) · Gate F PENDING · Launch **NO-GO**  
**This batch does not flip Gate F / Launch / Phase 3B.**

## Executive posture

TWIN has a real MVP surface (candidate matches + applications + Google calendar + recruiter inbox pilot) but **thin company-building instrumentation** until this batch. Moat candidates: acceptance-ready calendar loop + placement verification state machine — not scraper volume. Biggest risk: **no measured PMF loop** (activation → acceptance) while expanding surfaces. Shortest PMF path: instrument → force TTV to matches → recruit 20–50 Polish desk candidates + 3–5 recruiters → prove weekly acceptance-ready users. Realistic path to $1B: **low single-digit probability this decade** without liquidity on both sides + enterprise ATS + verified placement economics; treat as ambitious multi-year category play, not near-term certainty.

---

## Horizon A — 0–30 days

| Item | Pri | Impact | Cost | Risk | Deps | Measurable result | Acceptance | Continue/stop |
|------|-----|--------|------|------|------|-------------------|------------|---------------|
| Funnel + cohort instrumentation | P0 | High | S | Low | Alembic 084 | Events + `/admin/funnel` | Events on register/onboard; dashboard loads | Continue if NS >0 or cohort rows appear |
| TTV matches redirect experiment | P0 | High | S | Low | FE flag | ↑ onboarding→first_match | Flag on; rollback env | Stop if bounce ↑ or match empty rate high |
| Wire interview/placement funnel emits | P1 | High | S | Low | schedule/verify APIs | NS moves on real use | Events fire in staging | Continue |
| Founder Gate F decision | P0 | High | Docs | Org | Evidence pack | Gate F YES/NO recorded | Signed decision record | Stop public growth if NO |
| PostHog keys (optional dual-write) | P2 | Med | S | Privacy | Consent | Client events visible | Keys + consent path | Optional |

## Horizon B — 31–90 days

| Item | Pri | Impact | Cost | Risk | Deps | Measurable result | Acceptance | Continue/stop |
|------|-----|--------|------|------|------|-------------------|------------|---------------|
| Activation polish (CV→match <1h) | P0 | High | M | Med | Scrapers | p50 TTV first match | Cohort report | Stop if quality collapses |
| Recruiter cohort 3–5 GO SMALL | P0 | High | M | Trust | H5d | Dual-side decisions/week | Founder GO | Stop if PII incidents |
| Monetization preview → soft paywall | P1 | Med | M | Launch | Stripe gate | Paid intent signal | No live Stripe until Launch GO | Hold if Launch NO-GO |
| Microsoft calendar busy-read live | P1 | Med | M | Scope | Graph | Corporate users connect | Gate open + tests | Stop if OAuth fail rate high |
| Growth waitlist → register conversion | P1 | Med | S | — | Analytics | Waitlist→signup % | Funnel event | Continue if CAC unknown |

## Horizon C — 3–12 months

| Item | Pri | Impact | Cost | Risk | Deps | Measurable result | Acceptance | Continue/stop |
|------|-----|--------|------|------|------|-------------------|------------|---------------|
| Marketplace liquidity loops | P0 | High | L | Chicken-egg | Both personas | Weekly matched acceptances | Liquidity dashboard | Pivot if one-sided |
| Placement fee verification self-serve | P0 | High | L | Legal | Placement SM | Verified placements / qtr | Docs + ops queue | Stop CS tennis |
| ATS read webhooks (select) | P1 | High | L | Vendor | Enterprise | Employer trust | 1 live webhook | Expand only on NRR |
| Paid plans live | P1 | High | M | Churn | Launch GO | MRR + payback | Stripe live checklist | Stop if LTV/CAC <1 |
| ICS/WebCal universal | P1 | Med | M | — | Calendar | Apple users retained | Subscribe URL usage | Keep |

## Horizon D — 12–36 months

| Item | Pri | Impact | Cost | Risk | Deps | Measurable result | Acceptance | Continue/stop |
|------|-----|--------|------|------|------|-------------------|------------|---------------|
| Multi-geo + languages ops | P1 | High | XL | Focus | PL PMF | New geo NS | Local ICP proof | Stop geo if PL NS flat |
| Enterprise seats + SSO | P1 | High | XL | Sales | Trust | ACV | 3 logos | — |
| Category brand (acceptance calendar) | P2 | Med | L | Narrative | Proof | Organic share | Referral rate | — |
| Unicorn economics | — | — | — | Capital | NRR>120%, liquidity | Path to $100M+ ARR | Board metrics | Only if unit economics hold |

---

## Executed batch (this doc cycle)

See `docs/PRODUCT_METRICS.md` + PR for funnel instrumentation, admin funnel/retention, TTV matches redirect, flags, tests, rollback.
