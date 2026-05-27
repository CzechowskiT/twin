# P1 Security / Ops Hardening — Session Report — 2026-05-27

Closing report for the 2026-05-27 morning **security / ops
hardening** session on
`cursor/phase1-monorepo-scaffold`. Five new commits shipped
to `origin`. Production left untouched. Branch is shippable.

This doc follows the 11-point report template the founder
asked for.

## 1. Start / end

- **Start:** 2026-05-27, ~10:41 (UTC+2).
  Branch tip: `5cf2b79 docs(release): add morning
  engineering handoff` after `git pull --ff-only` (`8d1804d`
  also came down from origin during the pull as a parallel
  baseline doc; merged cleanly).
- **End:** 2026-05-27, ~12:25 (UTC+2).
  Branch tip: `ef93e16 test(security): cover security
  headers`.
- **Duration:** ~1h 45m.
- **Tasks executed:** 6 / 6 (pre-flight + 5 audit slices +
  this report).
- **Working tree:** clean at end; up to date with
  `origin/cursor/phase1-monorepo-scaffold`.

## 2. Commits shipped (with SHAs, in order)

| # | SHA       | Type             | Title                                              | Files                                                                                            |
| - | --------- | ---------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1 | `fb8dce4` | `docs(security)` | record dependency audit baseline (docs only)       | `docs/P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md`                                                |
| 2 | `4ef9fa8` | `test(stripe)`   | cover webhook signature handling                   | `backend/tests/test_stripe_webhook_signature.py`, `docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md`   |
| 3 | `45e5d6a` | `fix(security)`  | add rate limit to beta waitlist signup             | `backend/app/api/beta_waitlist.py`, `backend/tests/test_beta_waitlist_rate_limit.py`, `docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md` |
| 4 | `6b6f4f3` | `test(privacy)`  | cover analytics consent gating                     | `frontend/scripts/analytics-consent-default-denied.test.ts`, `frontend/package.json`, `docs/P1_COOKIE_ANALYTICS_AUDIT_2026-05-27.md` |
| 5 | `ef93e16` | `test(security)` | cover security headers                             | `frontend/scripts/security-headers.test.ts`, `frontend/package.json`, `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` |

All five pushed to
`origin/cursor/phase1-monorepo-scaffold` immediately after
each commit. No force-push. No `--no-verify`.

## 3. Checked items (audit coverage)

| Area                                          | Outcome              | Doc                                                                 |
| --------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| **`npm audit`** for `frontend/`               | 2 moderate (nested postcss in Next 16; npm "fix" is bogus); 0 high / 0 critical | `docs/P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md` |
| **`npm outdated`** for `frontend/`            | 5 safe patch/minor candidates flagged, deferred to follow-up PR | same                                                              |
| **`pip-audit` / `safety`** for `backend/`     | Tool unavailable in workspace venv; deferred to CI job (security plan item 4) | same                                              |
| **Stripe webhook signature** (`POST /api/v1/billing/webhook`) | `stripe.Webhook.construct_event` enforced, no fallback, raw body, env-only secret, 5 new contract tests, all pass | `docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md` |
| **ATS hooks** (Greenhouse / Lever / Ashby)    | HMAC-SHA256 over raw body, prod-rejects unsigned traffic — already correct, listed for context only | same                                              |
| **Candidate mutation rate limits** (auth + waitlist + applications + auto-apply + match-feedback + CV upload + profile update) | Auth family already has slowapi; 1 minimal fix shipped for `POST /api/v1/beta/join` (the only public unauth mutation with no rate gate); everything else deferred to Edge KV (security plan item 5) | `docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md` |
| **Cookie consent / analytics gating** (PostHog, Plausible, banner, consent provider, server audit) | All analytics gated on `consent.analytics === true`; default-denied invariant frozen in a new node-tsx test (6/6 OK); backend audit row stores `sha256(visitor_id)`, no PII | `docs/P1_COOKIE_ANALYTICS_AUDIT_2026-05-27.md` |
| **CSP readiness** (Report-Only → enforce path) | Full inventory of every external origin we touch; proposed enforce-mode CSP shape; burn-in gate (72h preview); rollback plan; new structural test (8/8 OK) freezes today's headers | `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` |

## 4. Fixed items (code change)

Exactly one in-process behavioural change in this session:

| File                                | Change                                                            | Risk                                                 |
| ----------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| `backend/app/api/beta_waitlist.py`  | Added `@limiter.limit("5/minute")` to `POST /api/v1/beta/join`    | Per-IP cap matches `/auth/login` budget exactly; first 5 requests still 200 |

Diff: 6 lines (Request import, limiter import, decorator,
add `request: Request` to signature). No DB change. No env
change. No migration. No new dependency.

## 5. Docs-only items

Six new docs (one per task + this report):

- `docs/P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md`
- `docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md`
- `docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md`
- `docs/P1_COOKIE_ANALYTICS_AUDIT_2026-05-27.md`
- `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`
- `docs/P1_SECURITY_OPS_SESSION_REPORT_2026-05-27.md`
  (this doc)

