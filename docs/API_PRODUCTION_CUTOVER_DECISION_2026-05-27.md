# API production cutover decision — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Session:** Production cutover readiness + controlled deploy (read-only verification; no manual Railway/Vercel CLI deploy by agent).
**Verifier:** Release / security / QA pass.

---

## TL;DR

| Question | Decision |
| -------- | -------- |
| Redeploy API manually today? | **No** — git auto-deploy already brought production to `f0dd564`. |
| Is branch runtime live on Railway? | **Yes** — `public-health` reports `git_commit=f0dd564…`, `db_ok=true`, `worker_active=true`. |
| Run Alembic `050` manually? | **Verify first** — `backend/scripts/start-api.sh` runs `alembic upgrade head` on every API container start; `050` may already be applied. Founder must confirm `alembic current` before treating S5 as green. |
| Block deploy for missing migration approval? | **No deploy block** for rate-limit commits; **S5 launch gate** stays ⚠️ until DB revision verified. |
| Public launch | **NO-GO** (unchanged — CSP enforce, restore drill, S5 confirmation). |

---

## What deploys (Railway API)

| Layer | Mechanism | Config |
| ----- | --------- | ------ |
| Build | Dockerfile in `backend/` | `deploy/railway-api.toml` — no separate `releaseCommand` |
| Migrate | **`alembic upgrade head` in `start-api.sh`** (retry loop, then uvicorn) | Not optional on start |
| Health | `GET /api/v1/health` | `healthcheckPath` in toml |
| Rollback | Redeploy prior Railway deployment SHA or revert git + push | Documented in `INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` |

**Implication:** Shipping commit `921fb54` (migration `050`) on the production branch causes the **next successful API start** to attempt `050` automatically. This is **not** the same as “migration not run” in gate docs — treat prod revision as **unknown until verified**.

---

## Production SHAs (read-only, session end)

| Surface | SHA (short) | Matches repo `f0dd564`? |
| ------- | ----------- | ------------------------ |
| Railway `public-health` | `f0dd564` | ✅ |
| Vercel alias `twin-sooty.vercel.app` | Git deploy ~16:42Z build; API proxy shows `f0dd564` | ✅ |
| `origin/cursor/phase1-monorepo-scaffold` | `b0c987d` (docs-only tip) | ⚠️ docs ahead; no runtime delta |

---

## Runtime commits since Saturday (`d6d0b8b` … `f0dd564`)

| Category | Commits (sample) | Live on Railway? |
| -------- | ---------------- | ---------------- |
| BE rate limits (waitlist, mutations, OAuth, job save) | `45e5d6a`, `28a50a0`, `1c731fc`, `1efd8b1` | ✅ |
| Stripe dedup handler | `ff22f3a` | ✅ (ledger needs table for full dedup) |
| CSP report sink | `0dfc6c9`, `974bd15` (FE report-uri) | ✅ BE + Vercel |
| Auto-apply sweep gate | `dd0b8a2` | ✅ |
| Alembic `050` | `921fb54` | ⚠️ **verify DB** (auto-upgrade on start) |
| Tests / docs / CI | majority of `812a390`…`f0dd564` | N/A |

---

## Tests (targeted, no scrape / live auto-apply)

**Command:** `cd backend && python3 -m pytest` on security bundle.

| Result | Count |
| ------ | ----: |
| Passed | **85** (52 + 23 + 10 health/celery) |
| Failed | 0 |

Includes: Stripe signature/idempotency/050 chain, auth mutation limits, OAuth callback limits, beta waitlist contract + upload limits, CSP report/sanitization, public health regression, public API readonly smoke, demo snapshot, auto-apply sweep gate, scrape flags, health/celery.

**Frontend:** `npm run lint`, `npx tsc --noEmit`, `npm run build` — ✅ green locally.

**CI:** `smoke.yml` success on `1efd8b1`, `f0dd564`; newer push in progress at session end.

---

## Migration `050_stripe_webhook_events`

| Check | Status |
| ----- | ------ |
| Alembic head in repo | `050_stripe_webhook_events` |
| Chained after | `049_job_match_feedback` |
| Handler wired | `billing.py` → `stripe_events.*` |
| Graceful without table | Helpers no-op on missing table |
| Prod `alembic_version` | **FOUNDER VERIFY** — `railway ssh` / SQL `SELECT version_num FROM alembic_version` |
| Manual `alembic upgrade` by agent | **NOT DONE** (HARD BAN + approval) |

If revision is still `049_*`, dedup runs in degraded mode (handler OK, ledger inactive). If `050_*`, S5 can move to ✅ after Stripe replay test per runbook.

---

## Deploy verdict (API)

| Verdict | Rationale |
| ------- | --------- |
| **DONE** (via auto-deploy) | Production `git_commit` matches runtime tip `f0dd564`; health + celery green. |
| **NOT NEEDED** | Manual `railway up` / forced redeploy. |
| **BLOCKED** | Manual prod migration without founder sign-off + verification plan. |

---

## Post-deploy smoke (executed)

| Probe | Result |
| ----- | ------ |
| `GET /api/v1/health` | 200 `status=ok` |
| `GET /api/v1/health?ops=1&db=1` | 200 `db_ok=true` |
| `GET /api/v1/health/celery-status` | `worker_active=true` |
| `GET https://twin-sooty.vercel.app/api/public-health` | 200, `git_commit=f0dd564`, `db_ok=true` |
| Vercel routes `/`, `/waitlist`, `/first-1000`, `/demo`, `/status`, `/login/candidate`, `/dashboard` | all **200** |

---

## Hard bans

No live applications, scrape triggers, CAPTCHA bypass, secrets in commits, prod seeding, or public launch messaging. No agent-initiated forced deploy or prod `alembic` CLI.

---

## Related

- `docs/PRODUCTION_CUTOVER_REPORT_2026-05-27.md` — full session report (15 sections).
- `docs/API_DEPLOY_DECISION_MEMO_2026-05-27.md` — prior no-redeploy memo (superseded for SHA `f0dd564` live state).
- `docs/STRIPE_DEDUP_MIGRATION_RUNBOOK_2026-05-27.md`
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
