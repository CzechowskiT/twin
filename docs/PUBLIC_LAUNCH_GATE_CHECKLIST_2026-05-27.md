# Public launch gate checklist — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 11 of the long autonomous security session.
A docs-only **gate** — items in this list **must be green**
before the founder can announce TWIN publicly (LinkedIn, X,
PressOn, etc.). Compiled from the security workstream
(`docs/P1_DOCS_INDEX_2026-05-27.md`) plus the pilot /
deploy / placement docs already on this branch.

**This is the operator's checklist, not the marketing
checklist.** Marketing (story, brand, press) lives in
`docs/INVESTOR_DEMO_RUNBOOK.md` and the public-launch
messaging is intentionally out of scope per the session's
HARD BAN.

## Gates — go / no-go

Each row is a single binary check the founder runs before
posting. The action column says what to read / run to flip
the gate to ✅.

### Security gates

| #  | Gate                                                                   | How to verify                                                                                  | Status today |
| -- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| S1 | CSP report-only is wired, sink is live, burn-in clock started          | `curl -sI https://twin-sooty.vercel.app/ \| grep -i csp`                                       | ✅ shipped   |
| S2 | CSP enforce-mode has been live for ≥72h with 0 unexpected violations    | Read `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` § "Risk gates"; audit `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md`; `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md` | ❌ **NOT READY** (2026-06-02) — prior window **RESET**; `connect-src` fix **deployed**; **new** 72h burn-in `2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z`; report-only only; enforce off |
| S3 | Authenticated mutation rate-limit Layer 2 live on LLM endpoints         | `git show 28a50a0 --stat`                                                                       | ✅ shipped   |
| S4 | Public CV / voice upload endpoints rate-limited                        | `docs/P1_UPLOAD_RATE_LIMITS_2026-05-27.md`; `ff22f3a`                                            | ✅ shipped   |
| S5 | Stripe `event.id` dedup live (migration + handler patch)                | Handler: `billing.py`; migration: `050` — prod SQL `SELECT version_num FROM alembic_version;` → `050_stripe_webhook_events` (founder/operator read-only, 2026-05-29) | ✅ **PASS** — prod at `050`; ledger `stripe_webhook_events` expected; **no agent migration** |
| S6 | Auto-apply sweep gate covered by 10+ tests                              | `pytest tests/test_auto_apply_trigger_sweep_admin_gate.py -q`                                   | ✅ shipped   |
| S7 | Public health surface frozen by regression tests                        | `pytest tests/test_public_health_regression.py -q`                                              | ✅ shipped   |
| S8 | No secrets in repo (`.env*` ignored, no API keys in code/docs)          | `gh secret list` + `git grep -E 'sk_(live\|test)\|AKIA'`                                         | ✅ verified one-shot today; re-run before launch |
| S9 | Dependency baseline has no HIGH CVEs                                    | `docs/P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md` + `safety check` + `npm audit`                | ✅ baseline; re-run before launch |
| S10| OAuth callback rate-limit (defence vs provider-quota burn)              | `tests/test_oauth_callback_rate_limits.py`; `1efd8b1` on `auth.py` + calendar + ATS `@limiter.limit("10/minute")` | ✅ code shipped; runtime SHA `f165096` is newer and includes this baseline |
| S10b | Match-feedback / applications / profile mutation caps (Layer 2) + saved-jobs | `tests/test_auth_mutation_rate_limits.py`, `tests/test_jobs_saved_rate_limits.py`; `1c731fc` + Agent2 follow-up | ✅ code + tests updated on branch; keep runtime SHA verification in O2/O6 flow |
| S10c | Cookie consent + recruiter inbox write rate limits                      | `tests/test_consent_recruiter_rate_limits.py` (includes `/recruiter/inbox/respond-batch`); `67a22dc` | ✅ code + tests updated on branch; keep runtime SHA verification in O2/O6 flow |
| S11 | Verified Candidate readiness gate (`/api/v1/candidates/me/verified-readiness`) | `tests/test_candidate_verified_readiness_gate.py` (11 passed local 2026-05-29) + `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` § S11 | ✅ **PASS** (founder 2026-05-29) — prod HTTP 200; readiness card visible on `/dashboard`; no tokens in evidence |

### Operational gates

