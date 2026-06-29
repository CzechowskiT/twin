# Gate D Production Browser Smoke — Result — 2026-06-28

**Branch at run:** `docs/gate-d-prod-browser-smoke-result-2026-06-28` from `cursor/phase1-monorepo-scaffold` @ `1a7acc00`  
**Founder decision:** Gate D = **YES** (explicit founder approval in current task)  
**Gate E / F:** **PENDING**  
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Phase 3B:** **HARD BLOCKED (NOT RUN)**

**Related:** [preflight runbook](./gate-d-prod-browser-smoke-preflight-2026-06-28.md) · [founder checkpoint](./GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28.md) · [gate-c result](./gate-c-browser-validation-result-2026-06-28.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## Execution Record

```
Gate D Production Browser Smoke — Result Record
================================================
Gate D decision:           YES (founder approved)
Founder approval timestamp: 2026-06-29 (explicit Gate D = YES in task)
Runner:                    Cursor agent — canonical Gate D prod browser command

Deploy alignment at run time:
  repo_head:               1a7acc00d9fc5ebfd4416e6f86f48cd5c59837b4
  prod_frontend_commit:    1a7acc00d9fc5ebfd4416e6f86f48cd5c59837b4
  prod_api_commit:         6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa
  public-health status:    ok
  public-health db_ok:     true
  alignment_status:        ALIGNED — prod FE matches repo HEAD

HTTP smoke (curl, pre-run):
  routes checked:          10
  all 200:                 yes

Exact command:
  cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:p0-no-headless-final-state-browser -- --workers=1

Run parameters:
  base URL:                https://twin-sooty.vercel.app
  workers:                 1
  total routes:            36

Results:
  pass:                    36
  fail:                    0
  duration:                54.9s
  verdict:                 PASS

Slowest routes (top 3):
  1. /for-companies (13000ms)
  2. /dashboard/matches (1400ms)
  3. /dashboard/jobs (1300ms)

Failure taxonomy counts (A–I):
  A stuck skeleton:              0
  B route timeout:               0
  C chrome-only / blank:         0
  D auth-shell mismatch:         0
  E stale JWT / logged-in chrome: 0
  F hydration/runtime exception: 0
  G route-specific data/config:  0
  H prod-only config/deploy:     0
  I Playwright harness/env:      0

Artifacts:
  traces/screenshots/log path: none (36/36 pass, no retries; trace on-first-retry not triggered)

Gate E recommendation:
  Proceed to Gate E founder review: yes (separate founder YES required — not auto-unblocked)
  Notes: Gate D prod 36/36 reproduces Gate C local PASS on https://twin-sooty.vercel.app. Phase 3B still requires explicit Gate E = YES.

Explicit non-claims (must remain true unless separate founder decisions):
  P0 stance:      OPEN
  Launch stance:  NO-GO
  Phase 3B:       HARD BLOCKED (Gate E PENDING; NOT RUN)
  Default CI:     browser DISABLED
```

---

## 1. Preflight (Part A) — all PASS

| Check | Result |
|-------|--------|
| Scaffold synced | **PASS** — `cursor/phase1-monorepo-scaffold` @ `1a7acc00` |
| public-health | **PASS** — `status=ok`, `db_ok=true` |
| HTTP smoke (10 routes) | **PASS** — 10/10 × 200 |
| `npx tsc --noEmit` | **PASS** |
| `test:gate-d-preflight-readiness` | **PASS** |
| `test:gate-d-founder-decision-checkpoint` | **PASS** |
| `test:gate-d-founder-decision-prompt` | **PASS** |
| `test:readiness-consistency-lock` | **PASS** |
| `test:launch-readiness-evidence-guard` | **PASS** |
| `test:p0-no-headless-final-state` | **PASS** |
| `npm run build` | **PASS** |

---

## 2. Production browser (Part B) — **PASS**

| Field | Value |
|-------|-------|
| **Mode** | Production — `PLAYWRIGHT_ALLOW_PROD_SMOKE=1`, `PLAYWRIGHT_SKIP_WEBSERVER=1` |
| **Workers** | 1 |
| **Routes** | 36 (`P0_CRITICAL_ALL_ROUTES`) |
| **Total / pass / fail** | **36 / 36 / 0** |
| **Duration** | **54.9s** |
| **Base URL** | `https://twin-sooty.vercel.app` |

### Per-route result (36/36 PASS)

| # | Route | Result | Duration |
|---|-------|--------|----------|
| 1 | `/` | PASS | 788ms |
| 2 | `/demo` | PASS | 572ms |
| 3 | `/for-companies` | PASS | 13.0s |
| 4 | `/dashboard` | PASS | 1.3s |
| 5 | `/dashboard/jobs` | PASS | 1.3s |
| 6 | `/dashboard/matches` | PASS | 1.4s |
| 7 | `/dashboard/trust` | PASS | 921ms |
| 8 | `/dashboard/trust/controls` | PASS | 1.3s |
| 9 | `/profile` | PASS | 1.0s |
| 10 | `/dashboard/profile` | PASS | 1.3s |
| 11 | `/dashboard/cv` | PASS | 1.0s |
| 12 | `/dashboard/hiring-journey` | PASS | 1.3s |
| 13 | `/profile/hiring-journey` | PASS | 1.3s |
| 14 | `/recruiter` | PASS | 1.9s |
| 15 | `/recruiter/candidates/demo-candidate-001` | PASS | 2.0s |
| 16 | `/recruiter/candidates/demo-candidate-001/trust` | PASS | 1.0s |
| 17 | `/recruiter/candidates/demo-candidate-001/team` | PASS | 1.2s |
| 18 | `/recruiter/candidates/demo-candidate-001/communication` | PASS | 1.1s |
| 19 | `/recruiter/candidates/demo-candidate-001/collaboration` | PASS | 1.1s |
| 20 | `/recruiter/jobs/demo-role-001/pipeline` | PASS | 1.0s |
| 21 | `/recruiter/jobs/demo-role-001/team` | PASS | 1.2s |
| 22 | `/recruiter/jobs/demo-role-001/tasks` | PASS | 1.1s |
| 23 | `/recruiter/integrations/ats/import-readiness` | PASS | 999ms |
| 24 | `/recruiter/hiring-journey` | PASS | 1.1s |
| 25 | `/company/dashboard` | PASS | 1.1s |
| 26 | `/company/candidates/demo-candidate-001` | PASS | 1.2s |
| 27 | `/company/candidates/demo-candidate-001/trust` | PASS | 1.6s |
| 28 | `/company/candidates/demo-candidate-001/team` | PASS | 974ms |
| 29 | `/company/candidates/demo-candidate-001/communication` | PASS | 1.2s |
| 30 | `/company/candidates/demo-candidate-001/collaboration` | PASS | 991ms |
| 31 | `/company/roles/demo-role-001/pipeline` | PASS | 1.1s |
| 32 | `/company/roles/demo-role-001/team` | PASS | 1.1s |
| 33 | `/company/roles/demo-role-001/tasks` | PASS | 1.2s |
| 34 | `/company/integrations/ats/import-readiness` | PASS | 1.4s |
| 35 | `/company/hiring-journey` | PASS | 1.1s |
| 36 | `/board/hiring-journey` | PASS | 1.1s |

**Slowest route:** `/for-companies` (13.0s paint settle — still PASS, meaningful final state).

---

## 3. Explicit non-claims

- **P0 performance:** remains **OPEN** — Phase 3B prod PASS + RSS validation still required
- **Public launch:** remains **NO-GO**
- **Gate E / Phase 3B:** remains **PENDING / HARD BLOCKED** — **NOT RUN**; separate founder YES required
- **Default CI:** Playwright remains **DISABLED** in `smoke.yml`

---

## 4. Next step (founder)

Gate D prod **PASS** unlocks **consideration** of Gate E (Phase 3B controlled multitab) — requires **separate explicit YES**. Do not run Phase 3B without founder Gate E approval.
