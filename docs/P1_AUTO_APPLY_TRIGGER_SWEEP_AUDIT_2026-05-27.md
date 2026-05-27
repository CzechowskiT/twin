# P1 — `POST /api/v1/auto-apply/trigger-sweep` Audit + Fix — 2026-05-27

**Scope:** TASK 2 of the 3-hour security session on
`cursor/phase1-monorepo-scaffold`. Audit one specific endpoint
(`POST /api/v1/auto-apply/trigger-sweep`), apply the minimal safe
fix, freeze the contract with tests.

**Outcome:** **fix shipped** (not docs-only) — closed a real
privilege-escalation surface that was flagged but left open by the
earlier `P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md` session.

## The hole

```python
# backend/app/api/auto_apply_settings.py (before)
@router.post("/trigger-sweep")
def trigger_full_sweep(
    user: User = Depends(get_current_user),
) -> dict:
    """Enqueue full nightly sweep (ops-style; requires active consent users)."""
    settings = get_settings()
    if settings.celery_task_always_eager:
        return nightly_auto_apply_sweep(dry_run=False)
    async_result = nightly_auto_apply_sweep.delay(dry_run=False)
    return {"task_id": async_result.id, "status": "queued"}
```

What this lets any authenticated user do:

1. **Run the platform-wide nightly sweep on demand.** The sweep
   processes **every** user with active auto-apply consent,
   running `process_user_nightly_auto_apply` for each. A single
   call can fire dozens-to-hundreds of real applications across
   third-party job boards.
2. **DoS the auto-apply worker pool.** Even with the Celery beat
   limit of one nightly run, a malicious caller can enqueue many
   `.delay(dry_run=False)` tasks in a tight loop until the
   worker queue is saturated.
3. **Bypass the per-user daily limit.** `process_user_nightly_auto_apply`
   honours each user's `daily_limit`, but **the sweep loops over
   all users**. Re-triggering the sweep multiple times in a day
   re-runs every user up to their per-user cap, multiplying
   total submitted applications.
4. **Burn third-party submit quotas.** Pracuj.pl / RocketJobs
   reverse-proxy budgets are not infinite. A handful of
   `/trigger-sweep` calls per hour can put us in rate-limit
   territory and degrade legitimate users.
5. **Run before consent is verified.** The endpoint took no
   `processing_consent` check on the *caller*; it relied on each
   sweep iteration to short-circuit users without consent. The
   *call itself* did not require ops privileges.

Severity: **privilege escalation + DoS**, low complexity to abuse
(needs only a valid candidate JWT, which any signed-up beta
tester has). Flagged in
`docs/P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md` row 14 as
`⚠️ flagged`.

## The fix shipped today

`backend/app/api/auto_apply_settings.py`:

```python
@router.post("/trigger-sweep")
@limiter.limit("3/minute")
def trigger_full_sweep(
    request: Request,
    user: User = Depends(get_current_user),
) -> dict:
    """Enqueue full nightly sweep — ops only (allowlist via SCRAPE_OPS_*)."""
    settings = get_settings()
    if not user_has_scrape_ops(user, settings):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ops only — your account is not on the auto-apply trigger allowlist.",
        )
    if settings.celery_task_always_eager:
        return nightly_auto_apply_sweep(dry_run=False)
    async_result = nightly_auto_apply_sweep.delay(dry_run=False)
    return {"task_id": async_result.id, "status": "queued"}
```

Two changes on the contract:

1. **Admin gate.** `user_has_scrape_ops` checks
   `SCRAPE_OPS_USER_IDS` / `SCRAPE_OPS_EMAILS` from `Settings` —
   the **existing** allowlist we already use to elevate scrape
   triggers. Reusing this primitive means:
   - **No new admin mechanism.** We already have three:
     `BETA_ADMIN_TOKEN` (bearer for `/beta/admin/*`),
     `OPS_ADMIN_TOKEN` (bearer for `/admin/*`), and the
     scrape-ops allowlist (JWT + user-id/email). Adding a fourth
     just for one endpoint would multiply audit surface.
   - **Drop-in for prod.** Founder is already on
     `SCRAPE_OPS_EMAILS` in `.env.railway`; nothing to provision.
