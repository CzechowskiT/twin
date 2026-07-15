# R-019 production delete-account evidence — 2026-07-15

**Run ID:** `r019-077-closure-20260715T185858Z`  
**Risk:** R-019 / LB-005  
**Endpoint:** `POST /api/v1/candidates/me/delete-account`  
**Result:** **PASS** — delete smoke **PASS** on production after schema `050` → `077`  
**Platform Launch:** NO-GO · **Gate F:** PENDING

## Canonical definition

Self-service account deletion for candidates that anonymizes PII, deactivates sign-in, retains approved audit/privacy request rows, and rejects unauthenticated / cross-account misuse (see `docs/SECURITY_RISK_REGISTER_2026-05-27.md` R-019; implementation `backend/app/api/candidates.py`).

## Production schema closure (prerequisite)

| Check | Result |
| ----- | ------ |
| Fresh prod dump | `/tmp` custom `-Fc` `twin_prod_20260715T185352Z.dump` (ephemeral; not in git) |
| Dump SHA-256 | `4c37a7ff4b260a221386a61a387324a1ac241742dee416486cb1c96ccbe0bd94` |
| TOC | 431 lines · 43 TABLE DATA · alembic stamp in dump = `050_stripe_webhook_events` |
| Workflow | `prod-schema-upgrade-077` · GH run [#29442548647](https://github.com/CzechowskiT/twin/actions/runs/29442548647) · PR [#490](https://github.com/CzechowskiT/twin/pull/490) |
| Fingerprint | `autorack.proxy.rlwy.net:40861` / `railway` (Postgres service `DATABASE_PUBLIC_URL`) |
| Single upgrade | Exactly one `alembic upgrade head` (`050` → `077`) |
| Postflight | alembic `077_candidate_activity_timeline` · **69** tables · users 3 · candidates 3 · job_matches 1091 · applications 17 |

Rollback readiness: restore the fresh dump via `pg_restore --clean --if-exists` onto the same public fingerprint only; do **not** hand-edit `alembic_version`.

## What was executed (production API `b98499ae`)

Disposable account: new `*@example.com` with marker `r019-lb005-smoke-20260715T185858Z` in `referred_by_note`. **Never used** `demo@twin.career` / founder accounts.

| Step | Result | HTTP / note |
| ---- | ------ | ----------- |
| Disposable register | **PASS** | **201** |
| JWT via `POST /api/v1/auth/login/json` | **PASS** | **200** (token not logged) |
| `POST /api/v1/candidates/` create profile | **PASS** | **201** |
| `GET /api/v1/candidates/me` | **PASS** | **200** |
| Delete without token | **PASS** | **401** |
| Delete with wrong confirmation | **PASS** | **422** |
| Delete with token in query string only | **PASS** | **401** (Bearer required) |
| Delete with valid Bearer + `confirmation=DELETE` | **PASS** | **200** `deleted=true`, `privacy_request_id=1` |
| `GET /me` after delete | **PASS** | **401** |
| Login after delete | **PASS** | **401** Invalid credentials |
| Second delete with old Bearer | **PASS** | **401** |

## Post-delete data sanity

| Check | Result |
| ----- | ------ |
| User anonymized | email `deleted-<id>-…@anonymized.twin`, `is_active=false` |
| Active `@example.com` users | **0** |
| Orphan `r019-smoke-*` emails | **0** |
| Core row counts unchanged | users/candidates base still accounted; smoke user anonymized in-place |

## Branch / unit evidence (already merged)

| Check | Result |
| ----- | ------ |
| `POST /candidates/me/delete-account` implementation | Merged (Wave / prior PRs) |
| `backend/tests/test_candidate_account_deletion.py` | 6 tests (local suite) |
| Static R-019 guards | Present historically |

## Cleanup

| Resource | State |
| -------- | ----- |
| Disposable JWT / password | Ephemeral `/tmp` only — not committed |
| Dump file | Ephemeral `/tmp` only — not committed |
| Production Alembic | **077_candidate_activity_timeline** |
| twin service `DATABASE_PUBLIC_URL` | Corrected to Postgres public proxy fingerprint (was mis-set to `demo@twin.career`) |

## LB-005 status

**CLOSED** — production disposable-account E2E delete smoke **PASS** after forward-migrate to head **077**.
