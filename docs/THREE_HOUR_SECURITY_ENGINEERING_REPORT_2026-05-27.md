# Three-Hour Security Engineering Session — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Start tip:** `59f7d1a` (`Update smoke.yml`).
**End tip:** `880d2dc` (`docs(ci): verify smoke paths ignore behavior`).
**Scope:** seven sequential tasks (TASK 1 — TASK 7) under the
session's HARD BANS — no Railway deploy, no prod env, no
migrations, no auto-apply execution, no scrape, no force-push,
no `.env` commit, no UX / copy change, no `smoke.yml` edit
unless TASK 6 docs-only.

## Commits shipped (7 total, 6 new + 1 from prior session retained)

| # | SHA       | Subject                                                                | Type        | Files       | Tests added | smoke run |
| - | --------- | ---------------------------------------------------------------------- | ----------- | ----------- | ----------- | --------- |
| 1 | `b7c0622` | `fix(security): rate limit beta waitlist signup`                       | docs        | 1 doc       | 0 (already shipped) | skipped (paths-ignore) |
| 2 | `dd0b8a2` | `fix(security): gate auto-apply trigger-sweep to ops allowlist`        | **code**    | 1 src + 1 test + 1 doc | 4 | ✅ success |
| 3 | `2372522` | `docs(stripe): design webhook event idempotency`                       | docs        | 1 doc       | 0           | skipped (paths-ignore) |
| 4 | `0dfc6c9` | `feat(security): csp violation report sink`                            | **code**    | 1 src + 1 router + 1 test + 1 doc | 5 | ✅ success |
| 5 | `2431c49` | `docs(security): design authenticated mutation rate-limit`             | docs        | 1 doc       | 0           | skipped (paths-ignore) |
| 6 | `880d2dc` | `docs(ci): verify smoke paths ignore behavior`                         | docs        | 1 doc       | 0           | skipped (paths-ignore) |
| 7 | (this commit) | `docs(release): record three hour security engineering session`    | docs        | 1 doc       | 0           | will be skipped (paths-ignore) |

Test results across the touched suites (`-q`, all backend venv):

```
tests/test_beta_waitlist_rate_limit.py            1 passed
tests/test_auto_apply_trigger_sweep_admin_gate.py 4 passed   ← new
tests/test_csp_report.py                          5 passed   ← new
tests/test_auto_apply_settings_api.py             5 passed   (regression — unchanged)
tests/test_stripe_webhook_signature.py            5 passed   (regression — unchanged)
20 passed in 2.10s
```

GitHub Actions on `cursor/phase1-monorepo-scaffold` (last 5
runs at end of session): all five **success**, see TASK 6 doc.

## TASK-by-TASK outcomes

### TASK 1 — Beta waitlist rate limit
**Commit:** `b7c0622` — docs-only follow-up; the actual code
fix (`@limiter.limit("5/minute")` on `POST /api/v1/beta/join`)
shipped earlier in `45e5d6a` (`fix(security): add rate limit to
beta waitlist signup`). This session re-ran the contract test
on the current branch tip (1 PASS) and wrote
`docs/P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md` recording the
verification.
**Verdict:** ✅ verified; one new doc; no code change in this
commit. Railway untouched.

### TASK 2 — Auto-apply trigger-sweep audit + safe fix
**Commit:** `dd0b8a2` — **fix shipped**, not docs-only. The
`POST /api/v1/auto-apply/trigger-sweep` endpoint was protected
only by `get_current_user`, which meant any signed-up user
could enqueue the platform-wide nightly auto-apply sweep —
privilege escalation + worker-pool DoS. Now gated by
`user_has_scrape_ops` (reuses the existing
`SCRAPE_OPS_USER_IDS` / `SCRAPE_OPS_EMAILS` allowlist) and
rate-limited at `3/minute` per IP. Backed by 4 new contract
tests (401 / 403 / 200 / 429).
**Verdict:** ✅ **closed a real P1 hole in code**. Doc:
`docs/P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md`.

