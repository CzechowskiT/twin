# TWIN full audit — 2026-05-23 (investor demo sprint, Day 1)

**Auditor:** Claude (Cursor agent, autonomous sprint)  
**Branch audited (local):** `cursor/persona-pricing-and-logo-colors` (includes `cursor/fix-persona-pricing-lanes` + logo color fix)  
**Production git_commit (Railway API):** `92df04cf41aff4ceaebb4a1b54d0e3c541b73cf8`  
**Production checked:** yes — live curl + `./scripts/verify-prod-health.sh` + `./scripts/verify-investor-demo-ready.sh` (2026-05-23 ~17:30 UTC)

**URLs**

| Surface | URL |
|---------|-----|
| Frontend | https://twin-sooty.vercel.app |
| API | https://twin-production-bcd9.up.railway.app |
| Demo user (founder) | `czechowski@protonmail.ch` (see `docs/DEMO_LOGIN_FOR_FOUNDER.md`) |
| Target demo date | ~30 May 2026 |

---

## Executive summary

**TWIN Phase 1 MVP is production-healthy and demo-ready for a 15-minute investor walkthrough.** All critical ops flags pass; demo snapshot returns **`source: live_db`**; pipeline metrics show real seeded data (12 applications, 3 interviews, 637 validated jobs). Stripe checkout, Microsoft calendar OAuth, mail, Celery worker + nightly auto-apply beat, and recruiter inbox are configured on Railway.

**Confidence: 8.5 / 10** for live demo with founder login (up from ~6/10 in morning audit when Stripe was off and demo was thin). Remaining gaps are mostly **founder-only secrets** (S3 data room) and **undeployed frontend slices** (persona pricing redirect fix, investor calculator reward alignment) on feature branches—not missing product code.

**North-star narrative is shippable:** ranked pipeline → acceptance-ready calendar moments → recruiter batch inbox—not inbox volume.

---

## Production health

### API `GET /api/v1/health?ops=1`

| Flag | Value | Demo impact |
|------|-------|-------------|
| `status` | `ok` | — |
| `db_ok` | true | — |
| `mail_configured` | true | Password reset, placement mail |
| `google_oauth_configured` | true | Social login |
| `microsoft_oauth_configured` | true | Corporate calendar |
| `google_calendar_configured` | true | Calendar sync |
| `microsoft_calendar_configured` | true | Outlook busy/slots |
| `stripe_checkout_ready` | true | Premium checkout (test/live keys) |
| `scrape_worker_ready` | true | Job corpus |
| `scrape_beat_enabled` | true | Nightly refresh |
| `celery_task_always_eager` | false | Real async |
| `recruiter_inbox_configured` | true | Batch accept/decline |
| `ops_admin_configured` | true | Ops curl |
| `github_oauth_configured` | false | Non-fatal |
| `apple_oauth_configured` | false | Non-fatal |

**Note:** `GET /status` on API returns **404** — health lives at `/api/v1/health`; frontend **`/status`** page proxies ops flags (HTTP 200).

### Celery (`verify-prod-health.sh`)

- `worker_active: true`
- `nightly_auto_apply_beat_enabled: true`
- `beat_schedule_has_nightly: true`

### Live metrics `GET /api/v1/public/mvp-stats`

```json
{
  "validated_jobs": 637,
  "registered_users": 3,
  "total_applications": 12,
  "verified_placements": 0,
  "interviews_scheduled": 3,
  "profiles_with_cv": 2,
  "stripe_checkout_ready": true,
  "linkedin_oauth_configured": true,
  "microsoft_calendar_configured": true,
  "data_room_s3_enabled": false,
  "data_room_local_demo": true,
  "paid_subscribers": 0,
  "subscription_mrr_usd": 0.0
}
```

### Demo snapshot `GET /api/v1/demo/snapshot`

- `demo_mode: true`
- `source: **live_db**`
- `demo_user_configured: true`
- Top matches include Nova Hiring PL, Twin Labs, Acceptance Labs (investor-demo external IDs)

**Verifier:** `./scripts/verify-investor-demo-ready.sh` → **READY**

---

## Demo flow audit

| Flow | URL / action | Status | Notes |
|------|--------------|--------|-------|
| Marketing home | `/` | ✅ 200 | Hero, persona lanes, founding CTA |
| No-login demo | `/demo` | ✅ | Live DB when seeded |
| Founder login | `/login` → `czechowski@protonmail.ch` | ✅ | Password not in repo |
| Candidate dashboard | `/dashboard` | ✅ | Match %, auto-apply strip, applications |
| Auto-apply | `/dashboard/settings/auto-apply` | ✅ | Consent + Run now (test) |
| Calendar | `/dashboard/calendar` | ✅ | Seeded interview; ICS/WebCal |
| Placement | Dashboard timeline + `/investor/placement` | ⚠️ | `verified_placements: 0` on metrics — timeline may show declare/verified events on seed app |
| Referrals | `/dashboard/referrals` | ✅ | Manual cash-out copy |
| Investor metrics | `/investor/metrics` | ✅ | Live mvp-stats |
| Investor calculator | `/for-investors` (calculator section) | ⚠️ | **Branch WIP:** 4-program alignment not on prod until merge |
| Data room | `/investor/data-room` | ⚠️ | Local demo banner (`data_room_s3_enabled: false`) |
| Recruiter inbox | `/recruiter/inbox?company_slug=nova-hiring-pl` | ✅ | Token-gated; reseed via `ops-refresh-recruiter-inbox.sh` |
| Persona pricing | `/for-companies#persona-pricing`, `/for-recruiters#persona-pricing` | ⚠️ | **Fix on branch** — logged-in users were redirected off lane pre-fix |
| Status page | `/status` | ✅ 200 | Frontend health dashboard |
| Register (not /auth/signup) | `/register` | ✅ | `/auth/signup` → 404 (document in runbook) |