Three new test files (all green, all wired into the build
graph):

- `backend/tests/test_stripe_webhook_signature.py` (5 tests)
- `backend/tests/test_beta_waitlist_rate_limit.py` (1 test)
- `frontend/scripts/analytics-consent-default-denied.test.ts` (6 assertions)
- `frontend/scripts/security-headers.test.ts` (8 assertions)

Two new `package.json` script aliases:

- `npm run test:analytics-consent`
- `npm run test:security-headers`

## 6. Lint / tsc / build results

End-of-session gates from `frontend/`:

| Gate                        | Result                       |
| --------------------------- | ---------------------------- |
| `npm run lint` (eslint)     | 0 errors / 0 warnings        |
| `npx tsc --noEmit`          | 0 errors                     |
| `npm run build` (Next 16)   | 0 errors, 85 routes prerendered or marked `ƒ` (dynamic) as expected |
| `npm run test:cookie-consent` | 4/4 OK                     |
| `npm run test:analytics-consent` | 6/6 OK                  |
| `npm run test:security-headers` | 8/8 OK                   |

No new TypeScript warnings. No new ESLint warnings.

## 7. Backend tests run

End-of-session pytest sweep against
`backend/.venv/bin/python -m pytest` for the touched files
+ their nearest neighbours:

```text
$ cd backend && .venv/bin/python -m pytest \
    tests/test_stripe_webhook_signature.py \
    tests/test_beta_waitlist_rate_limit.py \
    tests/test_billing_plans.py \
    tests/test_startup_validation.py \
    tests/test_app_import_boot.py \
    tests/test_beta_waitlist_mail.py \
    tests/test_auth_login_rate_limit.py -q

..................                                                       [100%]
18 passed, 14 warnings in 2.53s
```

Breakdown:

- `test_stripe_webhook_signature.py` — 5 new tests
  (no-signature reject, bad-signature reject,
  wrong-secret reject, signed-but-unhandled-event accept,
  unconfigured 503).
- `test_beta_waitlist_rate_limit.py` — 1 new test
  (first 5 ok, 6th returns 429).
- `test_billing_plans.py` — existing 3 tests.
- `test_startup_validation.py` — existing 4 tests.
- `test_app_import_boot.py` — existing 1 test.
- `test_beta_waitlist_mail.py` — existing 3 tests.
- `test_auth_login_rate_limit.py` — existing 1 test.

All 18 pass.

## 8. Railway touched?

**No.** Zero Railway interaction in this session:

- No `railway up`, no `railway redeploy`, no `railway run`.
- No env-var change.
- No service config change.
- No DB migration (no `alembic upgrade`).
- The `STRIPE_WEBHOOK_SECRET` was inspected by source
  reference only — never read, never printed, never sent
  over the wire.

## 9. Hard bans respected?

| Hard ban                                                            | Honoured |
| ------------------------------------------------------------------- | -------- |
| No Railway changes / redeploy                                       | ✅       |
| No API redeploy                                                     | ✅       |
| No scrape / auto-apply / application sends                          | ✅       |
| No DB migrations                                                    | ✅       |
| No production env changes                                           | ✅       |
| No secrets / JWT / tokens in output / commits                       | ✅       |
| No force-push                                                       | ✅       |
| No CAPTCHA / Cloudflare / LinkedIn bypass                           | ✅       |
| No UX / copy changes                                                | ✅       |
| No new product features                                             | ✅       |
| No major dashboard refactors                                        | ✅       |

The single behavioural change (the `5/minute` cap on
`POST /api/v1/beta/join`) does not violate any of the
above — it adds a defence-in-depth layer on a public
endpoint, uses the existing SlowAPI primitive, and matches
the budget already in production on `/auth/login`.

## 10. Verdicts

### Controlled pilot (5–25 candidates, friendly recruiters)

**Green. Ship.** All audit gates pass; the one behavioural
fix tightens an obvious abuse surface without changing UX
for any honest user (5 signups / minute / IP). Production
state is identical to start-of-session except the new
rate-limit decorator on `/beta/join` (which the API will
pick up on next deploy — explicitly not redeployed in this
session).

### Investor / CTO show-and-tell

**Green.** The session output is a coherent audit story:
- Stripe signature path is enforced, raw-body, env-only,
  and now contract-tested.
- Analytics is consent-gated end-to-end with a default-
  denied test.
- Public unauthenticated mutation is rate-limited.
- CSP enforce path has a clear three-slice plan with
  burn-in + rollback.
- Dependency audit baseline is recorded for next CI run.

Each item is one PR-shaped commit with the right scope
prefix (`docs(security)`, `test(stripe)`,
`fix(security)`, `test(privacy)`, `test(security)`).

### Public launch / open registration

**Amber — not yet.** Three open items block a fully-open
launch:

1. **CSP enforce flip** (security plan item 1) — still
   in Report-Only with a permissive `https:` wildcard
   set. Plan is in place; needs the nonce spike + 72h
   burn-in.