### TASK 3 — Stripe event idempotency design
**Commit:** `2372522` — design only (HARD BAN: no migration).
The `POST /api/v1/billing/webhook` handler doesn't dedupe by
`event.id`; three of four handlers are accidentally upsert-safe,
but `process_invoice_payment_succeeded` increments
`user.subscription_invoice_payment_count`, which drives
referral payouts — a single duplicated `invoice.payment_succeeded`
event trips the second-cycle payout one cycle early. Spec:
schema (`stripe_webhook_events`), Alembic sketch
(`050_stripe_webhook_events.py`), handler patch, race-safe
`INSERT ... ON CONFLICT DO NOTHING RETURNING`, 5-test plan.
**Verdict:** 📐 design ready; ~half-day impl when migration
freeze lifts. Doc:
`docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`.

### TASK 4 — CSP report endpoint
**Commit:** `0dfc6c9` — **feat shipped** (no CSP enforce flip).
New `POST /api/v1/csp-report` accepts both legacy
(`application/csp-report` envelope) and modern Reporting API
(`application/reports+json` array) payloads, summarises the
documented violation fields to a structured log line, and
always returns `204`. Rate-limited 60/minute per IP. No DB
write, no migration. Frontend `next.config.ts` intentionally
keeps `Content-Security-Policy-Report-Only` with **no
`report-uri`** yet — wiring that directive is the next slice so
the sink can be observed under synthetic traffic before real
reports start streaming. 5 new contract tests.
**Verdict:** ✅ safe impl + design doc. Doc:
`docs/P1_CSP_REPORTING_ENDPOINT_2026-05-27.md`.

### TASK 5 — Authenticated mutation rate-limit design
**Commit:** `2431c49` — design only (HARD BAN: no Vercel KV
provisioning). Two-layer architecture: **Layer 1** Vercel Edge
middleware keyed by `user_id` (from JWT), backed by Vercel KV;
**Layer 2** SlowAPI `user_limiter` keyed by
`request.state.user_id`, on the same 15 endpoints, with looser
budgets as defence-in-depth. Bucket-and-budget table for Free
vs Pro tiers, KV key schema, rollout / rollback plan.
**Verdict:** 📐 design ready; Layer 2 can ship today
(no KV needed) once founder approves. Doc:
`docs/P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`.

### TASK 6 — Smoke `paths-ignore` verification
**Commit:** `880d2dc` — docs only. Cross-referenced the five
prior commits in this session against
`gh api repos/.../commits/{sha}/check-runs`: all three docs-only
SHAs recorded `total_count: 0` (correctly skipped); both
code-touching SHAs ran smoke and went green. **No edit to
`.github/workflows/smoke.yml`** (HARD BAN respected). Captured
edge cases (`paths-ignore` is per-event, `**/*.md` is anchored
to root, `pull_request` evaluates the PR diff). Doc:
`docs/CI_SMOKE_PATHS_IGNORE_VERIFY_2026-05-27.md`.
**Verdict:** ✅ workflow correct as-is; no change required.

### TASK 7 — This report.

## What changed — fix vs design summary

| Tier        | Endpoints / surfaces | Count |
| ----------- | -------------------- | ----- |
| **Fix in code, shipped today** | `POST /auto-apply/trigger-sweep` (admin gate + rate limit), `POST /csp-report` (new sink) | **2** |
| **Design only** (migration / KV / env work needed) | Stripe `event.id` dedup, two-layer authenticated mutation rate-limit | **2** |
| **Verification only** (no source change) | beta waitlist rate-limit re-run, `smoke.yml` `paths-ignore` audit | **2** |

## Hard bans honoured (this session)

- ✅ No Railway deploy / redeploy.
- ✅ No prod env change.
- ✅ No DB migration / schema change.
- ✅ No scrape execution / no auto-apply execution.
- ✅ No real applications submitted to job boards.
- ✅ No CAPTCHA bypass.
- ✅ No force-push.
- ✅ No `.env` committed.
- ✅ No secrets in code, tests, or docs (only commit SHAs and
  Actions run IDs, both public on GitHub).