---

## Investor reward programs alignment

Four programs referenced in sprint brief — verified against code:

| Program | Expected | Code source | PL display |
|---------|----------|-------------|------------|
| Placement bonus | 25% of monthly salary to candidate (50% employer fee, half returned) | `PLACEMENT_CANDIDATE_BONUS_PCT_OF_MONTHLY_SALARY = 25` | % in copy |
| Referral (3 tiers) | $15 first payment / $25 retained 3m / $100 hired | `REFERRAL_BONUS_*_USD` | Localized via `formatCandidateListPriceUsd` |
| Founding cohort | 1,000 cap | `FOUNDING_COHORT_SIZE = 1000` | Waitlist counter |
| Calendar slot bonus | $20 USD / **80,99 zł** PL | `INTERVIEW_BOOKED_BONUS_USD = 20` + `roundPsychMonthlyLocal` | ✅ verified: `80,99 zł` |

**Investor calculator model (Day 2 fix, branch):** imports shared constants; models founding revenue drag, referral 3-tier breakdown, interview bonus costs, placement net take ~25%. Tests pass (`npx tsx scripts/investor-calculator-model.test.ts`).

---

## UX / copy / i18n spot-check

| Item | Severity | Detail |
|------|----------|--------|
| Persona pricing redirect | P0.5 | Fixed on `cursor/fix-persona-pricing-lanes` — session redirect no longer bounces `/for-companies` |
| Logo brand colors | P1 | Fixed on `cursor/fix-logo-brand-colors` — OAuth/marquee preserve vendor colors |
| Verified placements = 0 | P0.5 | Metrics page shows honest zero — prep talking point or seed placement verify event |
| Low user count (3) | P1 | Labeled beta/pilot — acceptable pre-seed |
| Data room S3 off | P1 | Banner explains local demo — OK with disclaimer |
| `/auth/signup` 404 | P2 | Use `/register` — document only |
| No TODO/FIXME on investor TSX | ✅ | Grep clean |

**i18n:** Core investor/candidate/recruiter strings via `t()` / `i18n.ts`. Recruiter inbox empty states have PL (`recruiterInbox.emptyStateTitle/Body`). Dashboard jobs empty state PL present (`jobsEmptyZeroTitle`).

---

## Security & GDPR (summary)

- JWT on protected routes; recruiter inbox token-gated
- Ops health exposes booleans + redirect URIs only (no secrets)
- Cookie consent + GDPR register flow shipped
- No live `sk_live_*` in repo
- Scraping respects robots for LinkedIn

---

## Automated tests (this session)

```text
./scripts/verify-prod-health.sh          — PASS (all critical flags)
./scripts/verify-investor-demo-ready.sh  — PASS (live_db)
npm run build (frontend)                 — PASS
npx tsx scripts/investor-calculator-model.test.ts — 12/12 PASS
npx tsx scripts/pricing-routes.test.ts   — 2/2 PASS
npx tsx scripts/persona-access.test.ts    — 2/2 PASS
pytest backend/tests/test_health_features.py \
  backend/tests/test_public_mvp_stats.py \
  backend/tests/test_recruiter_inbox.py  — 18 passed
```

---

## Production drift

| Layer | SHA / state |
|-------|-------------|
| Railway API | `92df04c` |
| Vercel frontend | Aligned with scaffold deploys |
| Local feature branch | Ahead: persona pricing fix, logo colors, investor calculator (not merged to prod branch yet) |

**Action before 30 May demo:** Merge `cursor/persona-pricing-and-logo-colors` (or split PRs) into production branch + Vercel redeploy.

---

## Comparison to morning audit (`FOUNDER_P0_AUDIT_2026-05-23.md`)

| Item | Morning | Now |
|------|---------|-----|
| Stripe | ✅ | ✅ |
| Microsoft | ✅ | ✅ |
| Demo seed | ✅ partial | ✅ **live_db verified** |
| Recruiter inbox | ✅ | ✅ |
| S3 data room | ⚠️ founder keys | ⚠️ unchanged |
| API git lag | ⚠️ | ✅ aligned at `92df04c` |

---

## Verdict

**GO for investor demo** with founder account and runbook in `docs/DEMO_SCRIPT_v1.md`. **Conditional GO** for persona pricing deep-link during logged-in session until branch merges. **Founder-only blockers:** S3 keys for real data room uploads; optional `DATABASE_PUBLIC_URL` for local reseed scripts.

**Demo readiness score: 85 / 100** (post-seed prod, pre-merge frontend fixes).

---

## Appendix — commands

```bash
./scripts/verify-prod-health.sh
./scripts/verify-investor-demo-ready.sh
curl -sS "$API/api/v1/health?ops=1" | python3 -m json.tool
curl -sS "$API/api/v1/public/mvp-stats" | python3 -m json.tool
curl -sS "$API/api/v1/demo/snapshot" | python3 -m json.tool
```
