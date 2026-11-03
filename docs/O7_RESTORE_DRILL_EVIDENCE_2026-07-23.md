# O7 restore drill evidence — 2026-07-23

**Run ID:** `o7-r020-20260723T065951Z`  
**Operator:** autonomous agent (Railway CLI session; fingerprint-guarded)  
**Gate:** O7 / LB-201  
**Canonical runbook:** `docs/O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md`  
**Result:** **PASS** (isolated staging restore; counts match; prod untouched)  
**Platform Launch:** NO-GO · **Gate F:** PENDING · **Pilot:** BLOCKED_BY_FOUNDER (unchanged)

## Source of truth (verified this run)

| Layer | Verified actual |
| ----- | --------------- |
| Scaffold branch | `cursor/phase1-monorepo-scaffold` |
| Scaffold / aligned SHA | `8bc25388e76cccd14c61826079d37fdc65fb8132` |
| Production API `git_commit` | `8bc25388e76cccd14c61826079d37fdc65fb8132` |
| Production FE `frontend_commit` | `8bc25388e76cccd14c61826079d37fdc65fb8132` |
| Production worker commit | `8bc25388e76cccd14c61826079d37fdc65fb8132` |
| Production Postgres (public proxy fingerprint) | host `autorack.proxy.rlwy.net` port `40861` db `railway` |
| Staging clone | env `staging-restore-proof-20260529` · service `Postgres-HE2P` · volume `postgres-volume-p1D7` · host `monorail.proxy.rlwy.net` port `39789` |
| Production alembic (pre + post) | `096_connector_secret_hash_widen` |
| Scaffold alembic head | `096_connector_secret_hash_widen` |
| Railway project | `responsible-success` (`b4f5caa3-95af-4cfd-9dfd-2210e34f2111`) |

## Safety guards (executed)

| Guard | Result |
| ----- | ------ |
| Staging host ≠ prod host | **PASS** — `monorail…:39789` vs `autorack…:40861` |
| Staging volume ≠ `postgres-volume` | **PASS** — `postgres-volume-p1D7` |
| No prod `DROP` / `pg_restore` / `alembic downgrade` | **PASS** |
| Fingerprint check before dump and before restore | **PASS** |

## Dump validation

| Check | Actual |
| ----- | ------ |
| Path (ephemeral) | `/tmp/twin-o7-drill-20260723/twin_o7_prod_20260723T065951Z.dump` |
| Size | 1 116 258 bytes (~1.1 MB) |
| SHA-256 | `f3f239b0da96ffc74e594caa6ad27b4824cd6090f8c766ea8a55b93d58d2e7ab` |
| Format | custom (`-Fc`) |
| `pg_restore --list` | 1187 TOC lines |
| Dump window (UTC) | `2026-07-23T07:00:00Z` → `2026-07-23T07:00:40Z` (40 s) |
| Dump exit | **0** |

## Production pre-check (read-only)

| Check | Actual |
| ----- | ------ |
| `alembic_version` | `096_connector_secret_hash_widen` |
| `users` | 23 |
| `candidates` | 17 |
| `job_matches` | 1431 |
| `applications` | 20 |
| public tables | 116 |

## Staging O7 restore (canonical)

| Check | Expected | Actual |
| ----- | -------- | ------ |
| Target ≠ prod | Different host/port/volume | prod `autorack…:40861` / `postgres-volume` vs staging `monorail…:39789` / `postgres-volume-p1D7` |
| Target cleaned | Empty public schema | `DROP SCHEMA public CASCADE` + recreate (exit 0) |
| Single `pg_restore` | exit 0 | **0** in **396 s** (`07:01:10Z` → `07:07:46Z` UTC) |
| alembic post-restore | matches dump / prod | `096_connector_secret_hash_widen` |
| Count sanity | matches prod | users **23** · candidates **17** · job_matches **1431** · applications **20** · tables **116** |
| Prod after staging | unchanged | alembic `096` · users **23** · tables **116** |

## Forward migrations

Dump already at scaffold head `096`. **No** `alembic upgrade` / **no** `alembic downgrade` on staging or production. Staging schema matches production head without forward migrate.

## RPO / RTO

| Metric | Value | Notes |
| ------ | ----- | ----- |
| RPO | Point-in-time dump `2026-07-23T07:00:00Z` UTC | Daily Railway snapshots remain primary RPO control |
| RTO | Staging restore **396 s** (~6.6 min) | Under operational RTO; larger than 2026-07-15 (93 s) due to ~4× dump size / schema growth to 116 tables |

## Application smoke

| Check | Result |
| ----- | ------ |
| Staging API service in restore env | **None** (Postgres-HE2P only) — cannot curl staging `/health` |
| SQL read smoke | **PASS** (alembic + counts) |
| Production public-health after drill | `status=ok`, `db_ok=true`, commits aligned @ `8bc25388…` |

## Cleanup

| Action | Status |
| ------ | ------ |
| Ephemeral dump retained off-repo under `/tmp/twin-o7-drill-20260723/` | **yes** (operator may delete) |
| Connection URL files removed from `/tmp` after verify | **yes** |
| Dump bytes / passwords / JWT | **not** committed |

## Explicit non-claims

- Does **not** set Launch GO, Gate F YES, Pilot GO, or enrollment ON.
- Does **not** authorize production volume restore or migration downgrade.
- Prior 2026-07-15 PASS stands; this row is the **fresh** post-`096` re-drill.

## Residual vs maximal §6 app-layer checklist (not a failed drill)

Staging env contains **Postgres-HE2P only** (no staging API/worker). Therefore this PASS is **SQL restore + count/schema/alembic** evidence, not a full app boot against the clone. Residual (operator optional, non-blocking for O7 PASS row): wire ephemeral staging API to clone for `/health`, worker/broker reconnect demos. **Do not** re-declare O7 as operator gap — drill executed and PASS.

## Verdict

**O7 = PASS** for run `o7-r020-20260723T065951Z`.
