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
| S2 | CSP enforce-mode has been live for ≥72h with 0 unexpected violations    | Read `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` § "Risk gates" — all 4 sub-conditions met     | ❌ not yet   |
| S3 | Authenticated mutation rate-limit Layer 2 live on LLM endpoints         | `git show 28a50a0 --stat`                                                                       | ✅ shipped   |
| S4 | Public CV / voice upload endpoints rate-limited                        | `docs/P1_UPLOAD_RATE_LIMITS_2026-05-27.md`; `ff22f3a`                                            | ✅ shipped   |
| S5 | Stripe `event.id` dedup live (migration + handler patch)                | Handler: `billing.py`; migration: `050` — **verify** prod `alembic current` (API start runs `alembic upgrade head`; agent did not manual-migrate) | ⚠️ handler ✅; DB revision **founder verify** |
| S6 | Auto-apply sweep gate covered by 10+ tests                              | `pytest tests/test_auto_apply_trigger_sweep_admin_gate.py -q`                                   | ✅ shipped   |
| S7 | Public health surface frozen by regression tests                        | `pytest tests/test_public_health_regression.py -q`                                              | ✅ shipped   |
| S8 | No secrets in repo (`.env*` ignored, no API keys in code/docs)          | `gh secret list` + `git grep -E 'sk_(live\|test)\|AKIA'`                                         | ✅ verified one-shot today; re-run before launch |
| S9 | Dependency baseline has no HIGH CVEs                                    | `docs/P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md` + `safety check` + `npm audit`                | ✅ baseline; re-run before launch |
| S10| OAuth callback rate-limit (defence vs provider-quota burn)              | `tests/test_oauth_callback_rate_limits.py`; `1efd8b1` on `auth.py` + calendar + ATS `@limiter.limit("10/minute")` | ✅ shipped (prod `67a22dc`) |
| S10b | Match-feedback / applications / profile mutation caps (Layer 2)        | `tests/test_auth_mutation_rate_limits.py`; `1c731fc`                                              | ✅ shipped (prod `67a22dc`) |
| S10c | Cookie consent + recruiter inbox write rate limits                      | `tests/test_consent_recruiter_rate_limits.py`; `67a22dc`                                          | ✅ shipped (prod `67a22dc`) |

### Operational gates

| #  | Gate                                                                   | How to verify                                                                                  | Status today |
| -- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| O1 | Smoke workflow green on the latest 5 production commits                 | `gh run list --workflow smoke.yml --limit 5`                                                    | ✅ today     |
| O2 | Production health endpoint returns `status=ok` + `db_ok=True`           | `./scripts/verify-prod-health.sh` — prod `git_commit=67a22dc` (2026-05-27 cutover session 2)       | ✅ today     |
| O3 | Celery worker is active in production (not eager, not zero nodes)       | `curl https://twin-production-bcd9.up.railway.app/api/v1/health/celery-status`                  | ✅ today     |
| O4 | Stripe webhook endpoint is reachable, signature gate is wired           | `docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md`                                                    | ✅           |
| O5 | Calendar provider OAuth: Google + Microsoft live; Apple/iCal docs ready | `docs/CALENDAR_INTEGRATIONS_*.md` (none on the branch yet → see `.cursorrules` calendar section) | ⚠️ partial   |
| O6 | Canonical Vercel alias points at the right project; drift guard exists  | `bash scripts/check-vercel-canonical-alias.sh`                                                   | ⚠️ drift documented; canonical project is correct |
| O7 | Backup / restore for Postgres is exercised (last restore test logged)    | `docs/RUNBOOK_DB_RESTORE_2026-05-27.md` (procedure ready; drill log pending)                    | ⚠️ doc ready; drill ❌ |
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
| L6 | Data subject access (export / delete) exists                            | `app/api/auth.py` `/me` + admin path (TBD if not present)                                       | ⚠️ partial   |
| L7 | Placement verification is self-serve / machine-assisted (no CS tennis) | `docs/PLACEMENT_VERIFICATION.md`                                                                  | ✅           |

### Pilot readiness gates

| #  | Gate                                                                   | How to verify                                                                                  | Status today |
| -- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| P1 | Controlled pilot operating manual exists                                | `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` (this session, TASK 12)                  | ✅ this session |
| P2 | Pilot intake template + tracker exist                                   | `docs/PILOT_INTAKE_FORM_TEMPLATE.md`, `PILOT_TRACKER.csv`                                        | ✅           |
| P3 | Pilot offer copy reviewed                                               | `docs/PILOT_OFFER_FINAL.md`, `PILOT_OFFER_COPY_PL.md`                                            | ✅           |
| P4 | Pilot pricing model verified                                            | `docs/B2B_*` / pricing docs                                                                      | ✅           |
| P5 | Pilot kill-switch (`SCRAPE_OPS_*` / feature flags) tested                | `pytest tests/test_auto_apply_trigger_sweep_admin_gate.py -q`                                   | ✅           |

## Decision matrix

| Result of audit                                                        | Action                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| All ✅                                                                  | Launch.                                                                               |
| One ❌ on Security gate S2–S5, S10                                       | Hold; ship the corresponding follow-up commit first.                                  |
| One ❌ on Operational gate O7 (backup / restore)                         | Hold until the restore exercise lands in a separate `docs/RUNBOOK_DB_RESTORE.md`.     |
| One ⚠️ partial on L6 (data subject access)                              | Document a manual workflow (`docs/GDPR_MANUAL_DSR.md`) and proceed.                   |
| Any ❌ on Pilot gates                                                    | Pilot, not public launch — pilot has its own gate set (cf. `PILOT_OFFER_FINAL.md`).   |

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