| #  | Gate                                                                   | How to verify                                                                                  | Status today |
| -- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| O1 | Smoke workflow green on the latest 5 production commits                 | `gh run list --workflow smoke.yml --limit 5`                                                    | ✅ today     |
| O2 | Production health endpoint returns `status=ok` + `db_ok=True`           | `GET https://twin-sooty.vercel.app/api/public-health` — `git_commit=df15618`, `db_ok=true` (re-confirmed 2026-06-02 audit) | ✅ today     |
| O3 | Celery worker is active in production (not eager, not zero nodes)       | `curl https://twin-production-bcd9.up.railway.app/api/v1/health/celery-status`                  | ✅ today     |
| O4 | Stripe webhook endpoint is reachable, signature gate is wired           | `docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md`                                                    | ✅           |
| O5 | Calendar provider OAuth: Google + Microsoft live; Apple/iCal docs ready | Google **FULL prod smoke PASS** 2026-05-29; Microsoft **LIVE**; Apple/iCal/WebCal/ICS **partial** — founder waiver **signed** `2026-06-03T13:19:53Z` (copy must not overpromise Apple) | ⚠️ **partial-with-waiver** — non-blocking for controlled pilot |
| O6 | Canonical Vercel alias points at the right project; drift guard exists  | `bash scripts/check-vercel-canonical-alias.sh`                                                   | ⚠️ drift documented; canonical project is correct |
| O7 | Backup / restore for Postgres is exercised (last restore test logged)    | `docs/RUNBOOK_DB_RESTORE_2026-05-27.md` § O7 PASS criteria + `docs/BACKUP_RESTORE_DRILL_LOG.md` **PASS** row with GO decision | ✅ **PASS** (2026-06-01) — staging clone `staging-restore-proof-20260529` via pg_dump/pg_restore; prod **`postgres-volume`** untouched; separate from `INC-DB-2026-05-29-001` |
| O8 | Incident response runbook exists with named on-call                     | `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` (this session, TASK 13)                          | ✅ this session |
| O9 | Security risk register is current                                       | `docs/SECURITY_RISK_REGISTER_2026-05-27.md` (this session, TASK 14)                             | ✅ this session |
| O10| Vercel canonical re-link is either fixed or has a documented workaround | `docs/VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md`                                             | ⚠️ workaround documented |

### Legal / privacy gates

| #  | Gate                                                                   | How to verify                                                                                  | Status today |
| -- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| L1 | GDPR consent surface present on every signup                            | `frontend/src/app/register/...` + `app/api/auth.py` `/gdpr-consent`                              | ✅           |
| L2 | Cookie consent banner (PL + EN) live                                   | `docs/COOKIE_CONSENT.md` + `frontend/src/components/cookie-consent.tsx`                          | ✅           |
| L3 | Privacy + Terms pages reachable and pass smoke                          | `playwright test e2e/smoke.spec.ts -g "/privacy + /terms"`                                       | ✅           |
| L4 | Scraping compliance terms applied on `pracuj.pl` / `rocketjobs.pl`     | `docs/SCRAPING_COMPLIANCE.md`                                                                    | ✅           |
| L5 | Auto-apply consent required + auditable                                 | `app/database/models.py` `AutoApplyConsent` + `tests/test_auto_apply_settings_api.py`             | ✅           |
| L6 | Data subject access (export / delete) exists                            | Export: `GET /api/v1/candidates/me/export.json` + CSV/XLSX; manual erasure: `docs/GDPR_MANUAL_DSR.md`; founder waiver **signed** `2026-06-03T13:19:53Z` | ⚠️ **partial-with-waiver** — pilot OK; self-service delete future |
| L7 | Placement verification is self-serve / machine-assisted (no CS tennis) | `docs/PLACEMENT_VERIFICATION.md`                                                                  | ✅           |

### Pilot readiness gates

| #  | Gate                                                                   | How to verify                                                                                  | Status today |
| -- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| P1 | Controlled pilot operating manual exists                                | `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` (this session, TASK 12)                  | ✅ this session |
| P2 | Pilot intake template + tracker exist                                   | `docs/PILOT_INTAKE_FORM_TEMPLATE.md`, `PILOT_TRACKER.csv`                                        | ✅           |
| P3 | Pilot offer copy reviewed                                               | `docs/PILOT_OFFER_FINAL.md`, `PILOT_OFFER_COPY_PL.md`                                            | ✅           |
| P4 | Pilot pricing model verified                                            | `docs/B2B_*` / pricing docs                                                                      | ✅           |
| P5 | Pilot kill-switch (`SCRAPE_OPS_*` / feature flags) tested                | `pytest tests/test_auto_apply_trigger_sweep_admin_gate.py -q`                                   | ✅           |
| P6 | Founder authenticated prod smoke (dashboard subpages, jobs, profile, safety copy) | `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` — PASS when every route + safety row has explicit founder PASS | ✅ **PASS** (founder 2026-05-29) — 8/8 routes + safety copy; `/dashboard` layout PASS (forecast fix, no overlapping blocked CTAs); Google Calendar **FULL prod smoke PASS** |

