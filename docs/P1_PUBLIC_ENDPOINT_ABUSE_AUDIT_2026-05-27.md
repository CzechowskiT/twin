# Backend public-endpoint abuse audit — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 9 of the long autonomous security session.
Enumerate every backend route that is reachable **without a
candidate JWT** (i.e. exposed to anonymous traffic and to bots
that completed signup), grade the per-endpoint abuse risk, and
list the smallest next-step that closes each gap. **Docs only
in this commit.**

## Method

```
$ rg -n '^@router\.(get|post|patch|put|delete)' backend/app/api/*.py
$ rg -n '@limiter\.limit'   backend/app/api/*.py
$ rg -n 'get_current_user'  backend/app/api/*.py
$ rg -n '_require_ops_admin|resolve_recruiter_access|partner_export_configured' backend/app/api/*.py
```

A route is "public" if it does **not** depend on
`get_current_user`. The audit further classifies each public
route by:

- **Limiter** — does a SlowAPI decorator cap requests by IP /
  user?
- **Cost driver** — what would a 1k-req/s attack actually spend
  on Railway / Anthropic / Stripe / Vercel?
- **Side effect** — does the endpoint write to DB, send mail,
  hit a third-party API, or queue a worker job?

## Public surface (no candidate JWT required)

### 1. Health / liveness

| Method | Path                                  | Limiter | Cost driver               | Side effect | Verdict          |
| ------ | ------------------------------------- | ------- | ------------------------- | ----------- | ---------------- |
| GET    | `/api/v1/health`                      | none    | one `SELECT 1` on `?db=`  | none        | ✅ OK            |
| GET    | `/api/v1/health/celery-status`        | none    | Celery `inspect.ping()` (4s) | none      | ⚠️ adds latency |
| GET    | `/api/v1/admin/deploy-health`         | none    | `OPS_ADMIN_TOKEN` gate    | none        | ✅ OK            |

**Risk:** an attacker can fan out `?db=1&ops=1` requests to
force the SQL `SELECT 1` per call, but the timeout is bounded
(`SET LOCAL statement_timeout = '2s'`). Worth a 10-30/sec
limit on `?ops=1` to bound the dashboard-poll cost, not P1.

### 2. Auth — registration / login / password / OAuth

| Method | Path                                       | Limiter        | Cost driver               | Side effect           | Verdict |
| ------ | ------------------------------------------ | -------------- | ------------------------- | --------------------- | ------- |
| POST   | `/api/v1/auth/register`                    | `5/min` (IP)   | bcrypt password hash      | new `users` row + mail | ✅      |
| POST   | `/api/v1/auth/login`                       | `5/min` (IP)   | bcrypt verify             | none                  | ✅      |
| POST   | `/api/v1/auth/login/json`                  | `5/min` (IP)   | bcrypt verify             | none                  | ✅      |
| POST   | `/api/v1/auth/forgot-password`             | `5/min` (IP)   | mail send                 | mail + reset token    | ✅      |
| POST   | `/api/v1/auth/verify-email`                | `10/min` (IP)  | DB lookup                 | mark user verified    | ✅      |
| POST   | `/api/v1/auth/verify-email/resend`         | `3/min` (IP)   | mail send                 | mail                  | ✅      |
| POST   | `/api/v1/auth/reset-password`              | `3/min` (IP)   | bcrypt hash               | password change       | ✅      |
| GET    | `/api/v1/auth/linkedin/login`              | **none**       | redirect to LinkedIn      | sets state cookie     | ⚠️ low  |
| GET    | `/api/v1/auth/linkedin/callback`           | **none**       | LinkedIn token exchange   | new oauth_accounts row | ⚠️ med  |
| GET    | `/api/v1/auth/{provider}/login`            | **none**       | redirect (Google/MS/GH/A) | sets state cookie     | ⚠️ low  |

**Risk on OAuth GETs:** the callback exchange burns a real
LinkedIn / Google token-exchange call per request; a 1k req/s
loop racks up provider quota. Risk score: **medium**.
Mitigation: per-IP 30/min on `*/callback` is the natural
defence; no business value above that for legitimate users.

### 3. Beta waitlist (referral-code-keyed)

