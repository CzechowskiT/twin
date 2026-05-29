# P1 Stripe Webhook Signature Audit — 2026-05-27

TASK 2 of the **security / ops hardening** session on
`cursor/phase1-monorepo-scaffold` (morning, 2026-05-27).
Read-only audit of every Stripe-ingesting code path on the
backend, plus a new minimal contract test
(`backend/tests/test_stripe_webhook_signature.py`) that freezes
today's behaviour so a refactor cannot silently weaken it.

## TL;DR

- Single production webhook endpoint:
  **`POST /api/v1/billing/webhook`** in
  `backend/app/api/billing.py`. Mounted via `api_router`
  with prefix `/billing`, then `/api/v1` from
  `backend/app/main.py`.
- Signature verification: **enforced via
  `stripe.Webhook.construct_event(payload, sig, secret)`** —
  the canonical SDK helper that does both HMAC-SHA256 check
  and the default 5-minute timestamp tolerance window in one
  call. No `try/except` "fallback" that accepts unsigned
  payloads. Both `ValueError` (invalid JSON) and
  `stripe.SignatureVerificationError` map to HTTP 400.
- Raw body handling: **correct**. `payload = await
  request.body()` is read **before** any FastAPI body
  parsing, and the bytes are passed straight to
  `construct_event` — no JSON deserialization, no body
  mutation between the wire and the HMAC check.
- Secret source: **env-only**. `settings.stripe_webhook_secret`
  is loaded by `pydantic-settings` from environment
  variables; no hard-coded fallback. Production startup
  rejects boot if Stripe is "billing-enabled" but
  `STRIPE_WEBHOOK_SECRET` is empty
  (`backend/app/core/startup_checks.py` — covered by
  `tests/test_startup_validation.py::test_startup_requires_stripe_webhook_when_billing_enabled`).
- Replay protection / idempotency by `event.id`:
  **NOT implemented today**. Each event is dispatched to its
  handler regardless of whether we've seen the same `event.id`
  before. **This is the only gap.** Risk is low while we
  remain under Stripe's own at-least-once delivery and our
  handlers happen to be idempotent at the DB level
  (`process_subscription_updated` does upserts keyed by
  `subscription.id`, not transient counters). Promoted to a
  P2 follow-up because the safe fix needs a small dedup
  table + Alembic migration — explicitly out of scope for
  this session (`docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md`,
  "Stripe replay / dedup").
- Logging: **safe**. `logger.exception(...)` runs only on
  handler failure and logs the event **type**, never the
  body, never the signature header, never the webhook
  secret. The 500 sanitizer in `app/main.py`
  (`http_exception_sanitize_500`) replaces handler-leaked
  detail with `"Internal server error"` to the client.
- Test coverage: **new**. 5 contract tests added:
  no-header reject, bad signature reject, wrong-secret
  reject, valid signature for unhandled event accepted with
  `{"received":"true"}`, and "not configured → 503". They
  all pass against current code with no source change.

Verdict: **signature handling is in good shape; one P2
follow-up (event-id dedup) tracked.** No production code
changed in this commit. Only `backend/tests/` + docs are
new.

## Endpoints inspected

| Path                                       | File                                | Signature gate                                       | Secret source                       | Audited |
| ------------------------------------------ | ----------------------------------- | ---------------------------------------------------- | ----------------------------------- | ------- |
| `POST /api/v1/billing/webhook`             | `app/api/billing.py`                | `stripe.Webhook.construct_event` (canonical)         | `settings.stripe_webhook_secret`    | ✅      |
| `POST /api/v1/integrations/ats/greenhouse` | `app/api/integrations_ats.py`       | HMAC-SHA256 over raw body (own helper)               | `settings.greenhouse_webhook_secret`| ✅      |
| `POST /api/v1/integrations/ats/lever`      | `app/api/integrations_ats.py`       | HMAC-SHA256 over raw body (own helper)               | `settings.lever_webhook_secret`     | ✅      |
| `POST /api/v1/integrations/ats/ashby`      | `app/api/integrations_ats.py`       | HMAC-SHA256 over raw body (own helper, `sha256=` prefix) | `settings.ashby_webhook_secret`     | ✅      |
| `outbound` `employer_webhook.py`           | `app/services/employer_webhook.py`  | n/a (we sign, recipient verifies)                    | `settings.employer_webhook_secret`  | ✅      |