2. **Per-IP rate limit `3/minute`.** Defence-in-depth: even if a
   founder laptop is compromised and the JWT leaks, an attacker
   can't fire more than three sweeps a minute. Sweep is a
   minutes-long Celery job, so 3/minute is more than enough for
   the real ops use case (typically 0–1 manual triggers per
   release window).

`request: Request` is now required because SlowAPI extracts the
client IP via `get_remote_address(request)`.

## Tests added (commit covers)

`backend/tests/test_auto_apply_trigger_sweep_admin_gate.py`:

- `test_trigger_sweep_rejects_unauthenticated` — no JWT → 401
  (FastAPI's `OAuth2PasswordBearer`).
- `test_trigger_sweep_rejects_non_ops_user` — valid JWT + empty
  allowlist → 403, **and** the Celery task is **not** invoked
  (mocked sweep verifies `assert_not_called`). This is the
  privilege-escalation regression test.
- `test_trigger_sweep_accepts_ops_user_via_email_allowlist` —
  valid JWT + email on `SCRAPE_OPS_EMAILS` →  200, sweep is
  invoked once with `dry_run=False`.
- `test_trigger_sweep_is_rate_limited` — even an ops user gets
  `200, 200, 200, 429` in burst (4 calls in <1s).

Run:

```
backend $ python -m pytest tests/test_auto_apply_trigger_sweep_admin_gate.py -v
...
tests/test_auto_apply_trigger_sweep_admin_gate.py::test_trigger_sweep_rejects_unauthenticated PASSED
tests/test_auto_apply_trigger_sweep_admin_gate.py::test_trigger_sweep_rejects_non_ops_user PASSED
tests/test_auto_apply_trigger_sweep_admin_gate.py::test_trigger_sweep_accepts_ops_user_via_email_allowlist PASSED
tests/test_auto_apply_trigger_sweep_admin_gate.py::test_trigger_sweep_is_rate_limited PASSED
4 passed
```

Regression check: existing `test_auto_apply_settings_api.py`
(`/settings`, `/consent`, `/trigger`, `/last-sweep`) still
passes — none of those endpoints changed, and the new
`@limiter.limit` decorator is only on `/trigger-sweep`.

## Why this is a safe deploy

- **No callers in `frontend/`.** `rg "trigger-sweep|triggerSweep"`
  matches only docs and one ops shell script
  (`scripts/verify-nightly-auto-apply.sh`) — the script
  references the endpoint in a comment but doesn't actually
  invoke it.
- **Backward-compatible for ops staff.** Founder email is
  already on `SCRAPE_OPS_EMAILS` in `.env.railway`; the post-fix
  endpoint just keeps working from `scripts/`.
- **No DB migration.** No schema change; we reuse the existing
  settings env vars.
- **No new env var required.** Falls back to the same `Settings`
  state we already deploy.

## Out of scope (intentional)

- **No web-UI surface for `/trigger-sweep`.** The endpoint is
  intentionally ops-only; the candidate dashboard already has
  `/api/v1/auto-apply/trigger` (single-user, gated by per-user
  consent) for the "run mine now" CTA.
- **No Celery-side dedupe.** A future hardening — collapse
  duplicate `nightly_auto_apply_sweep` enqueues at the broker
  level — is a separate slice tracked under the broader
  "idempotency for ops tasks" backlog.
- **No `dry_run=True` ergonomics.** The endpoint still hard-codes
  `dry_run=False`. Exposing `?dry_run=1` would be useful but
  isn't a security concern, so deferred.

## Verdict

P1 security gap **closed in code** by the commit attached to
this doc — not docs-only. Audit trail and rationale captured
here so the next reviewer doesn't second-guess the allowlist
choice over a bearer-token or new admin column on `users`.