## Decision matrix

| Result of audit                                                        | Action                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| All ✅                                                                  | Launch.                                                                               |
| One ❌ on Security gate S2–S5, S10                                       | Hold; ship the corresponding follow-up commit first.                                  |
| One ❌ on Operational gate O7 (backup / restore)                         | Hold until the restore exercise lands in a separate `docs/RUNBOOK_DB_RESTORE.md`.     |
| One ⚠️ partial on L6 (data subject access)                              | Document a manual workflow (`docs/GDPR_MANUAL_DSR.md`) and proceed.                   |
| Any ❌ on Pilot gates                                                    | Pilot, not public launch — pilot has its own gate set (cf. `PILOT_OFFER_FINAL.md`).   |

## Current gate stance (checkpoint 2026-06-03 `13:29:36Z`, **O7 PASS**, **S2 burn-in in progress**, **L6 + O5 waivers signed**)

**Latest audit:** `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` (refreshed 2026-06-03)
**Post-merge sanity (2026-06-02):** `docs/POST_MERGE_AUTO_APPLY_SANITY_2026-06-02.md` — PR #21 merged; prod `git_commit=6382a91` (includes `e764e68` hard gates **LIVE**); public-health OK; auto-apply **PAUSED** policy unchanged.

- **S2 CSP enforce burn-in:** ❌ **NOT READY** — window **IN PROGRESS** (`2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z`; **~23h 11m elapsed / ~32%** at `13:29:36Z`). Founder combined checkpoint: Railway `csp_report` → **no fresh entries** since start; Chrome DevTools core routes → **no CSP violations**; `/api/v1/jobs/saved` **422** non-CSP. Decision: **CONTINUE** (report-only HOLD). Safari + Firefox DevTools **PENDING**. Next founder Railway: `2026-06-03T18:18:33Z`.
- **L6 DSR:** ⚠️ **partial-with-waiver** — export **LIVE**; delete manual via `docs/GDPR_MANUAL_DSR.md`; founder waiver **signed** `2026-06-03T13:19:53Z` — acceptable for controlled pilot; self-service delete remains future work.
- **O5 Calendar:** ⚠️ **partial-with-waiver** — Google **PASS** + Microsoft **LIVE**; Apple/iCal/WebCal/ICS partial; founder waiver **signed** `2026-06-03T13:19:53Z` — non-blocking for controlled pilot if copy does not overpromise Apple.

- **O7 backup/restore:** ✅ **PASS** (2026-06-01) — staging clone drill via read-only pg_dump → pg_restore; evidence in `docs/BACKUP_RESTORE_DRILL_LOG.md`; prod **`postgres-volume`** untouched.
- **Post-recovery stabilization (`INC-DB-2026-05-29-001`):** **RESOLVED** — separate from O7; retain incident backups until post-mortem closed.
- **Controlled pilot GO:** **YES** — prod health green (`public-health` `db_ok=true`, `validated_jobs=652`, `market_coverage_active_validated=2579` per 2026-06-02 audit curl).
- **Investor/CTO demo GO:** **YES** — curated demo posture unchanged.
- **Public launch GO:** **NO-GO** — primary blocker **S2** (72h burn-in incomplete); **L6** / **O5** waivers signed for pilot only — do not unlock uncontrolled public launch; **GAP-04** optional open.
- **Auto-apply / delegated apply:** **PAUSED** / **NOT LIVE** — gates live (`e764e68` / `6382a91`); **GAP-03 CLOSED (ops)** — founder `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false`, health confirms `nightly_auto_apply_beat_enabled=false`; **GAP-04 optional open** (`AUTO_APPLY_SUBMIT` not set). Evidence: `docs/AUTO_APPLY_PRODUCTION_OPS_PAUSE_PLAN_2026-06-02.md` §8. **S2 burn-in continues** — NOT READY, no clock reset (CSP unchanged, clean `csp_report`).
- **S5 prod revision:** ✅ **PASS** — production `version_num = 050_stripe_webhook_events` (read-only SQL, 2026-05-29; evidence in `docs/ALEMBIC_050_FOUNDER_VERIFICATION_2026-05-29.md` § Evidence log). **No migration** needed or run by agent; **no** Railway deploy for this gate.
- **O5 Google Calendar — FULL prod smoke:** ✅ **PASS** (2026-05-29) — OAuth (Console config); Connect; real events; week day mapping (`Europe/Warsaw`, no +1 shift). Vercel `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH`, fix HEAD `3631c45`; FE-only, no Railway. Evidence: `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md`. O5 row stays ⚠️ **partial** until Apple/iCal beyond docs.
- **P6 founder authenticated smoke:** ✅ **PASS** (founder 2026-05-29) — 8/8 routes + safety rows; `/dashboard` layout confirmed post-forecast fix; Google Calendar **fully closed**.
- **S11 verified-readiness prod smoke:** ✅ **PASS** (founder 2026-05-29) — `/api/v1/candidates/me/verified-readiness` HTTP 200 on prod; readiness card on `/dashboard`; delegated apply / KYC **not live**.

