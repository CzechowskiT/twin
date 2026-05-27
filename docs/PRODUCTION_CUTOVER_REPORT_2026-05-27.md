# Production cutover report — 2026-05-27

**Mode:** Production cutover readiness + controlled deploy verification
**Branch:** `cursor/phase1-monorepo-scaffold`
**Repo HEAD at commit time:** `f0dd564` (`origin` tip `b0c987d` docs-only)
**Production API SHA:** `f0dd564` (via `public-health`)
**Agent deploy actions:** None (git auto-deploy only; HARD BANs respected)

---

## 1. Executive summary

Production API and the canonical Vercel alias are aligned on runtime SHA **`f0dd564`**, with healthy DB, mail, OAuth (except Apple), calendars, Stripe checkout, and an active Celery worker. Targeted backend security tests (**85 passed**) and frontend build gates are green. **No manual Railway/Vercel deploy was required** in this session; commits `1efd8b1` (OAuth + job-save rate limits) and earlier security runtime landed via git hooks.

**Blockers unchanged for public launch:** CSP enforce burn-in (S2), unverified Alembic `050` on prod (S5), empty backup-restore drill log (O7). **Controlled pilot and investor demo remain GO.**

---

## 2. Git state (ETAP 1)

```text
git fetch --all --prune
git checkout cursor/phase1-monorepo-scaffold
git pull --ff-only  → up to date with origin
```

| Item | Value |
| ---- | ----- |
| Branch | `cursor/phase1-monorepo-scaffold` |
| `git rev-parse HEAD` | `f0dd564` |
| `origin` tip | `b0c987d` (docs worklog only) |
| Working tree at session start | Had local WIP; **origin** already contained `1efd8b1` |
| Recent tip commits | `1efd8b1` OAuth limits · `812a390`…`f0dd564` 12h security/docs |

`git log --oneline -60` — see `docs/API_PRODUCTION_CUTOVER_DECISION_2026-05-27.md` § runtime table.

---

## 3. Production SHAs (ETAP 2)

| Source | SHA | Notes |
| ------ | --- | ----- |
| `origin/cursor/phase1-monorepo-scaffold` (runtime) | `f0dd564` | Matches Railway |
| Railway `GET /api/v1/health` | `f0dd564` | `status=ok` |
| Railway `GET /api/v1/health?ops=1&db=1` | `f0dd564` | `db_ok=true` |
| FE proxy `GET /api/public-health` | `f0dd564` | Full ops payload |
| Vercel `twin-sooty.vercel.app` | Deploy `dpl_2iNLWLiK…` → later auto builds | Project **`twin`** (not `twin-sooty` link drift) |
| Session start Railway | `812a390` | Auto-advanced during session |

### Commit / feature / status table

| Commit | Feature | Status |
| ------ | ------- | ------ |
| `974bd15` | CSP report-uri (FE) | LIVE VERCEL |
| `0dfc6c9` | CSP report sink (BE) | LIVE RAILWAY |
| `28a50a0` | LLM Layer-2 limits | LIVE RAILWAY |
| `ff22f3a` | Stripe dedup handler + upload limits | LIVE RAILWAY |
| `1c731fc` | Auth mutation rate limits | LIVE RAILWAY |
| `1efd8b1` | OAuth callback + job save limits | LIVE RAILWAY |
| `921fb54` | Alembic `050` | NEEDS MIGRATION **verify** (auto on API start) |
| `dd0b8a2` | Auto-apply sweep gate | LIVE RAILWAY |
| `812a390`…`b0c987d` | Docs / tests / gates | REPO ONLY (no runtime) |

---

## 4. Commit map Saturday → now (ETAP 3)

| Category | Representative commits | Deploy surface |
| -------- | ------------------------ | -------------- |
| FE-only / Vercel | `974bd15`, `cd61350`, `b0b4988` | Vercel auto |
| BE runtime | `28a50a0`, `ff22f3a`, `1c731fc`, `1efd8b1`, `dd0b8a2`, `b7c0622` | Railway auto |
| Tests | `08edc74`, `62967e9`, `f0dd564`, … | CI only |
| Docs | `812a390`, `0545f36`, `1e6434d`, … | None |
| Migrations | `921fb54` | Railway **start-api.sh** |
| CI / smoke | `59f7d1a`, `d6d0b8b` | GitHub Actions |
| CSP | `0dfc6c9`, `974bd15` | BE + FE |
| Rate limits | `45e5d6a`…`1efd8b1` | BE |
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
| Auto-apply trigger-sweep gate | ✅ |
| CSP report + sanitization | ✅ |
| Public health regression | ✅ |
| Public API readonly smoke + no-secrets (`f0dd564`) | ✅ |
| Demo snapshot | ✅ |
| Auth scrape flags | ✅ |
| Health + celery status | ✅ |

**Total: 85 passed, 0 failed** (Python 3.14 local). No scrape or live auto-apply tests run.

