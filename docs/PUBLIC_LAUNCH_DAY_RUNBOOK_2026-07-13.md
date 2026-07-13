# Public launch day runbook — 2026-07-13

> **Status:** DRY-RUN ONLY — Launch **NO-GO** until Gate F + smoke PASS  
> **Supersedes for day-of:** [LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md](./LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md) (pilot scope)

---

## T-7 days (preconditions)

- [ ] Gate F founder decision recorded (YES/NO/EDIT)
- [ ] All LAUNCH_BLOCKER items in [blocker register](./PUBLIC_LAUNCH_BLOCKER_REGISTER_2026-07-13.md) GREEN or waived
- [ ] Release train #449→#450→#448→#451→#452→#453→#454→#455 merged
- [ ] Hardening #456–#460 merged (optional parallel)
- [ ] `sim:integration-070-077` PASS on `main`
- [ ] Founder smoke PASS docs for Wave B + C waves
- [ ] O7 DR re-drill PASS row appended
- [ ] Prod `public-health` `git_commit` matches `main` HEAD

---

## T-24h

```bash
# Credentials SET only — never log values
cd frontend
npm run preflight:founder-smoke-env
npm run preflight:preview-reachability
npm run test:public-launch-readiness-guard
npm run build
```

```bash
curl -s https://twin-sooty.vercel.app/api/public-health | jq '{status, git_commit, db_ok}'
```

| Check | PASS signal |
|-------|-------------|
| `db_ok` | `true` |
| `status` | `ok` |
| Vercel latest prod deploy | Ready |
| No open P0 blockers | Register clean |

---

## T-1h (freeze)

1. **No merges** without founder approval
2. Confirm `LAUNCH_STANCE` still `noGo` until explicit flip
3. Snapshot: `git rev-parse HEAD` + Vercel deployment ID
4. Notify team: controlled pilot vs public GO scope

---

## Launch sequence (Path A — credentials SET)

**Order:** #449 → #450 → rebase #448 → #448 → #451 → fix/rebase #452 → #452 → #453 → #454 → #455

After each product merge:
1. CI green on `main`
2. Railway migrate (if Alembic file)
3. `curl public-health`
4. Targeted founder smoke per wave runbook
5. Record PASS in smoke doc — **no fake PASS**

---

## T+0 monitoring (first 4h)

| Signal | Tool | Alert threshold |
|--------|------|-----------------|
| API health | `/api/public-health` | `db_ok=false` or 5xx |
| Error rate | Vercel Dashboard → Logs | Spike vs baseline |
| CSP violations | Railway logs | Any enforce violation |
| Signup funnel | PostHog (if enabled) | Anomaly |

```bash
cd frontend
npx vercel logs https://twin-sooty.vercel.app --level error --since 1h
```

---

## Rollback triggers

| Trigger | Action |
|---------|--------|
| Migration failure | STOP Railway deploy; restore backup — **no downgrade** |
| 5xx on core routes > 5 min | Vercel promote previous deployment |
| Data integrity issue | Incident ID + founder decision |
| Overclaim in prod copy | Hotfix PR or instant rollback |

---

## Hard bans on launch day

- No Stripe LIVE flip
- No ATS / MS Calendar write enable
- No auto-apply activation
- No external notification send
- No `LAUNCH_STANCE` flip without Gate F YES

---

## Post-launch T+24h

- [ ] Append smoke evidence to readiness index
- [ ] O7 spot-check if migrations ran
- [ ] Review blocker register — close or defer
- [ ] Gate F retrospective if scoped GO only

**Runbook stance:** Prepared · **Not authorized for execution** until Gate F + credentials + train merge complete.