Scope of this audit is **Stripe**; ATS hooks are listed for
context (they share the same "HMAC over raw body" pattern,
production rejects unsigned traffic) but their own audit
lives in `docs/ATS_WEBHOOKS.md`.

## Signature handling — line-by-line

Reference: `backend/app/api/billing.py:223-264`.

```python
@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    stripe_signature: Annotated[str | None, Header(alias="stripe-signature")] = None,
) -> dict[str, str]:
    if not settings.stripe_webhook_secret or not settings.stripe_secret_key:
        raise HTTPException(503, detail="Webhook not configured.")
    payload = await request.body()
    if not stripe_signature:
        raise HTTPException(400, detail="Missing stripe-signature.")
    stripe_svc.configure_stripe(settings)
    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.stripe_webhook_secret,
        )
    except ValueError as e:
        raise HTTPException(400, detail="Invalid payload.") from e
    except stripe.SignatureVerificationError as e:
        raise HTTPException(400, detail="Invalid signature.") from e
    ...
```

Findings:

1. **No fallback path.** There is exactly one
   `construct_event` call. No `if not sig_header: parse_json(payload)`
   branch that would let an unsigned payload through. **OK.**
2. **Order of checks.** Configured-secret check runs
   *before* the body is read. Missing-header check runs
   *before* `construct_event`. Both fail fast with 400/503
   and no handler dispatch. **OK.**
3. **Raw body, no mutation.** `await request.body()` returns
   bytes; those bytes go straight into `construct_event`.
   We do **not** parse JSON ourselves before the signature
   check — that would let a body re-serializer (e.g. a
   middleware) silently break HMAC. **OK.**
4. **Default tolerance.** `stripe.Webhook.construct_event`
   uses the SDK default `tolerance=300` seconds. That
   is the documented Stripe value and matches
   `webhook-cli` behaviour. **OK.**
5. **Exception fan-out.** Both `ValueError` (malformed JSON)
   and `stripe.SignatureVerificationError` (bad HMAC or
   stale timestamp) bubble up as **HTTP 400**, no body
   beyond the static `detail` string. We do **not** leak the
   underlying exception message to the client. **OK.**
6. **Handler failure isolation.** The `except Exception:`
   around the dispatch block re-raises as HTTP 500 and logs
   `etype` only (not the body, not the signature). The 500
   sanitizer in `main.py` replaces the detail with
   `"Internal server error"`. **OK.**

## Idempotency / replay — the one gap

`stripe.Webhook.construct_event` does **not** prevent the
same event being delivered twice (Stripe explicitly
documents at-least-once delivery and asks the integrator to
key on `event.id`).

Today's code path:

```python
event_d = _stripe_object_to_dict(event)
etype = event_d["type"]
obj_d = _stripe_object_to_dict(event_d["data"]["object"])

if etype == "checkout.session.completed":
    stripe_svc.process_checkout_completed(db, obj_d, settings)
elif etype == "customer.subscription.updated":
    ...
```

The `event_d["id"]` (the `evt_*` ID) is **read but not
recorded**. If Stripe redelivers the same `evt_*` (e.g.
because our handler took >20s and they retry), we will run
the handler again.

In practice each handler is mostly idempotent because:

- `process_checkout_completed` upserts the `User.stripe_*`
  columns by `customer.id` — running it twice does not double-charge.
- `process_subscription_updated` writes
  `User.stripe_subscription_status` by `customer.id` — same.
- `process_invoice_payment_succeeded` only walks the
  customer → user mapping; no monetary side effect.

But "mostly idempotent" is not "idempotent". Concrete
failure mode: if a future handler increments a counter,
sends a transactional email, or writes a one-shot row
without a uniqueness constraint, redelivery becomes a bug.

**Decision:** ship a small `StripeWebhookEvent(id, type,
received_at)` table + a `try_record_event(id) → bool`
helper, and short-circuit duplicates with 200. **Out of
scope for this docs-only session** because it needs an
Alembic migration; tracked in
`docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md` under
"Stripe replay / dedup".

## Secret hygiene

