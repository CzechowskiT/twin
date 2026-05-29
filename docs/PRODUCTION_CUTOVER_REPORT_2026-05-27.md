# Production cutover report — 2026-05-27

**Mode:** Production cutover readiness + controlled deploy verification (session 2)
**Branch:** `cursor/phase1-monorepo-scaffold`
**Repo HEAD:** `8d34404` (`docs(release): record production cutover status`)
**Production API SHA:** `67a22dc` (Railway `GET /api/v1/health`, public-health proxy)
**Production Vercel SHA:** `8d34404` (GitHub `environment=Production` deployment metadata)
**Agent deploy actions:** None (read-only verification + doc refresh; HARD BANs respected)

---

## 1. Executive summary

Production API is healthy at **`67a22dc`** (includes cookie-consent + recruiter-inbox rate limits). Canonical Vercel alias **`twin-sooty.vercel.app`** is on project **`twin`** at git deploy **`8d34404`** (docs-only delta vs API; no FE runtime change in those three commits). Targeted backend security tests: **97 passed**. Production route smoke: **all 200**. Playwright public smoke: **14/18** (spec drift; not CI-blocking).

**No manual Railway/Vercel deploy** was required or performed this session — commits `510acf5`…`8d34404` are docs-only; runtime tip for code is **`67a22dc`** on Railway.

**Blockers unchanged for public launch:** CSP enforce burn-in (S2), unverified Alembic `050` on prod (S5), empty backup-restore drill log (O7). **Controlled pilot and investor demo remain GO.**

---

## 2. Git state (ETAP 1)

```text
git fetch origin
git checkout cursor/phase1-monorepo-scaffold
git pull origin cursor/phase1-monorepo-scaffold  → up to date
```

| Item | Value |
| ---- | ----- |
| Branch | `cursor/phase1-monorepo-scaffold` |
| `git rev-parse HEAD` | `8d34404` |
| `origin` tip | `8d34404` (equal) |
| Working tree | **Clean** |
| `git log -60` | See §4 / `docs/API_PRODUCTION_CUTOVER_DECISION_2026-05-27.md` |

---

## 3. Production SHAs (ETAP 2)

| Source | SHA | Notes |
| ------ | --- | ----- |
| `origin/cursor/phase1-monorepo-scaffold` | `8d34404` | Docs tip |
| Railway `GET /api/v1/health` | `67a22dc` | `status=ok` |
| Railway `GET /api/v1/health?ops=1&db=1` | `67a22dc` | `db_ok=true` |
| FE proxy `GET /api/public-health` | `67a22dc` | Full ops payload; `validated_jobs=652` |
| Vercel `twin-sooty.vercel.app` | `8d34404` | Deploy `dpl_3igEKv2xinSBtsKATW1fQmyEGZn2` (production, Ready) |
| GitHub Production deployment | `8d34404` | `gh api …/deployments?environment=Production` |

### Commit / feature / status table

| Commit | Feature | Status |
| ------ | ------- | ------ |
| `974bd15` | CSP report-uri (FE) | LIVE VERCEL |
| `0dfc6c9` | CSP report sink (BE) | LIVE RAILWAY |
| `28a50a0` | LLM Layer-2 limits | LIVE RAILWAY |
| `ff22f3a` | Stripe dedup handler + upload limits | LIVE RAILWAY |
| `1c731fc` | Auth mutation rate limits | LIVE RAILWAY |
| `1efd8b1` | OAuth callback + job save limits | LIVE RAILWAY |
| `67a22dc` | Cookie consent + recruiter inbox rate limits | LIVE RAILWAY |
| `f0dd564` | Public no-secrets tests + ops docs | LIVE RAILWAY (included in `67a22dc` ancestry) |
| `921fb54` | Alembic `050` | **FOUNDER VERIFY** (auto on API start in `start-api.sh`) |
| `dd0b8a2` | Auto-apply sweep gate | LIVE RAILWAY |
| `510acf5`…`8d34404` | Cutover / gate / matrix docs | REPO + VERCEL metadata only |

---

## 4. Commit map Saturday → now (ETAP 3)

