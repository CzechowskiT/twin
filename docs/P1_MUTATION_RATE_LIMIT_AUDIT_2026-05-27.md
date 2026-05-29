# P1 Candidate Mutation Rate-Limit Audit — 2026-05-27

TASK 3 of the **security / ops hardening** session on
`cursor/phase1-monorepo-scaffold` (morning, 2026-05-27).
Read-only audit of every candidate-side mutating endpoint
in scope, plus **one** minimal safe fix: a per-IP rate
limit on the public waitlist signup endpoint
(`POST /api/v1/beta/join`), since it was the only mutation
in scope without **any** rate gate and without auth.

## TL;DR

- Audited **9 endpoint families** in scope of the brief
  (match-feedback, save/dismiss, applications
  create / update / delete, auto-apply trigger, profile
  update, CV upload, waitlist signup, auth login / reset).
- **Auth endpoints (`login`, `register`,
  `forgot-password`, `reset-password`, `verify-email`,
  `verify-email/resend`, `change-password`)** all carry
  per-IP `slowapi` decorators today. Limits range from
  `3/minute` (high-cost mail send) to `10/minute` (token
  exchange). **No gap.**
- **`POST /api/v1/beta/join`** (public, unauthenticated)
  was missing a rate limit entirely. Added
  `@limiter.limit("5/minute")` (matches the `auth/login`
  budget exactly so we don't surprise a future Edge layer)
  and a new contract test
  (`backend/tests/test_beta_waitlist_rate_limit.py`).
  Behaviour for the first five requests is **unchanged**
  (still `200`); the sixth returns `429` with a SlowAPI
  `detail`. Risk of false positive on a real signup spike
  is bounded by the per-IP key — different users on
  different IPs are not co-rate-limited.
- **All authenticated mutating endpoints** (applications
  create / update / delete, auto-apply trigger,
  match-feedback, CV upload, profile update) **rely on
  auth-only today**. No backend-layer rate limit. This is
  intentional and the gap is tracked in
  `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
  item 5 — "Edge rate-limit on candidate mutations
  (Vercel KV)". That slice needs a founder-provisioned KV
  store + a per-`user_id` key strategy, neither of which
  is in scope today.
- Idempotency story is **strong** on the two endpoints
  that need it most: `POST /api/v1/applications/` and
  `POST /api/v1/applications/auto-apply` both honour an
  `Idempotency-Key` header backed by a DB-side replay
  cache (`try_replay_idempotent` /
  `_maybe_store_application_create_idem`). A double-click
  cannot create two `applications` rows nor fire
  auto-apply twice.
- Consent guards are **enforced** at the right places:
  `CV upload` and `intro audio upload` both require
  `processing_consent` on first call and persist the
  consent timestamp; auto-apply requires
  `AutoApplyConsent.consent_given_at` before any submit.

Verdict: **one minimal safe fix shipped (beta/join),
everything else is docs-only.** No production-code
change to authenticated endpoints in this session.

## Endpoint-by-endpoint audit

| # | Endpoint                                                  | Auth   | Existing rate limit                                  | Idempotency             | Consent guard                  | Verdict        |
| - | --------------------------------------------------------- | ------ | ---------------------------------------------------- | ----------------------- | ------------------------------ | -------------- |
| 1 | `POST /api/v1/auth/login` / `login/json`                  | n/a    | `slowapi 5/minute` (per-IP)                          | n/a (idempotent verb)   | n/a                            | ✅ OK          |
| 2 | `POST /api/v1/auth/register`                              | n/a    | `slowapi 5/minute` (per-IP)                          | DB unique constraint    | All 4 required consents        | ✅ OK          |
| 3 | `POST /api/v1/auth/forgot-password`                       | n/a    | `slowapi 5/minute` + custom per-IP sliding window    | n/a                     | n/a                            | ✅ OK          |
| 4 | `POST /api/v1/auth/reset-password`                        | n/a    | `slowapi 3/minute` (per-IP)                          | one-shot token          | n/a                            | ✅ OK          |
| 5 | `POST /api/v1/auth/verify-email[/resend]`                 | mixed  | `slowapi 10/minute` (verify) / `3/minute` (resend)   | one-shot token          | n/a                            | ✅ OK          |
| 6 | `POST /api/v1/auth/me/password` (change password)         | JWT    | `slowapi 10/minute`                                  | n/a                     | n/a                            | ✅ OK          |
| 7 | `POST /api/v1/applications/` (create)                     | JWT    | **none (backend)** — Edge KV planned                 | `Idempotency-Key` header backed by DB | Auto-apply gate via plan tier | 🟡 docs-only  |
| 8 | `PATCH /api/v1/applications/{id}` (update status / notes) | JWT    | **none (backend)** — Edge KV planned                 | n/a (PATCH-by-id, naturally idempotent in practice) | Auth scope by candidate ownership | 🟡 docs-only |
| 9 | `DELETE /api/v1/applications/{id}`                        | JWT    | **none (backend)** — Edge KV planned                 | n/a                     | Auth scope by candidate ownership | 🟡 docs-only |
| 10 | `POST /api/v1/applications/auto-apply`                   | JWT    | **none (backend)** — Edge KV planned                 | `Idempotency-Key` header backed by DB | `AutoApplyConsent.consent_given_at` required | 🟡 docs-only |
| 11 | `POST /api/v1/auto-apply/consent`                        | JWT    | **none (backend)**                                   | n/a (upsert)            | `consent_acknowledged=True` required | 🟡 docs-only |
| 12 | `PATCH /api/v1/auto-apply/settings`                      | JWT    | **none (backend)**                                   | n/a (PATCH-by-user)     | Existing consent required      | 🟡 docs-only  |
| 13 | `POST /api/v1/auto-apply/trigger`                        | JWT    | **none (backend)** — daily limit inside handler      | n/a                     | Active consent required        | 🟡 docs-only  |
| 14 | `POST /api/v1/auto-apply/trigger-sweep`                  | JWT    | **none (backend)**, **no admin gate**                | n/a                     | n/a                            | ⚠️ flagged    |
| 15 | `POST /api/v1/candidates/me/match-feedback`              | JWT    | **none (backend)** — Edge KV planned                 | upsert by `(candidate_id, job_id)` | n/a                  | 🟡 docs-only  |
| 16 | `POST /api/v1/candidates/me/cv` (CV upload)              | JWT    | **none (backend)** — size cap via `cv_max_bytes`     | n/a                     | `processing_consent` required on first upload | 🟡 docs-only |
| 17 | `POST /api/v1/candidates/me/intro-audio` (voice upload)  | JWT    | **none (backend)** — size cap via `intro_audio_max_bytes` | n/a                | `processing_consent` required  | 🟡 docs-only  |
| 18 | `POST /api/v1/candidates/me/documents` (other docs)      | JWT    | **none (backend)** — size cap                        | n/a                     | `processing_consent` required  | 🟡 docs-only  |
| 19 | `PUT /api/v1/candidates/me` (profile update)             | JWT    | **none (backend)** — Edge KV planned                 | n/a (upsert by user)    | Plan-gated edit (`_enforce_profile_edit`) | 🟡 docs-only |
| 20 | `POST /api/v1/beta/join` (waitlist signup)               | **n/a** | **NEW: `slowapi 5/minute`** (this commit)           | DB unique on `email`    | `accept_privacy_notice` + `consent_beta_email_updates` required | ✅ **fixed in this PR** |
| 21 | `POST /api/v1/beta/waitlist/{ref}/linkedin-share`        | by referral_code | **none (backend)**                          | guarded by `if not row.linkedin_shared` (one-shot) | n/a              | 🟡 docs-only  |
| 22 | `POST /api/v1/beta/waitlist/{ref}/testimonial`           | by referral_code | **none (backend)**                          | guarded by `if not row.testimonial_posted` (one-shot) | n/a            | 🟡 docs-only  |
| 23 | `POST /api/v1/beta/waitlist/{ref}/cv`                    | by referral_code | **none (backend)** — size cap (`beta_upload_max_bytes`) | n/a              | n/a                            | 🟡 docs-only  |
| 24 | `POST /api/v1/beta/waitlist/{ref}/voice`                 | by referral_code | **none (backend)** — size cap (`beta_upload_max_bytes`) | n/a              | n/a                            | 🟡 docs-only  |
| 25 | `PATCH /api/v1/beta/waitlist/{ref}/profile`              | by referral_code | **none (backend)**                          | n/a (PATCH-by-id)       | n/a                            | 🟡 docs-only  |

Notes on the "docs-only" rows: the security plan
(`docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
item 5) is the right place for these, not a backend
SlowAPI decorator. Two reasons:

