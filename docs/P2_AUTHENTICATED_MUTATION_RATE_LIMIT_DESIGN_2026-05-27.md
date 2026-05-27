# P2 — Authenticated Mutation Rate-Limit (Design) — 2026-05-27

**Scope:** TASK 5 of the 3-hour security session on
`cursor/phase1-monorepo-scaffold`. **Design only — no Vercel KV
provisioning today.**

Companion to:

- `docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md` (audit of
  every mutating endpoint; this doc designs the missing layer).
- `docs/P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md` (the public
  signup limit shipped earlier).
- `docs/P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md` (the
  ops-only sweep gate shipped earlier).

## The gap

Every `JWT`-gated mutation in the candidate-side surface has
**no backend rate limit today** beyond per-user business
logic (e.g. `auto-apply.daily_limit`, plan-tier gates). From
the audit, the unprotected endpoints are:

| #  | Endpoint                                                  | Why mutating                                   |
| -- | --------------------------------------------------------- | ---------------------------------------------- |
| 1  | `POST /api/v1/applications/`                              | New application row + idempotency cache write  |
| 2  | `PATCH /api/v1/applications/{id}`                         | Status / notes update                          |
| 3  | `DELETE /api/v1/applications/{id}`                        | Soft-delete on candidate's row                 |
| 4  | `POST /api/v1/applications/auto-apply`                    | Synchronous apply (heavy; LLM + scraper)       |
| 5  | `POST /api/v1/auto-apply/consent`                         | Upsert AutoApplyConsent                        |
| 6  | `PATCH /api/v1/auto-apply/settings`                       | Update min_score / daily_limit                 |
| 7  | `POST /api/v1/auto-apply/trigger`                         | Single-user sweep                              |
| 8  | `POST /api/v1/candidates/me/match-feedback`               | Upsert match feedback row                      |
| 9  | `POST /api/v1/candidates/me/cv`                           | File upload (size capped but no count cap)     |
| 10 | `POST /api/v1/candidates/me/intro-audio`                  | File upload                                    |
| 11 | `POST /api/v1/candidates/me/documents`                    | File upload (general)                          |
| 12 | `PUT /api/v1/candidates/me`                               | Profile update                                 |
| 13 | `POST /api/v1/career-assistant/messages`                  | LLM-backed chat (token cost on every call)     |
| 14 | `POST /api/v1/interview-coach/sessions`                   | LLM-backed                                     |
| 15 | `POST /api/v1/feedback`                                   | Product feedback row                           |

**Risk profile per row:** all 15 are protected by `get_current_user`
(valid JWT), so the worst-case attacker is a logged-in user (real
or a registration-spamming bot that completed signup). With a
JWT in hand, today's gaps let them:

- **Burn LLM credits** — `/career-assistant/messages` and
  `/interview-coach/sessions` call Claude on every request.
  A loop is real $ per minute.
- **Saturate the auto-apply worker** — `/applications/auto-apply`
  is a synchronous handler that calls into a Playwright browser
  session.
- **Trash the file storage** — three upload endpoints (CV, intro
  audio, documents) cap size but not count. A loop writes a few
  MB per second per user.
- **Fill `application_idempotency` / `application_events`** —
  PATCH `/applications/{id}` upserts cheap rows, but at machine
  speed it grows the audit log faster than the dashboard can
  paginate.

None of this is "remote code execution" severity, but every
single one is a real cost-and-availability problem that becomes
visible at 100k users.

## Why backend SlowAPI is **not** the right layer

The shipped fixes (`beta/join`, `auto-apply/trigger-sweep`) use
SlowAPI with `get_remote_address` because they're **public** or
**ops-only** — IP keying is reasonable there. For
authenticated candidate mutations, IP keying is the **wrong**
key:

1. **Corporate NAT.** Two real users behind a single corporate
   firewall share one IP. A SlowAPI `10/minute` would block the
   second user every time the first one finishes their workflow.
   We'd see false-positive 429s on the dashboard for whole
   companies.
2. **CGNAT on mobile.** Carrier-grade NAT on mobile networks
   (T-Mobile PL, Orange PL) puts hundreds of users on one IP.
   Worse than corporate.
3. **CDN bypass.** Even if we fix IP keying, the SlowAPI check
   runs in the FastAPI process. A burst still burns one worker
   per blocked request. At 1k req/s of abuse that's a real CPU
   cost we don't need to pay.

The right key is `user_id` (extracted from the JWT), and the
right layer is **edge** — Vercel Routing Middleware + a KV
store — so blocked requests never reach Railway.

## Proposed architecture