## What "launch" means in this checklist

- **Public launch** = announcement to a non-pilot audience
  (LinkedIn post / PressOn / X) with the expectation of an
  uncontrolled signup spike.
- **Pilot launch** = up to 20 named users invited from the
  waitlist, watched on a per-account basis. Pilot already
  runs on this branch (see `docs/PILOT_*`).
- **Investor demo** ≠ launch. The demo runs against the same
  prod stack but with a curated dataset and known users.

## What this commit does NOT do

- It does **not** flip any gate. Every row above is read-
  only.
- It does **not** post launch messaging anywhere.
- It does **not** edit `.cursorrules`, `frontend/`, or any
  source.

## Founder manual steps (non-technical)

### Alembic `050` confirmation (read-only, no migration)

- Status: ✅ **PASS** (2026-05-29) — production `version_num = 050_stripe_webhook_events` (founder/operator read-only SQL). Evidence: `docs/ALEMBIC_050_FOUNDER_VERIFICATION_2026-05-29.md` § Evidence log. **No migration** run by agent.

Reference steps (for re-check only):

1. Open Railway project for API database.
2. Open Postgres service console/shell (**read-only check only**).
3. Run: `SELECT version_num FROM alembic_version;`
4. PASS if value is exactly `050_stripe_webhook_events`.
5. FAIL if value is `049_job_match_feedback` or anything older.

Alternative (shell path in Railway service):

1. Open API service shell in Railway.
2. Run: `alembic current`
3. PASS if output shows `050_stripe_webhook_events (head)`.
4. FAIL otherwise.

Warning: this check is non-destructive; do **not** run `alembic upgrade` manually for this gate.

### Candidate E2E manual gate

- Status: **PASS** (founder-verified, 2026-05-27).
- Evidence: "Founder manually verified production candidate flow: dashboard Top 20/feed → Not relevant/Nietrafione → refresh → same offer did not return."
- Warning: "No auto-apply clicked. No real application sent. No scrape triggered."

### O7 backup / restore drill (founder-only)

- Status: ✅ **PASS** (2026-06-01).
- **Staging drill:** read-only pg_dump prod → pg_restore isolated staging env `staging-restore-proof-20260529` (Postgres-HE2P / volume `postgres-volume-p1D7`). Dump `twin_o7_prod_20260601T180324Z.dump` (294K). SQL counts match prod pre-check. **No** prod Restore button, **no** prod DATABASE_URL change.
- **Production incident (`INC-DB-2026-05-29-001`):** separate event — volume re-mount recovery; does **not** substitute for O7 (now closed via staging drill).
- Prod post-drill (read-only): `GET /api/public-health` → `status=ok`, `db_ok=true`, `market_coverage_active_validated=2551` (2026-06-01 agent curl).
- Evidence: `docs/BACKUP_RESTORE_DRILL_LOG.md` PASS row + `docs/RUNBOOK_DB_RESTORE_2026-05-27.md`.

### Founder authenticated route smoke (P6)

- Status: ✅ **PASS** (2026-05-29) — founder confirmed 8/8 routes + safety copy; `/dashboard` layout PASS (no overlapping forecast blocked CTAs).
- Evidence: `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` + `docs/RESPONSIVE_QA_MATRIX_2026-05-29.md`.
- Automated guards (2026-05-29): `test:verified-readiness-guard`, `test:dashboard-ux-safety`, `test:calendar-week` PASS; Playwright unauth dashboard routes 14/14 PASS on branch.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source change.
- ✅ No deploy / Railway / Vercel change.
- ✅ No DB migration.
- ✅ No public-launch messaging.
- ✅ No `.env` change.
- ✅ No secret in this doc.
- ✅ No UX / copy change.

## Files

- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` (this
  doc).

## Related

- `docs/P1_DOCS_INDEX_2026-05-27.md` — entry-point map for
  every gate doc.
- `docs/PILOT_OFFER_FINAL.md` — pilot vs launch boundary.
- `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` —
  the pilot operating manual referenced by P1.
- `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` — incident
  runbook referenced by O8.
- `docs/SECURITY_RISK_REGISTER_2026-05-27.md` — security
  risk register referenced by O9.