| Category | Representative commits | Deploy surface |
| -------- | ------------------------ | -------------- |
| FE-only / Vercel | `974bd15`, `cd61350`, `b0b4988` | Vercel auto |
| BE runtime | `28a50a0`, `ff22f3a`, `1c731fc`, `1efd8b1`, `67a22dc`, `dd0b8a2`, `b7c0622` | Railway auto |
| Tests | `08edc74`, `62967e9`, `f0dd564`, … | CI only |
| Docs | `812a390`, `0545f36`, `8d34404`, … | None (Vercel rebuild on push, no runtime delta) |
| Migrations | `921fb54` | Railway **`start-api.sh`** → `alembic upgrade head` |
| CI / smoke | `59f7d1a`, `d6d0b8b` | GitHub Actions — green on `67a22dc` |
| CSP | `0dfc6c9`, `974bd15` | BE + FE |
| Rate limits | `45e5d6a`…`67a22dc` | BE |
| Stripe | `f341e1f`, `ff22f3a`, `921fb54` | BE + DB |
| Dashboard / e2e | `b0b4988`, `ca68076` | Tests / Vercel |

---

## 5. Backend tests (ETAP 4)

| Suite | Result |
| ----- | ------ |
| Stripe signature, dedup, idempotency, migration 050 chain | ✅ |
| Beta waitlist contract + upload rate limit | ✅ |
| Auth mutation rate limits | ✅ |
| OAuth callback rate limits | ✅ |
| Consent + recruiter inbox rate limits | ✅ |
| Auto-apply trigger-sweep gate | ✅ |
| CSP report + sanitization | ✅ |
| Public health regression | ✅ |
| Public API readonly smoke + no-secrets | ✅ |
| Demo snapshot | ✅ |
| Auth scrape flags (`test_auth_me_scrape_flags.py`) | ✅ |
| Health + celery status | ✅ |

**Total: 97 passed, 0 failed** (Python 3.14 local, ~16s). No scrape or live auto-apply tests run.

---

## 6. Frontend gates (ETAP 5)

| Gate | Result |
| ---- | ------ |
| `npm run lint` | ⏭️ **Skipped** — HEAD vs Vercel: docs-only delta; prior session green |
| `npx tsc --noEmit` | ⏭️ Skipped (same) |
| `npm run build` | ⏭️ Skipped (same) |

**Playwright** (`TWIN_E2E_BASE_URL=https://twin-sooty.vercel.app`): **14 passed / 4 failed** — login password label, dashboard redirect assertion, public-health proxy assertion (transient/spec), robots.txt sitemap line (spec drift). No login credentials used.

---

## 7. Alembic (ETAP 6)

| Item | Value |
| ---- | ----- |
| Head | `050_stripe_webhook_events` |
| File | `backend/alembic/versions/050_stripe_webhook_events.py` |
| Railway migrate | **`alembic upgrade head` in `backend/scripts/start-api.sh`** (retry loop, exit on failure, then uvicorn) |
| Prod revision | **Unverified** — founder must run `alembic current` or SQL |
| Safe without table | Yes — `stripe_events` helpers no-op |
| Inference | API container healthy → last start likely ran `upgrade head` successfully; does **not** prove `050` without DB read |

---

## 8. Cutover decision doc (ETAP 7)

Updated: `docs/API_PRODUCTION_CUTOVER_DECISION_2026-05-27.md` (SHAs, tests, verdicts).

---

## 9. Railway API deploy (ETAP 8)

| Action | Outcome |
| ------ | ------- |
| Manual deploy | **Not performed** |
| Auto-deploy | **Already at runtime tip** — `67a22dc` live; `8d34404`…`510acf5` are docs-only |
| Post-deploy smoke | health, ops health, `/health/celery-status`, public-health — **OK** |
| Rollback | Redeploy prior Railway deployment SHA or revert git push |

**Verdict:** API production deploy **NOT NEEDED** this session. **BLOCKED:** manual prod migration without founder approval + verification.

---

## 10. Vercel deploy (ETAP 9)