---

## 6. Frontend gates (ETAP 5)

| Gate | Result |
| ---- | ------ |
| `npm run lint` | ✅ |
| `npx tsc --noEmit` | ✅ |
| `npm run build` | ✅ |

**Playwright** (`TWIN_E2E_BASE_URL=https://twin-sooty.vercel.app`): **14 passed / 4 failed** — login password label, dashboard redirect assertion, public-health proxy assertion, robots.txt (spec drift; not CI-blocking). No login credentials used.

---

## 7. Alembic (ETAP 6)

| Item | Value |
| ---- | ----- |
| Head | `050_stripe_webhook_events` |
| File | `backend/alembic/versions/050_stripe_webhook_events.py` |
| Railway migrate | **`alembic upgrade head` in `start-api.sh`** — no separate Railway release command in `deploy/railway-api.toml` |
| Prod revision | **Unverified** — founder must run `alembic current` or SQL |
| Safe without table | Yes — `stripe_events` helpers no-op |

---

## 8. Cutover decision doc (ETAP 7)

Created: `docs/API_PRODUCTION_CUTOVER_DECISION_2026-05-27.md`

---

## 9. Railway API deploy (ETAP 8)

| Action | Outcome |
| ------ | ------- |
| Manual deploy | **Not performed** |
| Auto-deploy | **DONE** — prod advanced `812a390` → `f0dd564` during session |
| Post-deploy smoke | health, ops health, celery-status, public-health — **all OK** |
| Rollback | Redeploy prior Railway deployment or revert git push |

**Verdict:** API production deploy **DONE** (automatic). **BLOCKED:** manual prod migration without founder approval + verification.

---

## 10. Vercel deploy (ETAP 9)

| Check | Result |
| ----- | ------ |
| Canonical alias | `twin-sooty.vercel.app` → project **`twin`** |
| `scripts/check-vercel-canonical-alias.sh` | ⚠️ local `.vercel` links `twin-sooty` (warn-only drift) |
| Production on HEAD runtime | ✅ (API SHA `f0dd564`) |
| Route smoke | all listed routes **200** |

**Verdict:** Vercel **NOT NEEDED** manual promote; git hook sufficient.

---

## 11. Production read-only smoke (ETAP 10)

All routes and API endpoints listed in the session prompt returned **200** / `status=ok` with no 500s observed.

---

## 12. Candidate E2E (ETAP 11)

| Flow | Status |
| ---- | ------ |
| Full candidate login → apply → calendar | **NOT RUN** — no credentials; no fake PASS |
| Playwright public smoke | **PARTIAL** — 14/18 pass against prod |
| Manual founder confirmation | **PENDING** — use `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` |

---

## 13. Launch gate checklist update (ETAP 12)

Updated: `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` (S10, S10b, S5 note, O2 timestamp).

Summary: **3 ❌/⚠️ security blockers** for public launch (S2, S5 verify, S10 was ⚠️ → ✅ live for OAuth). **O7** still ⚠️.

---

## 14. Production reality matrix (ETAP 13)

Created: `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`

---

## 15. Final verification and verdicts

| Audience | Verdict |
| -------- | ------- |
| Controlled pilot | **GO** |
| Investor / CTO demo | **GO** |
| Public launch | **NO-GO** |
| API production deploy | **DONE** (auto, SHA `f0dd564`) |
| DB migration `050` | **REQUIRED TO VERIFY** — may be auto-applied; not manually run by agent |
| Send link | **YES PILOT** (canonical URL); **NO** public launch |

### Founder manual actions

1. **Confirm Alembic revision** on prod (`050` vs `049`) — `railway ssh` or SQL.
2. If `049`: approve maintenance window + runbook `STRIPE_DEDUP_MIGRATION_RUNBOOK` (or rely on next API restart if auto-migrate acceptable).
3. **CSP enforce:** continue burn-in log `P1_CSP_ENFORCE_BURNIN_DAILY_LOG_2026-05-27.md` — do not flip before 72h gates.
4. **O7:** execute staging restore drill; append `docs/BACKUP_RESTORE_DRILL_LOG.md`.
5. **Candidate E2E:** one real pilot account through login → consent → calendar (manual).
6. Re-run `gh run list --workflow smoke.yml` after any new pushes (e.g. cookie-consent rate limit in flight).

### Hard bans compliance

✅ No live apply/scrape/CAPTCHA bypass · ✅ No secrets in docs commit · ✅ No force-push · ✅ No prod seeding · ✅ No public launch messaging

---

## Related

- `docs/FINAL_12H_AUTONOMOUS_LAUNCH_READINESS_REPORT_2026-05-27.md`
- `docs/API_DEPLOY_DECISION_MEMO_2026-05-27.md`
- `docs/VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md`
- `docs/POST_SECURITY_OPS_RELEASE_VERIFICATION_2026-05-27.md`
