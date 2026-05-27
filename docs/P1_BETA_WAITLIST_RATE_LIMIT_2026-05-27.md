# P1 — Beta Waitlist Rate Limit (verification) — 2026-05-27

**Scope:** verify the per-IP rate limit on the **public** beta waitlist
signup endpoint and freeze the contract with a test that fails closed
if anyone removes it.

**Status:** **shipped earlier today** in commit `45e5d6a`
(`fix(security): add rate limit to beta waitlist signup`). This doc
records the verification pass that closes the security session's
Task 1: re-running the contract test, citing the canonical files, and
explicitly calling out why this is the only mutation in the
candidate-side surface that needs an **IP-keyed** backend limit (the
rest are JWT-gated and will move to an Edge layer keyed by `user_id`,
not IP).

## Why this matters

`POST /api/v1/beta/join` is the **only** candidate-side mutation in
the public API surface that takes **no JWT and no CAPTCHA** — anyone
on the open internet can hit it. Without a rate limit:

- a single IP can pollute the `beta_waitlist` table with thousands
  of throwaway emails, displacing real users below the `BETA_WAITLIST_CAP`
  cap and skewing leaderboard metrics,
- the transactional email vendor quota (`send_beta_waitlist_welcome_email`)
  is burned on every accepted signup,
- the `_match_preview_rows` path runs a DB-bounded scoring loop per
  request — cheap individually, expensive in bursts.

Reuses the same SlowAPI primitive that already guards `/auth/login`
(`5/minute` per-IP). Same budget on purpose so a future Edge layer
can mirror it without surprise.

## Change shipped (commit `45e5d6a`)

- `backend/app/api/beta_waitlist.py`:
  - imported the shared `limiter` (`app.limiter`)
  - added `@limiter.limit("5/minute")` to `beta_join` (line 231)
  - added `request: Request` as the first arg (required by SlowAPI to
    extract the client IP via `get_remote_address`)
- `backend/tests/test_beta_waitlist_rate_limit.py`: contract test that
  drives `/api/v1/beta/join` six times and asserts `200, 200, 200, 200,
  200, 429`. Uses an in-memory SQLite session and resets the limiter
  before/after the test so it's hermetic.

The limiter is the **same `Limiter(key_func=get_remote_address)` singleton**
already shared with `app/api/auth.py` (`app/limiter.py`), so this slice
adds zero new global state and zero new dependencies.

## Verification done in this session

Re-ran the contract test on `cursor/phase1-monorepo-scaffold`:

```bash
$ source backend/.venv/bin/activate
$ cd backend && python -m pytest tests/test_beta_waitlist_rate_limit.py -x -v
...
tests/test_beta_waitlist_rate_limit.py::test_beta_join_rate_limit_returns_429_after_five PASSED
======================== 1 passed, 14 warnings in 1.62s ========================
```

Result: **PASS**. First five POSTs return `200`, the sixth returns
`429` with a SlowAPI `detail` body containing the word `rate` /
`limit` / `exceeded`. Contract is held.

## Out of scope (intentional)

- **No CAPTCHA / proof-of-work.** Not needed at current sign-up
  volume; a `5/minute` per-IP cap is the right first defence.
- **No CDN/Edge integration.** That's TASK 5 of this session
  (design only — no Vercel KV provisioning today).
- **No `403` for known abusive IPs / `ipset` deny list.** Out of scope
  for an MVP signup endpoint; would belong at the edge, not in
  application code.
- **No new prod config flags.** SlowAPI is already wired in
  `app/main.create_app`; nothing else to flip.

## Risk of false positives

- Key is per-IP via `get_remote_address`. Two users behind a single
  corporate NAT signing up within a minute would block the second.
  Acceptable for a beta waitlist: the second user can retry after
  60s, no data is lost, and the signup form's existing copy already
  tolerates a transient `429` (the frontend treats anything non-200
  as "try again in a moment").
- Same-email duplicate signups already short-circuit to a
  `BetaJoinOut` with the original referral code (lines 247–257 of
  `backend/app/api/beta_waitlist.py`), so the limit is purely about
  **new rows + new mail sends**, not about denying the existing user
  their dashboard link.

## Next steps (not in this commit)

- **TASK 5** of today's session covers the *authenticated* mutations
  (`/applications/*`, `/auto-apply/*`, `/candidates/me/*`) — design
  only, no Vercel KV provisioning.
- Once the Edge KV layer lands, this SlowAPI decorator stays in
  place as defence-in-depth (the Edge layer is per-IP too, but
  cheaper to bypass than a Python decorator wrapped around the
  handler).