- ✅ No UX / copy change.
- ✅ No new product feature outside the security surface.
- ✅ No public-launch messaging.
- ✅ No big dashboard refactor.
- ✅ No mixing unrelated changes in one commit (each commit is
  one-concern; staged precisely).
- ✅ **No edit to `.github/workflows/smoke.yml`** — TASK 6 was
  docs-only verification only, per HARD BAN.
- ✅ CSP **enforce flip NOT applied** — Report-Only stays.

## What's still open after this session — top 5 next steps

1. **Land `frontend/next.config.ts` `report-uri` directive.**
   Append `report-uri /api/v1/csp-report;` to the existing
   `Content-Security-Policy-Report-Only` value. One-line diff
   in the same shipped report-only header. Unblocks the
   72-hour burn-in described in
   `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`.
2. **Ship Layer 2 of authenticated mutation rate-limit.**
   Per the TASK 5 design, the SlowAPI `user_limiter` with
   `key_func=lambda r: f"user:{r.state.user_id}"` and the
   `@user_limiter.limit("60/minute")` decorator on the 15
   listed endpoints. No KV, no Vercel change — just FastAPI
   defence-in-depth that we can land before Layer 1 is
   provisioned.
3. **Stripe event dedup migration + service.**
   `050_stripe_webhook_events.py` plus
   `backend/app/services/stripe_events.py` plus the 6-line
   handler patch documented in TASK 3's design. ~half-day
   work. Unblocks the only billing-side replay bug.
4. **Add `plan_tier` claim to the JWT.** Backend one-liner in
   `app/core/security.create_access_token`, but every existing
   client must re-login because old tokens lack the claim.
   Precondition for TASK 5 Layer 1; deserves its own staged
   rollout.
5. **Edge layer (Vercel KV) for authenticated mutation
   rate-limit.** Provision Vercel KV (founder-only), wire
   `frontend/middleware.ts`, port the bucket-and-budget table
   from TASK 5 design. Largest piece of remaining work, gates
   the "real" rate-limit story.

## Sanity sweep at end of session

```text
$ git status -sb
## cursor/phase1-monorepo-scaffold...origin/cursor/phase1-monorepo-scaffold
(clean)

$ cd backend && python -m pytest \
    tests/test_beta_waitlist_rate_limit.py \
    tests/test_auto_apply_trigger_sweep_admin_gate.py \
    tests/test_csp_report.py \
    tests/test_auto_apply_settings_api.py \
    tests/test_stripe_webhook_signature.py
20 passed in 2.10s

$ gh run list --branch cursor/phase1-monorepo-scaffold --limit 5
all 5 latest runs: success
```

## Files added by this session

Backend:

- `backend/app/api/csp_reports.py` (new endpoint, 113 LOC)
- `backend/app/api/router.py` (+2 lines, import + `include_router`)
- `backend/app/api/auto_apply_settings.py` (+19 lines, ops gate + rate limit)
- `backend/tests/test_auto_apply_trigger_sweep_admin_gate.py` (new, 4 tests)
- `backend/tests/test_csp_report.py` (new, 5 tests)

Docs:

- `docs/P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md`
- `docs/P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md`
- `docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`
- `docs/P1_CSP_REPORTING_ENDPOINT_2026-05-27.md`
- `docs/P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`
- `docs/CI_SMOKE_PATHS_IGNORE_VERIFY_2026-05-27.md`
- `docs/THREE_HOUR_SECURITY_ENGINEERING_REPORT_2026-05-27.md` (this doc)

## Verdict

- **2 P1 / P2 security holes closed in code** (auto-apply
  privilege escalation, CSP observability gap).
- **2 P2 holes documented as implementation-ready designs**
  (Stripe replay dedup, two-layer authenticated mutation
  rate-limit).
- **2 prior fixes verified** (beta waitlist rate limit,
  `paths-ignore` correctness).
- **Zero behaviour changes for end users.** No CSP enforce, no
  copy change, no UX flow change.
- **Zero deploy actions.** Railway untouched; Vercel untouched.
- **CI green** on every code-touching push; `paths-ignore`
  correctly skipped every docs-only push.
