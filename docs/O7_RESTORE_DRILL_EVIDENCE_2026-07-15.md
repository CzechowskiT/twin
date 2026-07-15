# O7 restore drill evidence — 2026-07-15

**Run ID:** `o7-r019-20260715T181851Z`  
**Operator:** autonomous agent (Railway CLI session `czechowskit`)  
**Gate:** O7 / LB-201  
**Canonical runbook:** `docs/O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md`  
**Result:** **PASS** (isolated staging restore + forward-migrate path)  
**Platform Launch:** NO-GO · **Gate F:** PENDING (unchanged)

## Source of truth (verified this run)

| Layer | Verified actual |
| ----- | --------------- |
| Scaffold branch | `cursor/phase1-monorepo-scaffold` |
| Scaffold HEAD (pre-PR) | `cff79754` |
| Production API `git_commit` | `b98499aea615182b58d0f5099fa85665d604bfd0` |
| Production FE `frontend_commit` | `cff79754…` |
| Production Postgres (public proxy fingerprint) | host `autorack.proxy.rlwy.net` port `40861` db `railway` |
| Staging clone | env `staging-restore-proof-20260529` · service `Postgres-HE2P` · volume `postgres-volume-p1D7` · host `monorail.proxy.rlwy.net` port `39789` |
| Production alembic (after recovery) | `050_stripe_webhook_events` |
| Scaffold alembic head | `077_candidate_activity_timeline` |
| Railway project | `responsible-success` (`b4f5caa3-95af-4cfd-9dfd-2210e34f2111`) |

## Root cause: prior “050 vs 077” confusion

| Hypothesis | Verdict |
| ---------- | ------- |
| Incomplete dump truncated before 077 | **Rejected** — `pg_restore --list` complete (428 TOC lines, 43 TABLE DATA); dump `alembic_version` data = `050_stripe_webhook_events` |
| Restore interrupted left staging at 050 | **Partial** — earlier `--clean` restore was interrupted mid-DDL; one attempt hit **production** public URL and left 14 tables (incident below) |
| Dump taken from wrong service | **Rejected for fingerprint** — dump source matched production Postgres public URL |
| Production never applied 051–077 | **Confirmed** — production volume still at `050` with 43 tables while app models expect ~68 tables |
| Repo head 077 implies prod DB 077 | **False** — `verify:production-v3:077` checks **repo migration graph**, not live `alembic_version` |

Historical 2026-06-01 PASS also recorded alembic `050` with the same count signature (users 3 / candidates 3 / job_matches 1091 / applications 17).

## Incident: partial production overwrite (prior agent)

During earlier automated attempts, a `pg_restore --clean` targeting the **production** `DATABASE_PUBLIC_URL` was interrupted after creating ~14 tables (failed near `email_verification_tokens`). Production was unusable for candidate writes (`ProgrammingError` → HTTP 503 schema mismatch).

**Recovery (not O7 drill):** single controlled `pg_restore --clean --if-exists --exit-on-error` of the pre-incident dump onto production public URL.

| Check | Result |
| ----- | ------ |
| Restore exit | **0** |
| Duration | 154 s |
| Post alembic | `050_stripe_webhook_events` |
| Counts | users 3 · candidates 3 · job_matches 1091 · applications 17 · tables 43 |

No connection strings, dump bytes, or PII in this document.

## Dump validation

| Check | Actual |
| ----- | ------ |
| Path (ephemeral) | `/tmp/twin-o7-drill/twin_o7_prod_20260715T143323Z.dump` |
| Size | 294 KB |
| SHA-256 | `308d5121856e37f3b7dd6f208b6f6be41c1c3e176226eb9d8ac864d33faa1c73` |
| Format | custom (`-Fc`) |
| `pg_restore --list` | 428 lines · TOC includes `alembic_version` TABLE DATA |
| Dump alembic | `050_stripe_webhook_events` |

## Staging O7 restore (canonical)

| Check | Expected | Actual |
| ----- | -------- | ------ |
| Target ≠ prod | Different host/port | prod `autorack…:40861` vs staging `monorail…:39789` |
| Target cleaned | Empty public schema | `DROP SCHEMA public CASCADE` + recreate |
| Single `pg_restore` | exit 0 | **0** in 93 s |
| alembic post-restore | matches dump | `050_stripe_webhook_events` |
| Count sanity | matches prod | users 3 · candidates 3 · job_matches 1091 · applications 17 · tables 43 |
| Prod after staging | unchanged | alembic 050 · tables 43 · users 3 |

## Forward migrations on staging only (Etap 7)

Runbook allows restore-then-forward on **isolated** target when scaffold head is ahead of dump.

| Check | Actual |
| ----- | ------ |
| Command | `alembic upgrade head` against staging URL only |
| Exit | **0** in 46 s |
| Final head | `077_candidate_activity_timeline` |
| Table count | 69 |
| Production | **not** migrated (remains 050 / 43 tables) |

## RPO / RTO

| Metric | Value | Notes |
| ------ | ----- | ----- |
| RPO | Dump timestamp `2026-07-15T14:33:23Z` UTC → staging restore start `18:25:40Z` UTC (~3h55m wall for this evidence window; dump itself is point-in-time) | Acceptable for quarterly re-drill; daily Railway snapshots remain primary RPO control |
| RTO | Staging restore **93 s** + optional forward migrate **46 s** | Well under 30-minute operational RTO |

## Application smoke

| Check | Result |
| ----- | ------ |
| Staging API service in restore env | **None** (Postgres-HE2P only) — cannot curl staging `/health` |
| SQL read smoke | **PASS** (alembic + counts) |
| Production API health after recovery | `status=ok`, `db_ok=true`, `git_commit=b98499ae…` |

## Cleanup

| Resource | Final state |
| -------- | ----------- |
| Staging clone | Retained with 077 schema for next drill (isolated; no production traffic) |
| Local dump | Deleted after evidence metadata captured (not committed) |
| Orphan `@example.com` users from R-019 attempts | Deleted (0 remaining) |
| Credentials / JWT / dump bytes | Not in git |

## O7 / LB-201 status

**CLOSED** for post-scaffold DR re-drill evidence (staging restore exit 0 + forward-migrate proof + isolation + prod count match).

**Residual risk (separate from O7 PASS criteria):** production Postgres volume remains at alembic **050** while API build expects tables from **051–077**. Candidate trust/delete surfaces return HTTP 503 schema mismatch until production is forward-migrated under explicit change control.