- `STRIPE_WEBHOOK_SECRET` lives **only** in Railway env
  (`.env.railway` documents this for local mirroring;
  `.env.example` ships an empty placeholder).
- `backend/app/config.py` declares `stripe_webhook_secret:
  str = ""` — empty default, no hard-coded value.
- `backend/app/core/startup_checks.py` aborts boot in
  `environment=production` if `stripe_secret_key` is set
  but `stripe_webhook_secret` is empty (covered by
  `tests/test_startup_validation.py::test_startup_requires_stripe_webhook_when_billing_enabled`).
- The webhook handler **does not log** the secret, the
  signature header, or the payload — only `etype` (a
  Stripe-documented event-type string).
- No secret was ever printed by an agent in this run
  (this doc, the test file, and the commit message contain
  zero secret material).

## New test file

`backend/tests/test_stripe_webhook_signature.py` — 5 tests:

1. `test_webhook_rejects_request_without_signature_header`
   — POST without `stripe-signature` → 400.
2. `test_webhook_rejects_invalid_signature` — POST with a
   syntactically wrong header → 400.
3. `test_webhook_rejects_signature_signed_with_wrong_secret`
   — POST with a well-formed `t=...,v1=...` signed with a
   different secret → 400. (Catches the "what if someone
   leaks our format" class of bug.)
4. `test_webhook_accepts_valid_signature_for_unhandled_event`
   — POST with a correct signature for a `customer.created`
   event → 200, `{"received":"true"}`. Uses an unhandled
   type so the test does not touch DB state.
5. `test_webhook_refuses_traffic_when_unconfigured` — when
   `stripe_webhook_secret` is empty, the endpoint refuses
   *all* traffic (503), including correctly-signed traffic.
   The "fail closed" property is part of the contract.

All 5 tests pass against current code with no production-
code change.

```text
$ cd backend && .venv/bin/python -m pytest \
    tests/test_stripe_webhook_signature.py -q
.....                                                                 [100%]
5 passed, 8 warnings in 1.65s
```

Also re-ran nearby tests to be sure nothing else regressed:

```text
$ cd backend && .venv/bin/python -m pytest \
    tests/test_billing_plans.py \
    tests/test_startup_validation.py \
    tests/test_app_import_boot.py -q
........                                                              [100%]
8 passed, 8 warnings in 1.21s
```

## Open questions / follow-ups

- **P2:** Add `stripe_webhook_event` dedup table + Alembic
  migration. Drop a `record_event_or_409(event.id)` call
  at the top of the dispatch block; short-circuit
  duplicates with HTTP 200 (Stripe treats 2xx as "delivered"
  and stops retrying).
- **P2:** Once dedup ships, add a `test_replay_is_no_op`
  case that POSTs the same signed event twice and asserts
  the second response is 200 with no DB write.
- **P3:** Consider rotating `STRIPE_WEBHOOK_SECRET`
  alongside the next regular secret rotation; document the
  blue/green rotation in `docs/STRIPE_RAILWAY_SETUP.md`
  (today the rotation is a single env-var swap which races
  in-flight requests).

## Hard bans honoured (this run)

- No Railway change / redeploy.
- No API redeploy.
- No DB migration.
- No prod env change.
- No secret / JWT in this doc or test file (test uses
  placeholder strings prefixed with `whsec_test_` /
  `sk_test_` and a comment marker; nothing on the wire).
- No `--no-verify`, no force-push.
- No real Stripe API call from the test (tests run against
  a `TestClient` and a SQLite-overridden `get_db`; the
  webhook handler never reaches `stripe.checkout.Session.create`
  for these event types).

## Files changed

- `backend/tests/test_stripe_webhook_signature.py` (new).
- `docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md` (this doc).

## Related

- `docs/STRIPE.md` — product-level Stripe behaviour.
- `docs/STRIPE_RAILWAY_SETUP.md` — env wiring on Railway.
- `docs/STRIPE_E2E.md` — end-to-end test plan.
- `docs/STRIPE_FOUNDER_CHECKLIST.md` — manual founder
  checklist for Stripe go-live.
- `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
  item 6 — the parent task; this commit is its first
  delivery.
- `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md` — backlog
  doc; "Stripe replay / dedup" is the P2 follow-up tracked
  above.