- The right key for an **authenticated** endpoint is
  `user_id`, not `IP`. SlowAPI's `get_remote_address`
  default would over-block users behind corporate NAT.
  The Edge slice solves this by switching the key to
  `user_id` when the request has a session.
- The right enforcement layer is the **edge** (Vercel
  Routing Middleware + KV), not the FastAPI process —
  rejecting at the edge means we don't burn an API
  worker per blocked request, which matters for a real
  abuse wave.

## The one fix landed in this commit

### What changed

`backend/app/api/beta_waitlist.py`:

- Added `Request` to the FastAPI imports.
- Added `from app.limiter import limiter`.
- Decorated `beta_join` with `@limiter.limit("5/minute")`.
- Promoted the new `request: Request` parameter to the
  first arg (SlowAPI's `get_remote_address` key
  function picks the IP off `request.client.host`).

Diff is six lines. No schema change. No DB change. No env
change. No new dependency.

### What it does

| Property        | Before                                | After                                  |
| --------------- | ------------------------------------- | -------------------------------------- |
| First 5 req/min | `200` + waitlist row + welcome email  | unchanged                              |
| 6th req/min     | `200` + waitlist row + welcome email  | `429` with SlowAPI `detail`            |
| Auth required   | no                                    | no                                     |
| Idempotency     | DB unique on `email` (existing)       | unchanged                              |