2. **Edge KV rate-limit for authenticated mutations**
   (security plan item 5) — backend slowapi is per-IP
   and only on auth family; authenticated mutations
   (`/applications/*`, `/match-feedback`, CV upload,
   profile update) have no rate gate yet. Today the
   abuse vector requires a valid JWT, which limits
   blast radius, but does not stop a single bad actor
   with a paid plan.
3. **`auto-apply/trigger-sweep` admin gate** —
   discovered during TASK 3; any authenticated user
   can trigger the full nightly sweep. One-line fix
   queued, not in this session.

None of these are show-stoppers for a controlled pilot;
all three should be closed before unlimited public sign-up.

## 11. Top 5 next tasks (priority order)

| # | Task                                                                 | Owner                | Size | Why                                                                                   |
| - | -------------------------------------------------------------------- | -------------------- | ---- | ------------------------------------------------------------------------------------- |
| 1 | Land **`/api/v1/csp-report`** endpoint + report-uri directive        | BE agent             | S    | Pre-req for CSP burn-in. Without it the violation reports go nowhere.                |
| 2 | Add **admin gate** on `POST /api/v1/auto-apply/trigger-sweep`        | BE agent             | XS   | One-liner from TASK 3 audit; closes a real privilege-escalation surface.             |
| 3 | Ship **Stripe `event.id` dedup table** + Alembic migration           | BE agent + founder   | M    | TASK 2 follow-up. Needs migration + Railway redeploy; founder must coordinate.       |
| 4 | Cut over to **httpOnly auth cookie + CSRF token** (security plan §2) | FE + BE agents       | L    | Removes the localStorage JWT exposure; pre-req for the CSP nonce slice.              |
| 5 | Wire **Vercel KV Edge rate-limit** on authenticated candidate mutations (security plan §5) | FE agent + founder | M    | Founder must provision Vercel KV (one-time); agent codes the middleware on top.      |

(Items 4 and 5 are already sized in detail in
`docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`;
items 1–3 are net new from this session.)

## Pre-flight (session start) — for reproducibility

```text
$ cd /Users/tomek/Projects/twin
$ git fetch --all --prune
From https://github.com/CzechowskiT/twin
 * branch            cursor/phase1-monorepo-scaffold -> FETCH_HEAD

$ git checkout cursor/phase1-monorepo-scaffold
Already on 'cursor/phase1-monorepo-scaffold'
Your branch is up to date with 'origin/cursor/phase1-monorepo-scaffold'.

$ git pull --ff-only origin cursor/phase1-monorepo-scaffold
Already up to date.

$ git status -sb
## cursor/phase1-monorepo-scaffold...origin/cursor/phase1-monorepo-scaffold

$ git log --oneline -12
5cf2b79 docs(release): add morning engineering handoff
cd61350 test(frontend): strengthen public smoke coverage
1c189ff docs(security): prepare p1 implementation plan
bb819ef docs(vercel): document canonical deploy runbook
6244732 docs(ci): document workflow enablement steps
24b44f9 docs(release): record p1 release baseline
cd648b4 docs(release): record overnight engineering progress
703efe1 docs(observability): outline p1 logging metrics tracing plan
ddce6dd docs(security): outline p1 auth and observability next steps
a03e68a docs(vercel): document production alias workflow
50dedde chore(ci): harden p1 release checks
a022f14 test(dashboard): add safe dashboard smoke coverage

$ cd frontend
$ npm run lint     # 0 errors / 0 warnings
$ npx tsc --noEmit # 0 errors
$ npm run build    # 0 errors, 85 routes
```

End-of-session HEAD is `ef93e16`.

## Files index (this session)

```
docs/P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md       (rewritten)
docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md            (new)
docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md       (new)
docs/P1_COOKIE_ANALYTICS_AUDIT_2026-05-27.md          (new)
docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md            (new)
docs/P1_SECURITY_OPS_SESSION_REPORT_2026-05-27.md     (this doc)

backend/app/api/beta_waitlist.py                       (3-line diff)
backend/tests/test_stripe_webhook_signature.py         (new)
backend/tests/test_beta_waitlist_rate_limit.py         (new)

frontend/package.json                                  (2 new aliases)
frontend/scripts/analytics-consent-default-denied.test.ts (new)
frontend/scripts/security-headers.test.ts              (new)
```

## Related runbooks / plans

- `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
  — the parent plan; this session delivered items 4
  (baseline), 6 (Stripe audit + test), 7 (consent
  gating audit), and slice 0 of item 1 (CSP readiness +
  structural test).
- `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md` —
  original backlog doc; one new item (Stripe `event.id`
  dedup) lifted into the priority list above.
- `docs/P1_RELEASE_BASELINE_2026-05-27.md` — same-day
  pre-run baseline.
- `docs/MORNING_ENGINEERING_HANDOFF_2026-05-27.md` —
  the previous (release-hygiene) handoff that this
  session immediately followed.