| Method | Path                                                | Limiter      | Cost driver        | Side effect           | Verdict       |
| ------ | --------------------------------------------------- | ------------ | ------------------ | --------------------- | ------------- |
| GET    | `/api/v1/beta/stats`                                | **none**     | one DB COUNT       | none                  | ✅ low cost   |
| GET    | `/api/v1/beta/leaderboard`                          | **none**     | DB COUNT + sort    | none                  | ✅            |
| GET    | `/api/v1/beta/match-preview`                        | **none**     | DB read            | none                  | ✅            |
| POST   | `/api/v1/beta/join`                                 | `5/min` (IP) | DB insert + mail   | new waitlist row      | ✅            |
| GET    | `/api/v1/beta/waitlist/{code}`                      | **none**     | DB read by code    | none                  | ⚠️ enumeration |
| PATCH  | `/api/v1/beta/waitlist/{code}/profile`              | **none**     | DB write           | profile patch         | ⚠️ no rate cap |
| POST   | `/api/v1/beta/waitlist/{code}/linkedin-share`       | **none**     | DB upsert          | event row             | ⚠️ no rate cap |
| POST   | `/api/v1/beta/waitlist/{code}/testimonial`          | **none**     | DB write           | testimonial row       | ⚠️ no rate cap |
| POST   | `/api/v1/beta/waitlist/{code}/cv`                   | **none**     | **file upload**    | DB write + file store | ⚠️ **HIGH**    |
| POST   | `/api/v1/beta/waitlist/{code}/voice`                | **none**     | **file upload**    | DB write + file store | ⚠️ **HIGH**    |
| GET    | `/api/v1/beta/admin/stats`                          | `BETA_ADMIN_TOKEN` | DB read      | none                  | ✅            |
| GET    | `/api/v1/beta/admin/export`                         | `BETA_ADMIN_TOKEN` | DB read      | CSV stream            | ✅            |

**Top abuse vector:** the two file-upload endpoints accept
content keyed only by a guessable / leaked referral code, with
**no rate limit**. A loop trivially fills S3 / disk. Even with
a `Content-Length` cap there's no cap on **count**. **This is
the single most under-protected route in the audit.**

**Second:** `GET /beta/waitlist/{code}` lets an attacker
enumerate referral codes (one DB hit per guess). Codes are
short-ish; per-IP 60/min should be the floor.

### 4. Public stats / consent / geo

| Method | Path                                | Limiter  | Cost driver  | Side effect       | Verdict          |
| ------ | ----------------------------------- | -------- | ------------ | ----------------- | ---------------- |
| GET    | `/api/v1/public/mvp-stats`          | **none** | DB COUNT     | none              | ✅                |
| POST   | `/api/v1/consent/cookies`           | **none** | DB insert    | consent event row | ⚠️ no rate cap   |
| GET    | `/api/v1/geo/jurisdiction-hint`     | **none** | IP-geo lookup | none             | ✅                |
| GET    | `/api/v1/demo/snapshot`             | **none** | cached read | none              | ✅                |

`/consent/cookies` is the only write here. A bot can spam
consent events; the table grows linearly. Per-IP 30/min is
enough.

### 5. Recruiter inbox (token-keyed, not JWT)

| Method | Path                                          | Limiter | Cost driver       | Side effect          | Verdict                |
| ------ | --------------------------------------------- | ------- | ----------------- | -------------------- | ---------------------- |
| GET    | `/api/v1/recruiter/inbox`                     | **none** | DB read by slug   | none                 | ⚠️ depends on token leakage |
| POST   | `/api/v1/recruiter/inbox/{id}/respond`        | **none** | DB write          | application state move | ⚠️ same                |
| POST   | `/api/v1/recruiter/inbox/respond-batch`       | **none** | up to 50 writes   | application state    | ⚠️ same                |
| GET    | `/api/v1/recruiter/jobs`                      | **none** | DB read           | none                 | ⚠️ same                |
| POST   | `/api/v1/recruiter/jobs`                      | **none** | DB write          | new job row          | ⚠️ same                |

The recruiter token is the authentication; without a per-token
limit, a leaked token + bot loop can flip every application
in an inbox. Recommend per-token 60/min on writes.

### 6. Placement verification

| Method | Path                                            | Limiter | Cost driver | Side effect            | Verdict |
| ------ | ----------------------------------------------- | ------- | ----------- | ---------------------- | ------- |
| POST   | `/api/v1/placement/verify/confirm`              | **none** | DB write   | placement state move   | ⚠️       |
| GET    | `/api/v1/placement/employer/preview`            | **none** | DB read    | none                   | ✅       |
| POST   | `/api/v1/placement/employer/confirm`            | **none** | DB write   | placement attestation  | ⚠️       |

`/employer/confirm` is the one-click attestation; the signed
URL replaces JWT here. The signing buys us auth-ish, but no
rate cap on a per-employer-key basis means a brute-force on the
signing space (very small if HMAC truncated) could be feasible.
Worth a per-IP 10/min as defence-in-depth.

### 7. Talent pool

