# API production cutover decision — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Session:** Production cutover readiness session 2 (read-only verification; no manual Railway/Vercel deploy).
**Verifier:** Release / security / QA pass.
**Updated:** 2026-05-27 ~16:50 CEST

---

## TL;DR

| Question | Decision |
| -------- | -------- |
| Redeploy API manually today? | **No** — production already at runtime tip `67a22dc`; repo tip `8d34404` is docs-only. |
| Is branch BE runtime live on Railway? | **Yes** — `public-health` reports `git_commit=67a22dc…`, `db_ok=true`, `worker_active=true`. |
| Run Alembic `050` manually? | **Verify first** — `backend/scripts/start-api.sh` runs `alembic upgrade head` on every API start. Founder must confirm `alembic current`. |
| Block deploy for missing migration approval? | **No deploy block** for docs-only tip; **S5 launch gate** stays ⚠️ until DB revision verified. |
| Public launch | **NO-GO** (unchanged — CSP enforce, restore drill, S5 confirmation). |

---

## What deploys (Railway API)

| Layer | Mechanism | Config |
| ----- | --------- | ------ |
| Build | Dockerfile in `backend/` | `deploy/railway-api.toml` — no separate `releaseCommand` |
| Migrate | **`alembic upgrade head` in `start-api.sh`** (retry loop, then uvicorn) | Not optional on start |
| Health | `GET /api/v1/health` | `healthcheckPath` in toml |
| Rollback | Redeploy prior Railway deployment SHA or revert git + push | `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` |

**Implication:** Shipping `921fb54` on the production branch causes the **next successful API start** to attempt `050`. Treat prod revision as **unknown until verified** (S5).

---

## Production SHAs (read-only, session 2)

| Surface | SHA (short) | Matches repo runtime? |
| ------- | ----------- | ---------------------- |
| Railway `public-health` / health | `67a22dc` | ✅ BE runtime tip |
| `origin/cursor/phase1-monorepo-scaffold` | `8d34404` | ⚠️ docs-only ahead of Railway |
| Vercel alias + GitHub Production | `8d34404` | ✅ FE deploy metadata (no code delta vs `67a22dc`) |

---

## Runtime commits since Saturday (`d6d0b8b` … `67a22dc`)

| Category | Commits (sample) | Live on Railway? |
| -------- | ---------------- | ---------------- |
| BE rate limits (waitlist, mutations, OAuth, job save, consent) | `45e5d6a`, `28a50a0`, `1c731fc`, `1efd8b1`, `67a22dc` | ✅ |
| Stripe dedup handler | `ff22f3a` | ✅ (ledger needs table for full dedup) |
| CSP report sink | `0dfc6c9`, `974bd15` (FE report-uri) | ✅ BE + Vercel |
| Auto-apply sweep gate | `dd0b8a2` | ✅ |
| Alembic `050` | `921fb54` | ⚠️ **verify DB** |
| Tests / docs | `f0dd564`…`8d34404` | N/A |

---

## Tests (targeted, no scrape / live auto-apply)

**Command:** `cd backend && python3 -m pytest` on 21 security files (see `docs/PRODUCTION_CUTOVER_REPORT_2026-05-27.md` §5).

| Result | Count |
| ------ | ----: |
| Passed | **97** |
| Failed | 0 |

**Frontend:** lint/tsc/build skipped (docs-only delta vs live Vercel).

**CI:** `smoke.yml` **success** on `67a22dc` (run `26518471948`).

---

## Migration `050_stripe_webhook_events`

| Check | Status |
| ----- | ------ |
| Alembic head in repo | `050_stripe_webhook_events` |
| Chained after | `049_job_match_feedback` |
| Handler wired | `billing.py` → `stripe_events.*` |
| Graceful without table | Helpers no-op on missing table |
| Prod `alembic_version` | **FOUNDER VERIFY** |
| Manual `alembic upgrade` by agent | **NOT DONE** |

---

## Deploy verdict (API)

| Verdict | Rationale |
| ------- | --------- |
| **NOT NEEDED** | Railway at `67a22dc`; commits after are docs-only. |
| **DONE** (prior auto-deploy) | Rate-limit batch through `67a22dc` is live. |
| **BLOCKED** | Manual prod migration without founder sign-off. |

---

## Post-deploy smoke (executed)

| Probe | Result |
| ----- | ------ |
| `GET /api/v1/health` | 200 `status=ok` `git_commit=67a22dc` |
| `GET /api/v1/health?ops=1&db=1` | 200 `db_ok=true` |
| `GET /api/v1/health/celery-status` | 200 `worker_active=true` |
| `GET https://twin-sooty.vercel.app/api/public-health` | 200, `git_commit=67a22dc`, `db_ok=true` |
| Vercel routes (see cutover report §10) | all **200** |

---

## Hard bans

No live applications, scrape triggers, CAPTCHA bypass, secrets in commits, prod seeding, or public launch messaging. No agent-initiated forced deploy or prod `alembic` CLI.

---

## Related

- `docs/PRODUCTION_CUTOVER_REPORT_2026-05-27.md`
- `docs/STRIPE_DEDUP_MIGRATION_RUNBOOK_2026-05-27.md`
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