```
client ─► Vercel Edge (Routing Middleware) ─► Vercel KV ─► allow / 429
                          ▼
                 Railway API (FastAPI)
                 (SlowAPI defence-in-depth, by user_id)
```

Two stacked layers, both keyed by `user_id`:

### Layer 1 — Edge (primary)

Vercel Routing Middleware in `frontend/middleware.ts`
intercepts every `/api/v1/*` POST/PATCH/DELETE/PUT request that
carries a JWT. It:

1. Verifies the JWT with the same `SECRET_KEY` shared via
   `TWIN_API_BASE_URL` setup (already in Vercel env).
2. Pulls `user_id` from the decoded payload.
3. Atomically increments a KV counter at
   `rl:{user_id}:{bucket}:{minute}` using
   `INCR` (atomic on Vercel KV / Upstash Redis).
4. If the counter exceeds the bucket's quota for the user's
   plan tier → return `429 { "detail": "Rate limit exceeded", "retry_after_seconds": N }` directly from the edge.

Bucket assignment:

| Bucket                         | Endpoints                                                                                                  | Free / Pro budget (req/min) |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------- |
| `app.write`                    | applications POST / PATCH / DELETE; match-feedback                                                         | 30 / 60                     |
| `auto-apply.write`             | auto-apply consent / settings / trigger                                                                    | 5 / 15                      |
| `auto-apply.heavy`             | applications/auto-apply (real submit; minutes-long)                                                        | 1 / 3                       |
| `uploads`                      | candidates/me/cv, intro-audio, documents                                                                    | 5 / 20                      |
| `profile.write`                | candidates/me (PUT), profile updates                                                                       | 10 / 30                     |
| `llm`                          | career-assistant/messages, interview-coach/sessions                                                        | 10 / 30                     |
| `feedback`                     | feedback                                                                                                   | 20 / 50                     |

Free numbers are **2× the legitimate burst** that a real user
running the dashboard fast can produce; Pro is 3-5×. Both are
documented per-bucket so support can answer "why am I getting
429?" without reading code.

### Layer 2 — Backend SlowAPI (defence-in-depth)

A new `@limiter.limit(...)` decorator on the same endpoints,
keyed by `user_id` (custom `key_func` that reads
`request.state.user_id` set by `get_current_user`), with
**looser** budgets than the edge (`60/minute` everywhere).
Purpose: if the edge middleware misroutes a request or fails
open (Vercel KV unavailable), the backend still has a sanity
cap.

We **do not** want this layer to fire under normal traffic —
the budgets are deliberately loose so the edge is always the
binding constraint. If we see `app.api.* hit the SlowAPI 60/min`
in logs, that's the signal Layer 1 is failing.

```python
# backend/app/limiter.py — new helper
def get_authenticated_user_id(request: Request) -> str:
    """Use the JWT's sub (set by get_current_user) as the rate-limit key."""
    user_id = getattr(request.state, "user_id", None)
    return f"user:{user_id}" if user_id else get_remote_address(request)

user_limiter = Limiter(key_func=get_authenticated_user_id)
```

The decorator becomes
`@user_limiter.limit("60/minute")` on each of the 15 endpoints
above. SlowAPI lives in the FastAPI process, costs nothing
without abuse, and is reset on pod restart (acceptable for a
defence-in-depth layer).

### Why two layers and not one

- **Layer 1 alone** is exposed to a Vercel KV outage. Vercel KV
  is hosted on Upstash; a regional Upstash blip means our edge
  layer fails open and **every** authenticated request goes
  unmetered until KV recovers. That's a real risk during a
  cost-targeted attack.
- **Layer 2 alone** still burns a Railway worker per blocked
  request, defeating the cost story.

Stacked, the cost of an outage in either layer is bounded.

## Plan-tier integration

| Field on `User`            | Source                              |
| -------------------------- | ----------------------------------- |
| `plan_tier`                | already populated; `"free"` / `"pro"` (lines 85 of `backend/app/database/models.py`) |
| `subscription_status`      | already populated                   |
| Refresh frequency on edge  | every JWT refresh; `plan_tier` is encoded in the JWT claims |

Encoding `plan_tier` in the JWT (alongside `sub` / `exp`) lets
the edge layer skip a Railway round-trip per request. Tradeoff:
plan-tier changes (downgrade to free) don't take effect until
the JWT refreshes (≤15min). Acceptable — abuse from a downgraded
user is bounded by the looser Pro window for at most 15 minutes.

## Key schema (Vercel KV)

```
rl:user:<user_id>:<bucket>:<UTC-minute>      INTEGER (count)  TTL 90s
```

