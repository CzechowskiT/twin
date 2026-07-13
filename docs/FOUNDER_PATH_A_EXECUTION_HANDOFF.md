# Founder Path A — executable handoff

> **Generated:** 2026-07-13 · **Credentials:** UNSET (preflight only) · **Launch:** NO-GO · **Gate F:** PENDING

Short operator runbook when `DEMO_USER_PASSWORD` + recruiter token are SET. No auto-merge.

---

## 1. Credentials (SET/UNSET only — no values in Git)

| Variable | Where | Purpose |
|----------|-------|---------|
| `DEMO_USER_PASSWORD` | Railway API vars or local `.env.railway` | Wave B candidate smoke |
| `RECRUITER_TOKEN` / `TWIN_RECRUITER_TOKEN` | Railway or 1Password ops vault | Wave C recruiter smoke |
| `RAILWAY_TOKEN` | `.env.railway` (local) | `railway run alembic upgrade head` |
| `VERCEL_TOKEN` | `.env.railway` (local) | Deploy verification |

Preflight: `cd frontend && npm run preflight:founder-smoke-env`  
Full orchestration: `npm run preflight:founder-smoke-orchestration` (when SET)

See: `docs/FOUNDER_SECRETS_WHERE.md`

---

## 2. Merge order (manual GitHub UI only)

```
#449 → #450 → #448 → #451 → #452 → #453 → #454 → #455
```

Dry-run planner: `cd frontend && npm run plan:merge-train-extended`  
Integration sim: `npm run sim:integration-070-077` (full) or `:dry-run`  
**NEVER** use `--execute` on merge orchestrator.

After each merge: rebase dependent PR, re-run smoke for that wave.

---

## 3. DB migration 077

After #455 merged to scaffold:

```bash
railway link   # twin API service
railway run alembic upgrade head
```

Verify: prod health `db_ok=true`, migration `077_candidate_activity_timeline` applied.

---

## 4. R-019 (disposable test account only)

Risk register R-019 = DSR self-service partial. For smoke:

- Use **disposable** test accounts only — never founder/production user
- Manual DSR via `docs/GDPR_MANUAL_DSR.md` if cleanup needed
- Do **not** claim R-019 closed until `/auth/me/export` + `/auth/me/delete-account` ship

---

## 5. O7 backup/restore

Gate F item O7: staging drill PASS 2026-06-01. Before prod train:

- Confirm backup snapshot exists in Railway Postgres
- **Do not** `alembic downgrade` on prod
- Rollback = Vercel instant rollback + Railway restore from backup (founder manual)

---

## 6. Stabilization probes

```bash
cd frontend && npm run probe:prod-public
```

Expect: 110/110 PASS, `fe=api SHA`, `db_ok=true`.

---

## 7. Gate F

Evidence: `docs/GATE_F_REAUDIT_RESULT_2026-07-07.md`  
Founder decision: YES / NO / PENDING — **not** set by agent.  
Gate F YES ≠ Launch GO.

---

## 8. Demo PR #462 (separate track)

| Item | Value |
|------|-------|
| PR | [#462](https://github.com/CzechowskiT/twin/pull/462) |
| Branch | `feat/interactive-demo-homepage-candidate` |
| #461 | CLOSED (duplicate) |
| Review package | `reports/FOUNDER_DEMO_REVIEW_PACKAGE.md` |
| Videos | `reports/demo-video/` (short + full EN/PL) |

Merge #462 only after founder narrative approval — independent of train #448–#455.

Tests before merge:

```bash
cd frontend
npm run test:interactive-demo-guard
npm run test:homepage-candidate-story
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:interactive-demo-a11y
npm run build
```

---

## 9. Path A completion checklist

- [ ] Credentials SET (preflight PASS)
- [ ] Wave B smoke PASS (candidate)
- [ ] Wave C smoke PASS (recruiter)
- [ ] Manual merge #449→#455 in order
- [ ] Railway migrate 077
- [ ] Probes 110/110
- [ ] R-019 handled via disposable accounts only
- [ ] O7 restore plan acknowledged
- [ ] Gate F founder decision recorded
- [ ] #462 narrative review (optional parallel)

**Launch remains NO-GO until all criteria met and separate public-launch founder decision.**
