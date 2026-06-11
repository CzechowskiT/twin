# O7 restore drill runbook — founder steps (2026-06-11)

**Gate:** O7 in `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`  
**Prior evidence:** ✅ PASS row **2026-06-01** in `docs/BACKUP_RESTORE_DRILL_LOG.md` (pg_dump/pg_restore; prod untouched)  
**This runbook:** Repeat drill after post-audit scaffold growth (Alembic head `057`, PRs #94–#113). **No agent execution** — founder credentials only.

**Hard bans:** No prod overwrite · No fake PASS · No secrets in logs or commits · Public launch stays **NO-GO** until explicit founder gate.

---

## When to run

- After major migration chain changes (now `050` → `057`).
- Before any limited-launch GO decision.
- At least quarterly while O7 remains a launch gate.

---

## Preconditions

| Check | PASS signal |
| ----- | ----------- |
| Railway Postgres daily snapshots enabled | Dashboard screenshot (no connection strings) |
| Isolated staging env exists | e.g. `staging-restore-proof-20260529` with **separate** Postgres volume |
| Production volume identified | Active prod volume **`postgres-volume`** — **do not restore into it** |
| Scaffold HEAD noted | `adfcac0` (2026-06-11) or later — for `alembic current` expectation after redeploy |

---

## Method A — pg_dump / pg_restore (recommended; 2026-06-01 proven)

### Step 1 — Read-only prod dump

1. Railway → **production** Postgres → Connect → copy **public** URL to local shell only (never commit).
2. From local machine:

```bash
# Replace HOST/USER/DB with Railway values — do not paste URL into docs or git
pg_dump -Fc -f "twin_o7_prod_$(date -u +%Y%m%dT%H%M%SZ).dump" \
  "postgresql://USER:PASSWORD@HOST:PORT/railway"
```

3. Record: UTC timestamp, dump file size, operator name.

### Step 2 — Restore to staging clone only

1. Target: **staging** Postgres (`postgres-volume-p1D7` or new clone volume) — **not** production.
2. Drop/recreate staging DB if prior drill data present (staging only).

```bash
pg_restore --clean --if-exists --no-owner --no-acl \
  -d "postgresql://STAGING_USER:STAGING_PASSWORD@STAGING_HOST:PORT/railway" \
  twin_o7_prod_YYYYMMDDTHHMMSSZ.dump
```

### Step 3 — Point staging API at clone

1. Railway → **staging API** service → Variables → set `DATABASE_URL` to staging Postgres only.
2. **Never** edit production API `DATABASE_URL`.
3. Redeploy staging API if required.

### Step 4 — Verify staging

```bash
# Staging health (use staging API host)
curl -sS 'https://STAGING_API_HOST/api/v1/health?ops=1&db=1' | jq '{status,db_ok,git_commit}'

# In staging API shell
alembic current
```

SQL sanity (counts only — no PII export):

```sql
SELECT version_num FROM alembic_version;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM candidates;
SELECT COUNT(*) FROM job_matches;
SELECT COUNT(*) FROM applications;
```

**Expected head (2026-06-11 scaffold):** `057_candidate_evidence_items` after production redeploy catches scaffold; staging restore from current prod may show earlier revision until prod migrates — **document actual output**, do not guess.

### Step 5 — Log result

Append one row to `docs/BACKUP_RESTORE_DRILL_LOG.md`:

- **PASS** — all O7 criteria met (see `docs/RUNBOOK_DB_RESTORE_2026-05-27.md` § O7 PASS criteria).
- **FAIL / NOT DONE / BLOCKED** — if any step skipped, creds missing, or prod touched.

### Step 6 — Cleanup

1. Revert staging API `DATABASE_URL` to normal staging DB if drill used temporary clone.
2. Store dump artifact off-repo (encrypted disk); **do not** commit dump files.

---

## Method B — Railway UI restore to new database

1. Postgres → Backups → latest snapshot → **Restore to new database**.
2. Name: `twin-staging-restore-proof-YYYYMMDD` (must ≠ production service).
3. Connect **staging API only** to new clone `DATABASE_URL`.
4. Steps 4–6 same as Method A.

---

## 2026-06-11 post-audit status

| Item | Status |
| ---- | ------ |
| Drill executed 2026-06-11 | **NOT DONE / BLOCKED** — no founder session logged |
| Prod health (read-only) | `db_ok: true`, `git_commit: e48bff1` (1 commit behind scaffold `adfcac0`) |
| O7 gate | **Prior 2026-06-01 PASS stands**; **2026-06-11 re-drill PENDING** — does not auto-fail prior PASS but founder should re-run after prod redeploy to `057` head |

---

## Evidence pack (minimum for PASS row)

1. Screenshot: restore target = staging clone (not prod).
2. Staging `/api/v1/health` JSON (`db_ok: true`).
3. `alembic current` or `SELECT version_num FROM alembic_version;`.
4. One count query output (e.g. `users`).
5. Operator + UTC timestamp + GO/NO-GO note in drill log.

---

## Related documents

- `docs/BACKUP_RESTORE_DRILL_LOG.md` — append-only evidence
- `docs/RUNBOOK_DB_RESTORE_2026-05-27.md` — full O7 criteria
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — launch **NO-GO** unchanged
