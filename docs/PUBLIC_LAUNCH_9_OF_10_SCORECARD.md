# Public launch 9/10 scorecard — canonical

> **Generated:** 2026-07-13T12:25:00Z · **Path:** A (credentials UNSET — preflight only) · **Owner:** Eng agent batch  
> **Verdict:** **NO-GO** — żaden obszar nie osiąga 9/10; obowiązkowe kryteria FAIL/BLOCKED w każdym obszarze.

---

## Report consolidation

| Report / SHA | Status | Superseded by |
|--------------|--------|---------------|
| Scorecard @ `890fe104` | **SUPERSEDED** | This doc @ `9a59cfb6` |
| PR #461 demo reports | **SUPERSEDED** | #462 @ `e788dd9f` + `reports/FOUNDER_DEMO_REVIEW_PACKAGE.md` |
| Demo video NOT_RENDERED docs | **SUPERSEDED** | SHORT MP4/WebM ffprobe PASS @ `e788dd9f` |
| Stack #452 merge-plan transient block | **CLOSED** | Re-run @ 12:20Z — all gates PASS |

**Canonical repo_head:** `9a59cfb6` (branch `chore/extended-integration-batch-2026-07-13`, PR #451)  
**Canonical demo PR:** #462 @ `e788dd9f` (lint + axe a11y + video honesty batch)

---

## Executive summary

| Pole | Wartość |
|------|---------|
| **repo_head** | `9a59cfb6` |
| **prod_api_commit** | `c2a08b025ca950b341540f0bc80f710825c778ce` |
| **prod_frontend** | `https://twin-sooty.vercel.app` |
| **prod_db_head** | `070_candidate_trust_center` (train target: `077`) |
| **alignment_status** | **DRIFT** — train branches ahead of prod |
| **Credentials** | UNSET (`DEMO_USER_PASSWORD`, recruiter token) |
| **Gate F** | PENDING |
| **Launch** | **NO-GO** |

**GO wymaga:** wszystkie 4 obszary ≥9/10 **oraz** wszystkie obowiązkowe kryteria PASS.

---

## Area scores

| Obszar | Score | Mandatory FAIL | Verdict |
|--------|-------|----------------|---------|
| A — Production confirmation | **7/10** | #6 Alembic 077 | FAIL |
| B — Manual E2E | **2/10** | #1,#2,#3,#5,#10 | FAIL |
| C — DR readiness | **6/10** | #2,#5,#8 | FAIL |
| D — Public launch readiness | **5/10** | #1,#2,#3,#5,#10 | FAIL |

---

## A — Production confirmation (mandatory: 1, 2, 6, 8)

| # | Kryterium | Status | Evidence |
|---|-----------|--------|----------|
| A1 | Prod FE canonical URL 200 | **PASS** | `curl -I https://twin-sooty.vercel.app` → 200 @ 2026-07-13T10:55Z |
| A2 | Prod API `/health?db=true` db_ok=true | **PASS** ★ | SHA `c2a08b0`, db_ok=true @ probe suite |
| A3 | FE/API SHA alignment (public-health) | **PASS** | fe=api=`c2a08b025ca9` — `reports/prod-probes/prod-probes-2026-07-13T12-20-41-996Z.json` |
| A4 | Public-health traceability fields | **PASS** | `frontend_commit`, `api_commit`, `commit_interpretation` — guard PASS |
| A5 | Latency p95 < 10s SLO | **PASS** | 110 probes: p50=82ms p95=381ms p99=4452ms — prod probe suite @ 12:20Z |
| A6 | Alembic head = train target 077 | **FAIL** ★ | Prod scaffold 070; train 077 unmerged — `sim:integration-070-077` PASS locally @ 12:20Z |
| A7 | Security headers on FE | **PASS** | CSP, HSTS, X-Frame-Options @ Vercel response headers |
| A8 | No open P0 prod incidents | **PASS** ★ | INC public-health 500 CLOSED — `docs/incidents/2026-07-13-public-health-500.md` |
| A9 | ≥100 public route probes PASS | **PASS** | 110/110 PASS — prod probe suite |
| A10 | Post-train deploy SHA verification | **BLOCKED** | Train #448–#455 unmerged; `verify:production-v3:077` blocked until merge+migrate |

**Area A score: 7/10** (mandatory A6 FAIL → auto NO-GO)

---

## B — Manual E2E (mandatory: 1, 2, 3, 5, 10)

| # | Kryterium | Status | Evidence |
|---|-----------|--------|----------|
| B1 | Founder smoke credentials SET | **BLOCKED** ★ | `npm run preflight:founder-smoke-env` → UNSET @ 2026-07-13T12:20Z |
| B2 | Wave B candidate smoke PASS | **BLOCKED** ★ | Wave B — smoke NOT executed (no fake PASS) |
| B3 | Wave C recruiter smoke PASS | **BLOCKED** ★ | Wave C — NEEDS_FOUNDER_AUTH |
| B4 | Manual E2E matrix documented | **PASS** | `docs/PUBLIC_LAUNCH_FUNCTIONALITY_INVENTORY_2026-07-13.md` |
| B5 | Console-error-free browser sessions | **BLOCKED** ★ | `reports/founder-smoke/founder-smoke-2026-07-13T12-25-13-130Z.json` — smokeExecuted=false |
| B6 | Authenticated persistence smoke | **BLOCKED** | Credentials UNSET |
| B7 | Multitab stability (Phase 3B) | **BLOCKED** | Gate E PASS historical; no fresh manual run @ current SHA |
| B8 | Scoped launch routes (8/5/4) verified | **PASS** (public only) | Public routes 200; auth routes unreachable without creds |
| B9 | R-019 delete flow E2E smoke | **BLOCKED** | API on #451 branch only; prod `c2a08b0` lacks endpoint |
| B10 | Founder E2E sign-off recorded | **BLOCKED** ★ | Gate F PENDING — LB-001 |

**Area B score: 2/10** (5 mandatory BLOCKED → auto NO-GO)

---

## C — DR readiness (mandatory: 2, 5, 6, 7, 8)

| # | Kryterium | Status | Evidence |
|---|-----------|--------|----------|
| C1 | Backup policy documented | **PASS** | `docs/PRELAUNCH_BACKUP_RESTORE_DR_AUDIT_2026-07-13.md` |
| C2 | Last real restore drill PASS | **FAIL** ★ | Last PASS 2026-06-01; post-scaffold 070+ re-drill NOT DONE |
| C3 | Migration rollback plan documented | **PASS** | `docs/ROLLBACK_DECISION_PR448_449_450_2026-07-13.md` + rollback engine v2 |
| C4 | RPO/RTO targets documented | **PASS** | RPO daily snapshots; RTO <4h founder estimate |
| C5 | Real restore tested for 077 chain | **FAIL** ★ | Synthetic only — no Railway backup access |
| C6 | O7 operator runbook current | **PASS** ★ | `docs/O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md` |
| C7 | Prior DR incidents resolved | **PASS** ★ | INC-DB-2026-05-29-001 RESOLVED |
| C8 | Post-scaffold re-drill complete | **BLOCKED** ★ | Requires founder Railway access + post-merge migrate |
| C9 | Prod alembic downgrade banned | **PASS** | Documented in DR audit + runbooks |
| C10 | Synthetic rehearsal tooling PASS | **PASS** | `npm run sim:integration-070-077` exit 0 @ 12:20Z — migrations 070→077 |

**Area C score: 6/10** (mandatory C2, C5, C8 FAIL/BLOCKED → auto NO-GO)

---

## D — Public launch readiness (mandatory: 1, 2, 3, 5, 6, 10)

| # | Kryterium | Status | Evidence |
|---|-----------|--------|----------|
| D1 | Gate F founder decision recorded | **FAIL** ★ | LB-001 OPEN |
| D2 | Launch stance `noGo` cleared | **FAIL** ★ | `PUBLIC_LAUNCH_READINESS_INDEX` → NO-GO |
| D3 | Release train #448–#455 merged | **FAIL** ★ | All OPEN; stack CLEAN + CI green |
| D4 | Security audit PASS (no P0 open) | **PASS** | `docs/PRELAUNCH_SECURITY_AUDIT_2026-07-13.md` — P0 CLOSED |
| D5 | Privacy compliance (R-019 prod) | **FAIL** ★ | Self-service delete branch-only; L6 waiver for pilot only |
| D6 | Hard bans enforced in code/CI | **PASS** ★ | `docs/FEATURE_FLAG_REGISTRY_2026-07-13.md` — Stripe LIVE banned |
| D7 | Feature flag audit guard PASS | **PASS** | `test:hardening-feature-flag-audit-guard` |
| D8 | i18n/a11y wave guards PASS | **PASS** | `test:wave-critical-i18n-a11y-guard` |
| D9 | Legal pages live (/privacy, /terms) | **PASS** | Probe 200 — prod probe suite |
| D10 | Canonical GO/NO-GO scorecard signed | **FAIL** ★ | This doc records NO-GO; founder signature absent |

**Area D score: 5/10** (6 mandatory FAIL → auto NO-GO)

---

## Release train status (#449→#455)

| PR | Branch HEAD | Mergeable | DB head | CI | Notes |
|----|-------------|-----------|---------|-----|-------|
| #449 | `905a660c` | MERGEABLE CLEAN | 071 | green | C1 activation |
| #450 | `cda7a206` | MERGEABLE CLEAN | 072 | green | C2 talent pool |
| #448 | `5c3c4825` | MERGEABLE CLEAN | 073 | green | B3 referrals |
| #451 | `9a59cfb6` | MERGEABLE | — | **all green** | Tooling + R-019 guards; scorecard refresh |
| #452 | `753ecf70` | MERGEABLE CLEAN | 074 | green | C3 notif prefs (rebased) |
| #453 | `934a48a7` | MERGEABLE CLEAN | 075 | green | C4 saved views (rebased) |
| #454 | `26f9da96` | MERGEABLE CLEAN | 076 | green | C5 activity timeline (rebased) |
| #455 | `e36df2cb` | MERGEABLE CLEAN | 077 | green | Candidate timeline (rebased) |

**Hardening #456–#460:** all MERGEABLE CLEAN, smoke green (post-#455 stack).

**Rehearsal evidence:** `npm run sim:integration-070-077` PASS @ 12:20Z · `npm run plan:merge-train-extended` PASS @ 12:20Z · `npm run probe:prod-public` 110/110 @ 12:20Z

**Merge train NOT executed** — credentials UNSET; no auto-merge; no fake smoke PASS.

---

## Demo PR #462 (parallel track)

| Item | Status | Evidence |
|------|--------|----------|
| HEAD | `e788dd9f` | lint + axe a11y + video honesty |
| Merge | **BLOCKED** | Founder narrative approval required |
| Preview smoke | **BLOCKED** | Vercel SSO — local build PASS |
| axe a11y | **PASS** | `test:interactive-demo-a11y` 2/2 @ `e788dd9f` |
| Video exports | **SHORT** | ffprobe: homepage 7.5s, full 19.5s (interactive runtime 38.5s/108s documented) |

---

## Founder operator handoff (credentials SET — copy-paste)

```bash
# 0) Export credentials (values in founder vault — never commit)
export DEMO_USER_PASSWORD='…'
export RECRUITER_TOKEN='…'   # or TWIN_RECRUITER_TOKEN

# 1) Preflight
cd frontend && npm run preflight:founder-smoke-env && npm run preflight:founder-smoke-orchestration

# 2) Wave B/C browser smoke (binds evidence to current SHA)
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ALLOW_PROD_SMOKE=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run preflight:founder-smoke-orchestration

# 3) Manual merge train (GitHub UI — NO auto-merge) #449→#450→#448→#451→#452→#453→#454→#455
#    After EACH merge: wait CI → verify deploy → probe:prod-public → targeted smoke

# 4) Railway migrate to 077 after #455 merged
# 5) Production verification
npm run probe:prod-public && npm run verify:production-v3:077

# 6) R-019 on disposable test account ONLY (never founder demo account)
# 7) O7 real Railway restore drill per docs/O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md
# 8) Gate F decision + scorecard sign-off
```

---

## Tooling delivered (Path A — UNSET branch)

| Tool | Command | Status |
|------|---------|--------|
| Founder smoke preflight | `npm run preflight:founder-smoke-env` | UNSET — exit 2 |
| Founder smoke orchestration | `npm run preflight:founder-smoke-orchestration` | `reports/founder-smoke/founder-smoke-2026-07-13T12-25-13-130Z.json` |
| Prod public probes (110×) | `npm run probe:prod-public` | 110/110 PASS @ 12:20Z |
| Extended merge plan | `npm run plan:merge-train-extended` | PASS — manual merge order ready |
| Integration sim 070→077 | `npm run sim:integration-070-077` | PASS @ 12:20Z |
| Production verifier v3 | `npm run verify:production-v3:077` | **BLOCKED** until merge+migrate |

---

## R-019 self-service delete

| Check | Status | Evidence |
|-------|--------|----------|
| API `POST /candidates/me/delete-account` | **PASS** (branch) | `e7a568ac` — 6 pytest PASS |
| UI live panel | **PASS** (branch) | `test:candidate-account-delete-guard` 5/5 PASS |
| Test matrix (target 20+) | **PASS** (25) | `test:candidate-revoke-delete` 25/25 @ `890fe104` |
| Prod deploy | **BLOCKED** | Prod SHA `c2a08b0` predates R-019 |
| Founder smoke | **BLOCKED** | Credentials UNSET |

---

## R-007–R-009 runtime verification

| Risk | Status | Evidence |
|------|--------|----------|
| R-007 CV upload rate limit | **CLOSED** | `test_beta_waitlist_upload_rate_limit.py` — 11th → 429 |
| R-008 Voice upload rate limit | **CLOSED** | Same module |
| R-009 Dashboard GET enumeration | **CLOSED** | 61st → 429 |
| Register | **UPDATED** | `docs/SECURITY_RISK_REGISTER_2026-05-27.md` |

---

## Auto-apply launch suite

| Suite | Command | Status | Classification |
|-------|---------|--------|----------------|
| Unit + guards (launch) | `go-nogo-scorecard.yml` pytest + guards | **26 PASS** | Launch suite — green |
| Nightly integration | `test_nightly_auto_apply_integration.py` | **PAUSED** | Excluded from launch suite; hard ban active |
| Prod execution | — | **PAUSED** | Feature flag + investor-room copy |

---

## Observability drain gap

| Gap | Severity | Owner | Classification |
|-----|----------|-------|----------------|
| No centralized log drains (Railway hobby) | P2 | Eng/Ops | **ACCEPTED** — Dashboard/CLI; upgrade path in LB-203 |

---

## Dependency / config audit

| Check | Status |
|-------|--------|
| `npm ci` + `npm run build` on #451 | PASS (CI frontend-build) |
| Backend pytest (launch suite) | 21 PASS (R-019 + rate limits + vision) |
| Alembic duplicate revision guard | PASS |
| Vercel project drift (R-017) | PARTIAL — push deploy canonical |

---

## Gate F evidence package

| Item | Status |
|------|--------|
| Scorecard (this doc) | **RECORDED** — NO-GO |
| Blocker register | `docs/PUBLIC_LAUNCH_BLOCKER_REGISTER_2026-07-13.md` |
| Founder smoke evidence | `reports/founder-smoke/founder-smoke-2026-07-13T12-25-13-130Z.json` — BLOCKED (UNSET) |
| Prod probes | `reports/prod-probes/prod-probes-2026-07-13T12-20-41-996Z.json` — 110/110 PASS |
| Integration sim | `reports/integration-sim/integration-sim-2026-07-13T12-20-41-788Z.json` — PASS |
| Founder signature | **ABSENT** — Gate F PENDING |

---

## Hard bans (active)

Stripe LIVE · ATS writeback · Microsoft Calendar write · Auto-apply execution · External notifications · Auto-merge without smoke PASS

---

## Final decision

**NO-GO** — Kontrolowany pilot założycielski dozwolony; publiczny launch zabroniony.

**GO wymaga (kolejność):**
1. Ustaw credentials → Wave B/C browser smoke PASS
2. Merge train #449→#450→#448→#451→#452→#453→#454→#455
3. Railway migrate → prod head 077
4. O7 real restore drill na staging clone
5. Gate F founder decision + podpis scorecard

---

*Canonical scorecard — supersedes all prior batch reports and SHAs listed in Report consolidation. Linked from `PUBLIC_LAUNCH_READINESS_INDEX_2026-07-13.md`.*