| Check | Result |
| ----- | ------ |
| Canonical alias | `twin-sooty.vercel.app` → project **`twin`** |
| Production deployment | `dpl_3igEKv2xinSBtsKATW1fQmyEGZn2` @ `8d34404` |
| `scripts/check-vercel-canonical-alias.sh` | ⚠️ local `.vercel` may link `twin-sooty` (warn-only drift) |
| Manual promote | **Not performed** — git auto-deploy sufficient |
| Route smoke | `/`, `/login`, `/register`, `/beta`, `/privacy`, `/terms`, `/api/public-health`, `/robots.txt`, `/sitemap.xml` — **200** |

**Verdict:** Vercel **NOT NEEDED** manual deploy.

---

## 11. Production read-only smoke (ETAP 10)

| Probe | HTTP |
| ----- | ---- |
| FE `/`, `/login`, `/register`, `/beta`, `/privacy`, `/terms` | 200 |
| FE `/api/public-health` | 200 `status=ok` `db_ok=true` |
| FE `/robots.txt`, `/sitemap.xml` | 200 |
| API `/api/v1/health` | 200 |
| API `/api/v1/health?ops=1&db=1` | 200 |
| API `/api/v1/health/celery-status` | 200 `worker_active=true` |

No 500s observed on listed routes.

---

## 12. Candidate E2E (ETAP 11)

| Flow | Status |
| ---- | ------ |
| Full candidate login → apply → calendar | **NOT RUN** — no credentials; no fake PASS |
| Playwright public smoke | **PARTIAL** — 14/18 pass against prod |
| Manual founder confirmation | **PENDING** — `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` |

---

## 13. Launch gate checklist update (ETAP 12)

Updated: `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` (O2 prod SHA `67a22dc`, S10/S10b prod refs).

Summary: **Public launch NO-GO** — S2 ❌, S5 ⚠️ founder verify, O7 ⚠️. **Pilot GO.**

---

## 14. Production reality matrix (ETAP 13)

Updated: `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` (API SHA `67a22dc`, cookie-consent limits).

---

## 15. Final verification and verdicts

| Audience | Verdict |
| -------- | ------- |
| Controlled pilot | **GO** |
| Investor / CTO demo | **GO** |
| Public launch | **NO-GO** |
| API production deploy | **NOT NEEDED** (live `67a22dc`; docs-only tip `8d34404`) |
| DB migration `050` | **REQUIRED TO VERIFY** — not manually run by agent |
| Send link | **YES PILOT** (`https://twin-sooty.vercel.app`); **NO** public launch |

### Founder manual actions

1. **Confirm Alembic revision** on prod (`050` vs `049`) — `railway ssh` or SQL `SELECT version_num FROM alembic_version`.
2. If `049`: approve maintenance window + `docs/STRIPE_DEDUP_MIGRATION_RUNBOOK_2026-05-27.md` (or accept auto-migrate on next API restart).
3. **CSP enforce:** continue `docs/P1_CSP_ENFORCE_BURNIN_DAILY_LOG_2026-05-27.md` — do not flip before 72h gates.
4. **O7:** execute staging restore drill; append `docs/BACKUP_RESTORE_DRILL_LOG.md`.
5. **Candidate E2E:** one real pilot account through login → consent → calendar (manual).
6. Optional: fix Playwright spec drift (password label, `/login/candidate` redirect, robots sitemap assertion).

### Hard bans compliance

✅ No live apply/scrape/CAPTCHA bypass · ✅ No secrets in docs · ✅ No force-push · ✅ No prod seeding · ✅ No public launch messaging

---

## Session log (2026-05-27 ~16:50 CEST)

- Refreshed prod SHAs: Railway `67a22dc`, Vercel/GitHub Production `8d34404`.
- Ran 97-test security bundle — green.
- Playwright prod smoke 14/18.
- No Railway/Vercel CLI deploy.

---

## Related

- `docs/API_PRODUCTION_CUTOVER_DECISION_2026-05-27.md`
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
- `docs/FINAL_12H_AUTONOMOUS_LAUNCH_READINESS_REPORT_2026-05-27.md`
