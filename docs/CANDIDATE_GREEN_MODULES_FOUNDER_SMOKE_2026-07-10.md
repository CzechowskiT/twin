# Candidate green modules — founder browser smoke (2026-07-10)

> **Stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | Launch NO-GO  
> **NOT_GATE_F_YES:** true  
> **NOT_PHASE_3B:** true  
> **Scaffold SHA:** `c2a08b025ca950b341540f0bc80f710825c778ce`

## Summary

Founder-auth browser smoke runbook for **Wave B** candidate modules: Career Compass (B1), Trust Center (B2), and Referrals (B3 / PR #448). All stay **PILOT** until documented **PASS** on production or approved Vercel preview with `demo@twin.career`.

**Status:** **PENDING** — no `FOUNDER_SMOKE: PASS` recorded in this doc.

---

## Credential preflight (required before smoke)

| Check | How to verify | Required |
|-------|---------------|----------|
| `DEMO_USER_PASSWORD` | Export in shell or 1Password — **never commit** | YES for candidate smoke |
| Demo account | `demo@twin.career` per `docs/DEMO_LOGIN_FOR_FOUNDER.md` | YES |
| Prod alignment | `curl -sS https://twin-sooty.vercel.app/api/public-health \| jq '{status,db_ok,git_commit}'` | `status=ok`, `db_ok=true` |
| Deploy SHA | Match preview under test (scaffold `c2a08b0` for Wave B1/B2 prod; #448 preview for B3) | YES |
| Static guards | `cd frontend && npm run test:candidate-green-modules-founder-smoke-guard` | Green before smoke |

**Agent env (2026-07-13):** `DEMO_USER_PASSWORD` **NOT SET** in shell or `.env` files → **NEEDS_FOUNDER_AUTH_SMOKE**.

---

## Modules under smoke

| Module | Wave | Route | PR | Current status | Smoke status |
|--------|------|-------|-----|----------------|--------------|
| Career Compass | B1 | `/dashboard/career` | merged on scaffold | PILOT | NEEDS_FOUNDER_AUTH_SMOKE |
| Trust Center | B2 | `/dashboard/trust` | merged on scaffold | PILOT | NEEDS_FOUNDER_AUTH_SMOKE |
| Referrals | B3 | `/dashboard/referrals` | #448 OPEN | PILOT | NEEDS_FOUNDER_AUTH_SMOKE |

---

## Preflight commands (no secrets in output)

```bash
cd frontend && npm run preflight:founder-smoke-env   # after #450 tooling merged / cherry-picked
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{status,db_ok,git_commit}'
cd frontend && npm run test:candidate-green-modules-founder-smoke-guard
cd frontend && npm run test:all-modules-green-wave-b1-career-compass-guard
cd frontend && npm run test:all-modules-green-wave-b2-trust-center-guard
cd frontend && npm run test:all-modules-green-wave-b3-referrals-guard
```

For #448 preview (after Vercel deploy): set `TWIN_PREVIEW_URL_448` and run `npm run preflight:preview-reachability`.

**Migration note:** #448 branch has `073_candidate_referrals` with `down_revision = 072` — parent `072` arrives only after rebase onto merged #450. Do not fake full Alembic graph PASS on #448 alone.

---

## Career Compass smoke checklist (B1)

1. Login as `demo@twin.career` on https://twin-sooty.vercel.app/login/candidate
2. Open `/dashboard/career`
3. Fill target role, seniority, ≥1 priority, ≥1 next step
4. Save — verify success state
5. Refresh — fields persist
6. PATCH partial update — persists
7. Readiness card shows complete when criteria met
8. Mobile viewport — no layout break, no console errors

**Pass criteria:** all steps without API/console errors; data survives refresh.

---
## Trust Center smoke checklist (B2)

1. Login as `demo@twin.career`
2. Open `/dashboard/trust` — hub loads live data (not static demo)
3. Consent overview reflects API state
4. Grant or withdraw one consent — receipt appended
5. Submit privacy request (e.g. export) — appears in list with manual-processing notice
6. Refresh — persistence holds
7. Audit events list shows recent actions
8. No fake “completed” on export/deletion subflows

**Pass criteria:** live API round-trip; honest PILOT labels on manual subflows.

---

## Referrals smoke checklist (B3 — PR #448 preview)

1. Login as `demo@twin.career` on **#448 Vercel preview**
2. Open `/dashboard/referrals` — persistent link/code panel loads
3. Ensure referral code — copy link works
4. Record invite (POST) — appears in list with honest PILOT banner
5. Refresh — code and list persist
6. Signup attribution — resolve endpoint returns candidate scope (optional second browser)
7. No auto-outreach or fake earnings claims

**Pass criteria:** referral code + list persist across refresh; PILOT labels on earnings/cash-out.

---

## Evidence template (founder fills after smoke — no secrets)

```markdown
## Founder smoke evidence — Wave B (YYYY-MM-DD)

| Field | Value |
|-------|-------|
| Tester | (founder name) |
| Environment | prod / preview |
| Deploy SHA | (first 12 of git_commit) |
| DEMO_USER_PASSWORD source | 1Password / Signal (not logged) |

| Module | Result | Notes |
|--------|--------|-------|
| Career Compass B1 | PASS / FAIL / SKIP | |
| Trust Center B2 | PASS / FAIL / SKIP | |
| Referrals B3 | PASS / FAIL / SKIP | |

Console errors: none / (describe)
Screenshots: (optional path, no PII)
```

On all Wave B modules **PASS**: add line `FOUNDER_SMOKE: PASS` below and update ship flags per flip rules.

---
## Status flip rules (founder only)

| Module | Flip on PASS |
|--------|----------------|
| Career Compass | `CAREER_COMPASS_SHIP_STATUS` → `live`; `candidate_career_compass` → LIVE/green |
| Trust Center | `TRUST_CENTER_SHIP_STATUS` → `live`; `candidate_trust` → LIVE/green |
| Referrals (#448) | `REFERRALS_SHIP_STATUS` → `live`; `candidate_referrals` → LIVE/green |

Do **not** flip without browser smoke PASS documented here.

---

## Guard

```bash
cd frontend && npm run test:candidate-green-modules-founder-smoke-guard
```

---

## Excluded (hard bans)

- Auto-apply activation
- Delegated apply
- Stripe live
- Launch GO / Gate F YES
- Phase 3B
- Fake PASS without browser evidence

---

## Related docs

- `docs/ALL_MODULES_GREEN_WAVE_B1_CAREER_COMPASS_2026-07-10.md`
- `docs/ALL_MODULES_GREEN_WAVE_B2_CANDIDATE_TRUST_CENTER_2026-07-10.md`
- `docs/ALL_MODULES_GREEN_WAVE_B3_CANDIDATE_REFERRALS_2026-07-10.md` (PR #448)
- `docs/INTEGRATION_READINESS_PR448_449_450_2026-07-13.md`