- `bucket` is one of the seven names above.
- `UTC-minute` is the start-of-minute timestamp truncated to
  seconds (e.g. `1735689600` for 2025-01-01T00:00:00Z).
- TTL 90s — generous enough to survive minute rollover quirks,
  short enough that we don't keep stale state.

For multi-minute windows (e.g. `daily.heavy`), the same scheme
with `<UTC-hour>` or `<UTC-day>` works; the design supports
both transparently because the bucket key encodes the window.

## Telemetry

Per blocked request the edge layer logs (no PII — only
`user_id`, `bucket`, `count`, `endpoint`) to the same place as
the existing Vercel routing logs. A Datadog monitor on
`429 rate-limit-blocked count` per minute flags an attacker
trying many endpoints; per-`user_id` aggregation flags a
compromised account.

## Test plan (when the code lands)

`frontend/__tests__/api/v1/rate-limit-middleware.test.ts`:

- 30 consecutive POSTs in `app.write` bucket → 30 × 200, 31st →
  429.
- Two users (`user_id=1`, `user_id=2`) interleaved → no
  interference (per-user isolation).
- Same IP, different JWTs → no shared bucket.
- Missing JWT → request flows through (handled by FastAPI's
  `OAuth2PasswordBearer`).
- KV unavailable (simulated) → middleware fails open with a
  warning log; backend Layer 2 catches the request.

`backend/tests/test_user_rate_limiter.py`:

- SlowAPI `user_limiter` keys by `request.state.user_id`, not
  by IP.
- Falls back to IP keying when `user_id` is absent (public
  endpoints).
- 60/minute budget triggers 429 at request 61.

## Rollout plan

1. **Land design** (this commit) — captures architecture so the
   next reviewer doesn't re-derive it.
2. **Land Layer 2** (SlowAPI `user_limiter`) — one-PR slice;
   adds the decorator on the 15 endpoints, no Vercel changes.
   This protects the worker pool *today* while we wait for KV
   provisioning. Risk: same as Layer 1's risk but smaller (only
   one auth-keyed SlowAPI is being introduced).
3. **Provision Vercel KV** — founder-provisioned, separate
   ticket. Once `KV_REST_API_URL` / `KV_REST_API_TOKEN` are in
   Vercel env, the edge layer can read/write.
4. **Land Layer 1** (`frontend/middleware.ts`) — uses the same
   bucket names so Layer 2 metrics stay comparable. PR also
   adds the per-bucket budget table to
   `docs/RATE_LIMITS.md` so support has a reference.
5. **Tune budgets** — after a week of preview traffic, dial
   each bucket up/down so the 95th percentile of legitimate
   minute-rates stays below the cap by 2x.

## Rollback plan

| Trigger                                  | Action                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Layer 1 false-positives spike            | Set `RATE_LIMIT_EDGE_MODE=observe` env var → middleware logs but never returns 429       |
| Layer 2 false-positives spike            | Comment out the `@user_limiter.limit` decorator on the offending endpoint; redeploy     |
| Vercel KV regional outage                | Layer 1 fails open by design; Layer 2 still active                                       |
| Legit ops user accidentally rate-limited | Add `user_id` to per-bucket bypass list in middleware (Vercel env var, hot-reload)       |

No data side-effects on any rollback path (rate-limit state is
purely in-memory KV / SlowAPI process state).

## Why this is design-only today

- **Vercel KV not provisioned.** The KV store needs founder
  permissions on the Vercel project (`Storage → Create
  Database`). HARD BANS today: no Railway / no prod env / no
  secrets — same spirit applies to Vercel state.
- **JWT `plan_tier` claim not present.** Adding it is a backend
  one-liner in `backend/app/core/security.create_access_token`,
  but it forces every existing client to re-login (the old
  tokens lack the claim). That deserves its own staged rollout,
  not a 3-hour-session sub-task.
- **Per-endpoint budget tuning needs real traffic.** The numbers
  above are educated guesses. We need a week of preview-alias
  traffic to size them well.

## Hard bans honoured (this run)

- No Vercel KV provisioning.
- No Vercel env var addition.
- No JWT format change.
- No Railway deploy.
- No DB migration.
- No new product feature.

## Files in this commit

- `docs/P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`
  (this doc) — only.

## Related

- `docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md` — the audit
  that surfaced these 15 endpoints.
- `docs/P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md` — the public
  signup limit (different layer / different key).
- `docs/P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md` — the
  ops-only sweep (also IP-keyed; same SlowAPI primitive).
- `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md` item 5 —
  the upstream plan that this design serves.
