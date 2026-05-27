# P2 Backend mutation rate-limit — Layer 2 shipped — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 2 of the long autonomous security session.
Ships the **backend SlowAPI defence-in-depth layer** sketched in
`docs/P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`,
keyed by JWT subject. No edge / Vercel KV change — that's
still Layer 1, gated on KV provisioning.

## What this slice covers

8 LLM-cost endpoints (`career-assistant` + `interview-coach`)
where one valid JWT can burn real Claude $ per minute. The full
audit (`docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md`) lists
15 mutating endpoints; the remaining 7 (applications,
candidates uploads, feedback) are mutation-write rather than
LLM-cost and ship in a follow-up commit once these prove safe
on prod.

| Endpoint                                                            | Cost driver                            |
| ------------------------------------------------------------------- | -------------------------------------- |
| `POST /api/v1/career-assistant/applications/{id}/ats-cv`            | Claude completion (CV optimisation)    |
| `POST /api/v1/career-assistant/interview-prep`                      | Claude completion (prep questions)     |
| `POST /api/v1/career-assistant/applications/{id}/salary-negotiation` | Claude completion (offer counter)     |
| `POST /api/v1/career-assistant/interviews/{id}/follow-up`           | Claude completion (follow-up email)    |
| `POST /api/v1/career-assistant/jobs/{id}/hiring-insights`           | Claude completion (insights)           |
| `POST /api/v1/career-assistant/me/linkedin-optimize`                | Claude completion (LinkedIn rewrite)   |
| `POST /api/v1/interview-coach/generate-questions`                   | Claude completion (practice questions) |
| `POST /api/v1/interview-coach/evaluate-answer`                      | Claude completion (answer scoring)     |

Each is decorated with `@limiter.limit("60/minute",
key_func=user_or_ip_key)`. The budget is deliberately loose so
no real user can ever hit it; the layer is a sanity cap against
runaway client loops and credential-stuffed bots.

## The new key helper

`backend/app/limiter.py`:

```python
def user_or_ip_key(request: Request) -> str:
    """user:<jwt-sub> when a Bearer token is valid; IP otherwise."""
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth:
        scheme, _, token = auth.partition(" ")
        if scheme.lower() == "bearer" and token:
            try:
                sub = decode_access_token(token.strip())
            except Exception:
                sub = None
            if sub:
                return f"user:{sub}"
    return get_remote_address(request)
```

Properties:

- **No DB call.** JWT is decoded with the same `SECRET_KEY` as
  `get_current_user`; we never touch SQLAlchemy from the
  rate-limit layer. A DB outage cannot cascade into 500s on
  the limiter check.
- **Falls back to IP.** Unauthenticated probes are keyed by
  IP, which means the layer behaves identically to the existing
  default limiter when no JWT is present. The route itself
  still 401s via `OAuth2PasswordBearer`.
- **Exception-safe.** Any decode error returns `None` and we
  fall back to IP. The key function never raises.

## Why IP-keying is insufficient for these routes

From the design doc, summarised here for reviewers:

1. **Corporate NAT** — two engineers in one office share one
   IP. A flat IP-keyed 60/min would 429 the second one as soon
   as the first finishes a workflow.
2. **CGNAT on mobile carriers (T-Mobile / Orange PL)** —
   hundreds of users on one IP.
3. **No cost cap on the bad actor with a real JWT.** IP keying
   doesn't help against a single compromised account with
   automation running.

User keying solves all three.

## Why not also ship the writes (applications, uploads, feedback)?

Those endpoints are mutation-state-machine writes (idempotency
keys, application lifecycle, file uploads). The blast radius of
a misconfigured 429 there is broken end-user flows, not just a
delayed Claude call. Splitting into a separate commit lets us:

- Watch the LLM-bucket 429 rate for a week on the preview
  alias.
- Tune the 60/min budget before extending to the
  user-perceived flows.

## Test coverage

`backend/tests/test_user_rate_limiter.py` (4 tests, all green):

1. `test_user_or_ip_key_extracts_sub_from_bearer` — keys by
   `user:<sub>` for valid JWTs, falls back to IP otherwise.
2. `test_interview_coach_isolates_buckets_per_user` — Alice
   and Bob each get a fresh 200 on the same endpoint despite
   sharing the test client IP.
3. `test_interview_coach_returns_429_when_budget_exhausted` —
   60 × 200, 61st = 429. (Tests the full 60/min budget.)
4. `test_interview_coach_rejects_unauthenticated` — anonymous
   probe → 401 from `OAuth2PasswordBearer`, not 429. Confirms
   the limiter doesn't accidentally take over the auth surface.

Regression sweep on every adjacent suite:

```
$ pytest \
    tests/test_career_assistant.py \
    tests/test_user_rate_limiter.py \
    tests/test_auto_apply_trigger_sweep_admin_gate.py \
    tests/test_beta_waitlist_rate_limit.py \
    tests/test_csp_report.py \
    tests/test_auto_apply_settings_api.py \
    tests/test_stripe_webhook_signature.py
30 passed in 4.05s
```

## Operator-visible side effects

- `429` on any of the 8 LLM endpoints when a single account
  POSTs more than 60×/minute. The response body is SlowAPI's
  default JSON: `{"error":"Rate limit exceeded: 60 per 1 minute"}`.
- No new env vars.
- No new dependencies.
- No new DB tables / columns.
- No CSP / header change.

## Rollback

If a real customer hits 60/min legitimately (extremely
unlikely for these routes — each call is multi-second LLM
work), the rollback is a one-character edit on the decorator
budget per endpoint. No data side-effect.

## Hard bans honoured

- ✅ No Railway deploy.
- ✅ No prod env change.
- ✅ No DB migration / schema change.
- ✅ No scrape / auto-apply execution.
- ✅ No real applications to job boards.
- ✅ No CAPTCHA bypass.
- ✅ No force-push.
- ✅ No `.env` committed.
- ✅ No secrets in code, tests, or docs.
- ✅ No UX / copy change.
- ✅ No new product feature; rate-limit headers add zero new
  surface.
- ✅ No CSP enforce flip.

## Files changed

- `backend/app/limiter.py` — adds `user_or_ip_key` helper and
  shared docstring.
- `backend/app/api/interview_coach.py` — `@limiter.limit("60/
  minute", key_func=user_or_ip_key)` on 2 routes.
- `backend/app/api/career_assistant.py` — same decorator on 6
  routes.
- `backend/tests/test_user_rate_limiter.py` — 4 new tests.
- `docs/P2_BACKEND_USER_RATE_LIMIT_LAYER2_2026-05-27.md`
  (this doc).

## Follow-ups (not in this commit)

1. Extend the user-keyed decorator to the remaining 7
   mutating endpoints (applications create/patch/delete,
   candidate uploads, feedback) once the LLM bucket settles
   on a believable 95th percentile in production logs.
2. Ship Layer 1 (Vercel Edge KV) once the founder provisions
   KV on the Vercel project. Architecture lives in
   `docs/P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`.
3. Add JWT `plan_tier` claim so Layer 1 can give Pro users a
   higher budget without a Railway round-trip.

## Related

- `docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md` — the
  audit that surfaced the 15 endpoints.
- `docs/P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`
  — Layer 1 + Layer 2 architecture (this commit is the
  Layer 2 portion).
- `docs/P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md` — same
  primitive (SlowAPI), different key (IP) for the public
  signup endpoint.
- `docs/P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md` —
  same primitive, IP-keyed, for an ops-only mutation.