| Method | Path                                  | Limiter | Cost driver | Side effect | Verdict |
| ------ | ------------------------------------- | ------- | ----------- | ----------- | ------- |
| GET    | `/api/v1/talent-pool/anonymous`       | **none** | DB read     | none        | ✅       |

Read-only, cached. Per-IP 60/min is overkill; not a P1.

### 8. Billing surface (public)

| Method | Path                              | Limiter | Cost driver         | Side effect | Verdict |
| ------ | --------------------------------- | ------- | ------------------- | ----------- | ------- |
| GET    | `/api/v1/billing/plans`           | **none** | static read         | none        | ✅      |
| POST   | `/api/v1/billing/webhook`         | **none** | signature verify    | DB upserts  | ✅ Stripe sig is the gate |

### 9. CSP report sink

| Method | Path                              | Limiter        | Cost driver | Side effect | Verdict |
| ------ | --------------------------------- | -------------- | ----------- | ----------- | ------- |
| POST   | `/api/v1/csp-report`              | `60/min` (IP)  | log line    | none        | ✅      |

## Verdict — ranked by abuse risk

| Risk | Route                                              | Action                                                                                                  |
| ---- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **HIGH** | `POST /api/v1/beta/waitlist/{code}/cv`           | Add `@limiter.limit("5/minute")` per IP; cap upload count per `code` (e.g. 5 / day).                     |
| **HIGH** | `POST /api/v1/beta/waitlist/{code}/voice`        | Same.                                                                                                   |
| MED  | `GET  /api/v1/beta/waitlist/{code}`                | `@limiter.limit("60/minute")` per IP; closes a referral-code enumeration vector.                         |
| MED  | `POST /api/v1/beta/waitlist/{code}/{action}`      | `@limiter.limit("10/minute")` per IP on each of the 4 writes (profile, linkedin-share, testimonial, voice). |
| MED  | `POST /api/v1/recruiter/inbox/{id}/respond`        | Per-recruiter-token `60/minute`; or layer-2 user-keyed limiter using the token as the key.              |
| MED  | `POST /api/v1/recruiter/inbox/respond-batch`       | Same; the body already caps `application_ids` length at 50 — that's a separate per-call cap.           |
| LOW  | `GET  /api/v1/auth/linkedin/callback` (and others) | `@limiter.limit("30/minute")` per IP; bounds the upstream-provider token-exchange cost.                  |
| LOW  | `POST /api/v1/consent/cookies`                     | `@limiter.limit("30/minute")` per IP; cheap defence vs log-spam.                                         |
| LOW  | `GET  /api/v1/health/celery-status`                | `@limiter.limit("30/minute")` per IP; bounds the Celery `inspect.ping()` cost.                          |

## Suggested first commit (smallest safe slice)

A single follow-up commit that does **only** the HIGH rows:

```python
# backend/app/api/beta_waitlist.py
from app.limiter import limiter

@router.post("/waitlist/{referral_code}/cv", ...)
@limiter.limit("5/minute")
def upload_cv_for_code(request: Request, ...): ...

@router.post("/waitlist/{referral_code}/voice", ...)
@limiter.limit("5/minute")
def upload_voice_for_code(request: Request, ...): ...
```

Both endpoints already exist; the patch is `+2 decorators`,
`+1 import`, `+1 request param` per route. Test contract:

```python
# backend/tests/test_beta_waitlist_upload_rate_limit.py
def test_cv_upload_rate_limited():
    # 5 × 200 / 6th → 429
```

This commit was **deliberately scoped out of this audit** —
the audit ships docs-only, the fix ships separately so the
reviewer can size it in isolation. The fix is a single-file
patch + one new test file (5-line stub).

## Hard bans honoured

- ✅ Docs only.
- ✅ No source change.
- ✅ No DB migration.
- ✅ No Railway / Vercel change.
- ✅ No env / secret change.
- ✅ No scrape / no auto-apply execution.
- ✅ No real applications submitted to job boards.
- ✅ No CAPTCHA bypass.
- ✅ No `.env` committed.
- ✅ No UX / copy change.

## Files

- `docs/P1_PUBLIC_ENDPOINT_ABUSE_AUDIT_2026-05-27.md` (this
  doc).

## Related

- `docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md` — companion
  audit for authenticated mutating endpoints.
- `docs/P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`
  — the architecture that the authenticated audit fed into.
- `docs/P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md` — the
  shipped fix for `POST /beta/join` (same primitive applies
  here).
- `docs/P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md` —
  shipped fix using the same SlowAPI decorator pattern.
- `docs/P2_BACKEND_USER_RATE_LIMIT_LAYER2_2026-05-27.md` —
  user-keyed (JWT) variant; not applicable to these public
  routes but useful contrast.