The 5/min budget matches `/auth/login` and `/auth/register`
exactly so a future Edge KV layer can reuse the same
budget and we won't have two stacked rate limits with
different windows (the "which one fires first?" trap).

### Why this one is in scope

This endpoint is the **only** in-scope candidate mutation
that is **both public (no JWT) and uncapped (no rate
gate)**. Every other in-scope mutation either:

- has a SlowAPI decorator today (the auth family), or
- has JWT auth gating it (everything else).

So the worst-case abuse vector for `beta/join` is a single
attacker pumping the public endpoint to:

1. fill the waitlist table with junk rows (and pollute
   the queue position math), and
2. burn through the transactional-email vendor quota by
   triggering a welcome email per signup.

Both are real costs and neither is gated by anything
upstream of FastAPI today. A `5/minute` per-IP cap is the
narrowest possible fix.

### Test

`backend/tests/test_beta_waitlist_rate_limit.py` — one
test:

- `test_beta_join_rate_limit_returns_429_after_five`
  POSTs 5 signups (different emails, same TestClient =
  same IP) and asserts each returns `200`; the sixth
  POST asserts `429` with a `rate` / `limit` / `exceeded`
  string in the SlowAPI detail.

All tests run in <2s on the local backend venv:

```text
$ cd backend && .venv/bin/python -m pytest \
    tests/test_beta_waitlist_rate_limit.py \
    tests/test_beta_waitlist_mail.py \
    tests/test_auth_login_rate_limit.py -q
.....                                                                    [100%]
5 passed, 14 warnings in 1.72s
```

