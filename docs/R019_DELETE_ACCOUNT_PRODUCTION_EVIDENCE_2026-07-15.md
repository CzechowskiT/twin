# R-019 production delete-account evidence — 2026-07-15

**Run ID:** `o7-r019-20260715T181851Z`  
**Risk:** R-019 / LB-005  
**Endpoint:** `POST /api/v1/candidates/me/delete-account`  
**Result:** **PARTIAL / BLOCKED** — disposable signup succeeded; delete smoke **not** completed on production due to live schema lag  
**Platform Launch:** NO-GO · **Gate F:** PENDING

## Canonical definition

Self-service account deletion for candidates that anonymizes PII, deactivates sign-in, retains approved audit/privacy request rows, and rejects unauthenticated / cross-account misuse (see `docs/SECURITY_RISK_REGISTER_2026-05-27.md` R-019; implementation `backend/app/api/candidates.py`).

## What was executed (production API `b98499ae`)

| Step | Result | HTTP / note |
| ---- | ------ | ----------- |
| Disposable register (`*@example.com`, marker in `referred_by_note`) | **PASS** | 201 + JWT via canonical register |
| `POST /api/v1/candidates/` create profile | **FAIL** | **503** `Database schema mismatch…` |
| `GET /api/v1/candidates/me` | **FAIL** | 503 schema mismatch |
| Delete without token | **PASS** | **401** |
| Delete with wrong confirmation | **PASS** | **422** |
| Delete with token in query string only | **PASS** | **401** (Bearer required) |
| Delete with valid Bearer + `confirmation=DELETE` | **FAIL** | **503** schema mismatch |
| Login after attempted delete | N/A | Account still active (delete never applied) |
| Forbidden accounts | **PASS** | Never used `demo@twin.career` / founder accounts |

## Why delete cannot finish on current production volume

Production Postgres (public fingerprint `autorack.proxy.rlwy.net:40861`) after O7 recovery:

- `alembic_version` = `050_stripe_webhook_events`
- **43** public tables

Missing tables required by current models / delete path include (non-exhaustive):

- `candidate_privacy_requests`
- `candidate_trust_audit_events`
- `candidate_consent_receipts`
- …plus other 051–077 objects

SQLAlchemy raises `ProgrammingError` → API maps to HTTP **503** schema mismatch (`backend/app/main.py`).

Staging clone proved `alembic upgrade head` **050 → 077** succeeds in **46 s** (see `docs/O7_RESTORE_DRILL_EVIDENCE_2026-07-15.md`). Production forward-migrate was **not** executed in this batch (hard ban on unapproved production migrations).

## Branch / unit evidence (already merged)

| Check | Result |
| ----- | ------ |
| `POST /candidates/me/delete-account` implementation | Merged (Wave / prior PRs) |
| `backend/tests/test_candidate_account_deletion.py` | 6 tests (local suite) |
| Static R-019 guards | Present historically |

## Cleanup

| Resource | State |
| -------- | ----- |
| Disposable `@example.com` users created this run | **Deleted** via SQL (0 remaining) |
| JWT / passwords | Not logged, not committed |
| Production Alembic | Unchanged at 050 |

## LB-005 status

**BLOCKED** — production disposable-account E2E cannot PASS until production Postgres is forward-migrated to head **077** (or the live volume is proven to already be 077 and the public URL fingerprinted here is remapped).

**Single required access change (not a “run this test” ask):** authorize production `alembic upgrade head` on the Postgres volume backing API `b98499ae` (same volume as public proxy `autorack…:40861`), or grant a protected CI workflow already holding DB credentials to perform that one upgrade under `production` environment protection.
