# P2 Stripe webhook idempotency — helpers shipped — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 4 of the long autonomous security session.
Lands the **service-module half** of the
`docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md` design so the
follow-up commit that wires it into the webhook can be a clean
6-line diff once the Alembic migration freeze lifts. **No
migration in this commit. No webhook behaviour change in this
commit.**

## What ships

1. `app/database/models.py` — adds `StripeWebhookEvent` ORM
   model only. Registered with `Base` so test fixtures that call
   `Base.metadata.create_all(engine)` create the table for unit
   tests. Production (Alembic-managed) **does not yet have this
   table**.
2. `app/services/stripe_events.py` — 5 helpers
   (`already_processed`, `record_received`, `mark_success`,
   `mark_failed`, `mark_ignored`) with a production-safe
   fallback: if the table doesn't exist (Alembic migration not
   yet applied), every helper degrades to a no-op (`None` /
   `False`) instead of raising. The wire-up commit is therefore
   safe to land before the migration without breaking the
   webhook in prod.
3. `backend/tests/test_stripe_event_dedup_helpers.py` — 7 unit
   tests covering insert / replay / status transitions / long
   error truncation / table-missing fallback / ignored
   short-circuit.
4. This doc.

## What does **not** ship in this commit

- The Alembic migration file at
  `backend/alembic/versions/050_stripe_webhook_events.py` (see the
  design doc for the sketch — needs a separate, single-purpose
  commit at the right deployment window).
- The 6-line patch to `app/api/billing.py` that imports the
  helpers and runs the insert-then-process pattern.
- A persistent dedup of in-flight events that started before
  the migration shipped (Stripe will retry these on its own
  retry policy; no special handling required).

## The production-safety guarantee

Reviewers might worry: "the model is registered with `Base`,
but the table isn't migrated yet — won't this 500 something in
prod?" No, because:

1. **No production code path imports
   `app.services.stripe_events` in this commit.** Confirmed by
   grep at commit time: only the new unit-test file references
   it. `app/api/billing.py` is unchanged.
2. **Every helper is `OperationalError` / `ProgrammingError`
   tolerant.** Both SQLite ("no such table") and PostgreSQL
   ("does not exist" / "undefined table") error messages are
   matched by `_ledger_unavailable`, and the helper returns
   `None` / `False` instead of re-raising. So even if a future
   refactor accidentally imports the helper before the
   migration ships, the webhook keeps returning 200 to Stripe.
3. **Test fixture covers the missing-table state explicitly.**
   `test_helpers_noop_when_ledger_table_missing` drops the
   table mid-session and asserts every helper returns the
   no-op sentinel.

## Test results

```
$ pytest tests/test_stripe_event_dedup_helpers.py tests/test_stripe_webhook_signature.py -q
12 passed in 2.00s
```

- 7 new tests (the dedup helpers).
- 5 retained tests (the existing webhook signature contract;
  this commit must not regress them — confirmed unchanged).

## Why this split (helpers first, migration second)?

- **Decouples** SQL DDL from the application code that uses it.
  The Alembic migration can be reviewed, merged, and deployed
  on its own schedule (one canonical pattern at TWIN: migrations
  ship one slice at a time, code that uses them follows).
- **Lets the helpers be unit-tested today** so the wire-up
  commit doesn't bundle 7 new tests on top of the actual
  behaviour change.
- **Reduces blast radius** of the eventual wire-up. By the
  time `billing.py` calls the helpers, the helpers and the
  table will already have been live in pre-prod for a week.

## Files added / modified

- `backend/app/database/models.py` — `+25` lines (new
  `StripeWebhookEvent` model).
- `backend/app/services/stripe_events.py` — new (152 LOC).
- `backend/tests/test_stripe_event_dedup_helpers.py` — new
  (7 tests).
- `docs/P2_STRIPE_EVENT_DEDUP_HELPERS_2026-05-27.md` (this
  doc).

## Hard bans honoured

- ✅ No Alembic migration.
- ✅ No DB schema change in production (the model is
  registered but unused; Alembic is the only DDL channel for
  prod).
- ✅ No Railway deploy / redeploy.
- ✅ No prod env change.
- ✅ No `.env` change.
- ✅ No secret in code, tests, or docs.
- ✅ No UX / copy change.
- ✅ No webhook behaviour change (the existing 5-test contract
  in `test_stripe_webhook_signature.py` is unchanged and still
  passes).
- ✅ No CSP enforce flip.

## Related

- `docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md` — the
  design that this commit half-implements.
- `docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md` — the audit
  that surfaced the dedup gap.
- `docs/STRIPE.md` — current billing surface description.