## Other findings (no fix in this commit)

### Open: `POST /api/v1/auto-apply/trigger-sweep` has no admin gate

`backend/app/api/auto_apply_settings.py:276` exposes a
`POST /api/v1/auto-apply/trigger-sweep` that queues the
**full nightly auto-apply sweep** (every user with active
consent) via `nightly_auto_apply_sweep.delay(dry_run=False)`.
The only auth on it today is `get_current_user` —
**any** authenticated user can call it. There is no
admin check, no ops gate, no `scrape_ops_user_ids`
allow-list reference.

This is **not** a rate-limit bug, but it surfaced during
the audit. Tracked as a follow-up — adding an admin /
ops gate is one line:

```python
from app.core.scrape_ops import user_has_scrape_ops

if not user_has_scrape_ops(user, get_settings()):
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admin only.")
```

Out of scope for this docs-only session because (a) it
changes behaviour for whatever scripts are calling it
today and (b) it interacts with the larger "scrape ops"
gating story.

### Open: `Idempotency-Key` is only honoured on `applications` POST

`backend/app/api/applications.py:374` (create) and `:480`
(auto-apply) both honour an `Idempotency-Key` header via
`try_replay_idempotent` / `_maybe_store_application_create_idem`.
**No other in-scope mutation does** — `match-feedback`,
`profile update`, `CV upload`, `auto-apply consent`,
`auto-apply trigger`, etc., all replay on retry.

Most of these have upsert semantics so the replay is
benign (`match-feedback` upserts by
`(candidate_id, job_id)`; `auto-apply consent` upserts
by `candidate_id`). But the **frontend currently does
not retry** these on network failure — adding a generic
`Idempotency-Key` plumbing is a P2 chore, not a P1 hole.

### Open: per-`referral_code` mutations on `/beta/waitlist/{ref}/*`

The waitlist dashboard mutations use the **referral_code
as the auth secret**. That works for a public referral
page, but the secret is **printed in the welcome email**
and in the dashboard URL, so anyone with the URL can:

- upload a CV against the holder's account
  (`POST /beta/waitlist/{ref}/cv`),
- update profile fields (`PATCH /beta/waitlist/{ref}/profile`),
- claim LinkedIn-share / testimonial points
  (one-shot guarded, low impact).

Mitigations today: size cap on uploads, one-shot guard on
points-claiming mutations. **No rate limit on the upload
endpoints.** This is a known constraint of the "no-login
waitlist" pattern and matches the `docs/BETA_ONLINE_PL.md`
flow. Hardening (e.g. send a magic-link email confirming
the referral code, or rotate codes) is a P2 follow-up.

## Hard bans honoured (this run)

- No Railway change / redeploy.
- No API redeploy.
- No DB migration.
- No prod env change.
- No secret / JWT in this doc or test file.
- No `--no-verify`, no force-push.
- No scrape / auto-apply / real application send (test
  uses SQLite + override).
- No UX / copy change (the rate-limit `detail` text is
  SlowAPI's default and matches `/auth/login`).
- The only behavioural change is the new 5/min cap on
  `POST /api/v1/beta/join` — bounded to a per-IP budget
  identical to `/auth/login`.

## Files changed

- `backend/app/api/beta_waitlist.py` (3-line diff;
  Request import, limiter import, decorator).
- `backend/tests/test_beta_waitlist_rate_limit.py` (new).
- `docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md`
  (this doc).

## Related

- `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
  item 5 — Edge rate-limit on candidate mutations (Vercel
  KV) is the proper home for limits 7–19 above.
- `docs/AUTH_PASSWORD.md` — password / login rate-limit
  story.
- `docs/PLACEMENT_VERIFICATION.md` — placement state
  machine that the application mutations feed into.
- `docs/BETA_ONLINE_PL.md` — waitlist / referral flow
  this endpoint serves.
