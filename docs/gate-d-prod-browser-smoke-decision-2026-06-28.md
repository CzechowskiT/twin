# Gate D Production Browser Smoke — Decision Package — 2026-06-28

**Branch at package:** `cursor/phase1-monorepo-scaffold` @ `2fbda38` (post PR #333 Gate C docs merge)  
**Founder decision:** Gate D = **PENDING** — **no prod browser smoke executed in this package**  
**Gate B:** **YES** (PR #332 `62138dc` shell fix merged)  
**Gate C:** **YES** — local browser **36/36 PASS** — [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md)  
**Gate E / F:** **PENDING**  
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Phase 3B:** **HARD BLOCKED**

---

## 1. Executive Summary

Gate C unlocked **local** sequential browser validation (36 P0 routes, workers=1, **PASS**). Gate D is the **separate founder boundary** for running the **same** `test:p0-no-headless-final-state-browser` suite against **production** (`https://twin-sooty.vercel.app`) — not local webServer.

This package is **docs + static guards only**. It does **not** execute prod browser smoke, does **not** set Gate D = YES, does **not** unblock Phase 3B (Gate E), and does **not** close P0 or change launch stance.

| Item | Status |
|------|--------|
| **Gate D decision** | **PENDING** — awaiting explicit founder YES |
| **Prod FE alignment** | **ALIGNED** — `frontend_commit` = `62138dc` matches Gate B/C code |
| **HTTP smoke (14 routes)** | **14/14 × 200** (curl, read-only) |
| **Default CI** | Playwright **DISABLED** — `smoke.yml` has no browser steps |
| **Next unlock** | Founder marks Gate D = YES → run gated prod command (§4) → fill result template (§7) |

---

## 2. Current Evidence

### Deploy alignment (Part A capture — 2026-06-28)

| Field | Value |
|-------|-------|
| **repo_head** | `2fbda38ab24dc06694ff3f10a01b7c4a2a2bca05` (PR #333 merge on scaffold) |
| **prod_frontend_commit** | `62138dccd986bb068e717a9dafee38f822e94c66` (PR #332 Gate B) |
| **prod_api_commit** | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (`6d6d1e5`, PR #281) |
| **public-health** | `status=ok`, `db_ok=true` |
| **alignment_status** | **ALIGNED** (frontend) — prod FE at Gate B merge; API lag **expected** |
| **docs_only_drift** | **true** after this Gate D docs PR merges — scaffold HEAD ahead of prod FE; **acceptable** for docs-only |

### HTTP smoke (14 routes, prod read-only — curl)

All **HTTP 200** on `https://twin-sooty.vercel.app`:

| # | Route | Status |
|---|-------|--------|
| 1 | `/` | 200 |
| 2 | `/how-it-works` | 200 |
| 3 | `/demo` | 200 |
| 4 | `/status` | 200 |
| 5 | `/login/candidate` | 200 |
| 6 | `/register/candidate` | 200 |
| 7 | `/dashboard` | 200 |
| 8 | `/dashboard/calendar` | 200 |
| 9 | `/recruiter/inbox` | 200 |
| 10 | `/recruiter/calendar` | 200 |
| 11 | `/recruiter/jobs` | 200 |
| 12 | `/privacy` | 200 |
| 13 | `/terms` | 200 |
| 14 | `/api/public-health` | 200 |

### Prior gates (evidence chain)

| Gate | Evidence | Result |
|------|----------|--------|
| **B** | PR #332 @ `62138dc` — minimal `PersonaWorkspaceGate` / shell fix | **MERGED** |
| **C** | [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md) | **36/36 PASS** local, workers=1, 44.5s |
| **D** | This package | **PENDING** — not run |
| **E** | [PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md](./PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md) | **HARD BLOCKED** |
| **F** | Launch gate re-audit | **PENDING** |

### Static gates (pre-browser, local — Gate C baseline)

All passed at Gate C run; re-run before any Gate D execution:

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run test:p0-no-headless-final-state` | **PASS** |
| `npm run test:phase3b-controlled-multitab` | **PASS** |
| `npm run test:p0-browser-memory-multitab-performance` | **PASS** |
| `npm run test:p0-route-weight-inventory` | **PASS** |
| `npm run test:p0-performance-guardrails` | **PASS** |
| `npm run build` | **PASS** |

---

## 3. What Gate D Means

**Gate D — Production browser smoke boundary approved**

- Founder explicitly approves running `test:p0-no-headless-final-state-browser` against **production URL** after deploy alignment is confirmed.
- Requires **both** env flags: `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` **and** `PLAYWRIGHT_SKIP_WEBSERVER=1` (no local Next.js webServer).
- Same 36 routes (`P0_CRITICAL_ALL_ROUTES`), sequential single-page pattern, **workers=1**.
- Gate D validates that local Gate C PASS reproduces on prod — it does **not** substitute Phase 3B multitab proof (Gate E).
- Gate D does **not** close P0 performance — Phase 3B prod PASS + RSS validation still required.
- Gate D does **not** approve public launch — `LAUNCH_STANCE = "noGo"` unchanged.
- Gate D does **not** enable Playwright in default CI — `smoke.yml` must remain browser-free.
- **Default for Gate D: PENDING** until founder explicitly marks **YES** in §8.

**Distinction from Gate C:**

| | Gate C (done) | Gate D (pending) |
|---|---------------|------------------|
| Target | `http://127.0.0.1:3000` via webServer | `https://twin-sooty.vercel.app` |
| Env | `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1` + `PLAYWRIGHT_ENABLE_WEBSERVER=1` | `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` + `PLAYWRIGHT_SKIP_WEBSERVER=1` |
| Deploy risk | None (local build) | Commit mismatch → false FAIL/PASS |

---

## 4. Required Gate D Command

**Do not run until founder sets Gate D = YES (§8).**

```bash
cd frontend
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:p0-no-headless-final-state-browser -- --workers=1
```

| Parameter | Value |
|-----------|-------|
| `PLAYWRIGHT_ALLOW_PROD_SMOKE` | **required** `=1` |
| `PLAYWRIGHT_SKIP_WEBSERVER` | **required** `=1` |
| `PLAYWRIGHT_BASE_URL` | `https://twin-sooty.vercel.app` (omit only if already set) |
| Workers | `--workers=1` (enforced in npm script; explicit for clarity) |
| Routes | 36 (`P0_CRITICAL_ALL_ROUTES`) |
| Pattern | Sequential, `withFreshContext`, one page at a time |

Reference: `frontend/e2e/p0-no-headless-final-state-browser.spec.ts` header comment.

---

## 5. Preconditions

All must be true **before** executing §4:

| # | Precondition | Check |
|---|--------------|-------|
| 1 | Gate B = **YES** | PR #332 merged (`62138dc`) |
| 2 | Gate C = **YES** with local **PASS** | 36/36 — [gate-c evidence](./gate-c-browser-validation-result-2026-06-28.md) |
| 3 | Gate D = **YES** (founder explicit) | §8 decision table |
| 4 | `public-health` `status=ok`, `db_ok=true` | curl `/api/public-health` |
| 5 | `frontend_commit` matches expected deploy SHA | Compare `public-health.frontend_commit` to target; wait for Vercel if mismatch |
| 6 | HTTP smoke 14 routes all 200 | curl table §2 |
| 7 | Static gates pass on current branch | §2 static table |
| 8 | No active CPU/memory incident | No `chrome-headless-shell` storm |
| 9 | Founder JWT / demo credentials available if routes need auth | Ops runbook (Gate F scope) |
| 10 | `smoke.yml` still Playwright-free | Static guard |

---

## 6. Stop Conditions

**STOP immediately and do not claim PASS if any occur:**

| Condition | Action |
|-----------|--------|
| `frontend_commit` ≠ expected SHA during prod run | Wait for Vercel deploy; re-check `public-health`; do not claim PASS |
| Route timeout (>900s suite) or stuck skeleton final state | Abort; document failure category; fix before retry |
| Chrome-only shell passes evaluator (`isChromeOnly`) | Tighten evaluator; do not unblock Phase 3B |
| CPU/memory storm (`chrome-headless-shell` hang, >512 MB JS heap/tab) | Abort; keep Phase 3B **BLOCKED** |
| Hydration/auth-shell regression (lost `next=` deep link) | Abort; shell/gate regression — revert |
| Playwright exposed in `smoke.yml` or default CI | Revert; restore DISABLED stance |
| Gate D run without `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` + `PLAYWRIGHT_SKIP_WEBSERVER=1` | Abort; document incident |
| Any doc/code claims P0 **CLOSED** or launch **GO** from Gate D alone | Revert claim; P0 **OPEN**, launch **NO-GO** |
| Prod FAIL on auth/demo routes due to missing founder JWT | Stop; configure credentials; do not weaken evaluator |

**Rollback:** Gate D FAIL does not revert Gate B/C merges; it blocks Gate E and keeps P0 **OPEN**, launch **NO-GO**, Phase 3B **BLOCKED**.

---

## 7. Result Template

Copy-paste and fill after Gate D execution (only if founder approved §8):

```
Gate D Production Browser Smoke — Result Record
================================================
Date (UTC): ____________________
Executor: _______________________
Founder Gate D approval date: ______

Deploy alignment at run time:
  repo_head:              ____________________
  prod_frontend_commit:   ____________________
  public-health status:   ok | fail
  alignment_status:       ALIGNED | DRIFT (wait)

Command:
  PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:p0-no-headless-final-state-browser -- --workers=1

Results:
  Routes total:     36
  Pass:             __
  Fail:             __
  Duration:         ____s
  Workers:          1
  Base URL:         https://twin-sooty.vercel.app

Failure categories (A–G):
  A stuck-skeleton:     __
  B chrome-only-shell:  __
  C route-timeout:      __
  D auth-mismatch:      __
  E stale-jwt:          __
  F http-404-blank:     __
  G other:              __

Slowest route: ________________ (____ms)

Verdict: PASS | FAIL | ABORTED

Explicit non-claims (must remain true):
  P0 performance:     OPEN
  Public launch:      NO-GO
  Phase 3B:           HARD BLOCKED (Gate E PENDING)
  Default CI browser: DISABLED

Notes:
_____________________________________________
_____________________________________________
```

Save completed record as `docs/gate-d-prod-browser-smoke-result-YYYY-MM-DD.md` on execution — **not part of this decision package**.

---

## 8. Founder Decision Table

**Default for Gates D/E/F: PENDING.** Founder must change to YES or NO explicitly.

| Gate | Question | Status | If YES → allowed next step |
|------|----------|--------|---------------------------|
| **B** | Implementation branch approved (shell fix)? | **YES** | Merged PR #332 `62138dc` |
| **C** | Gated local browser validation? | **YES** (local PASS) | **36/36 PASS** — [evidence](./gate-c-browser-validation-result-2026-06-28.md) |
| **D** | Production browser smoke boundary approved? | **PENDING** | Run §4 command; fill §7 result template |
| **E** | Phase 3B controlled multitab approved? | **PENDING** | Gated browser per Phase 3B doc (20 routes, workers=1) — **requires Gate D PASS first** |
| **F** | Launch-gate re-audit approved? | **PENDING** | Re-run launch checklist; still requires separate founder GO |

**Founder response format (copy-paste):**

```
Slice 12 gates: B=YES C=YES D=YES|NO|PENDING E=YES|NO|PENDING F=YES|NO|PENDING
Gate D prod browser: approved | not approved
Notes: ...
```

**This package does not set Gate D = YES.**

---

## 9. Next Prompt If Gate D = YES

Use only after founder explicitly marks Gate D = **YES** in §8:

```
Continue TWIN on cursor/phase1-monorepo-scaffold.

Gate D = YES (founder approved [date]).
Gate B = YES (merged 62138dc). Gate C = YES (local 36/36 PASS).

Execute prod browser smoke ONLY:
  cd frontend
  PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:p0-no-headless-final-state-browser -- --workers=1

Pre-check: public-health frontend_commit aligned; HTTP smoke 14/14 × 200.
Fill docs/gate-d-prod-browser-smoke-result-YYYY-MM-DD.md per gate-d decision §7.

Hard bans:
- NO Phase 3B unless Gate E explicitly YES
- NO P0 closure or launch GO claims
- NO default CI browser enablement
- NO multitab stress
- STOP on commit mismatch or chrome-only false PASS

If PASS: update SLICE12 checklist + operating context; Gate E remains PENDING.
If FAIL: document categories; P0 OPEN; Phase 3B BLOCKED; no Gate E.
```

---

## 10. Next Prompt If Gate D = NO / PENDING

Use if founder marks Gate D = **NO** or leaves **PENDING** (default):

```
Continue TWIN on cursor/phase1-monorepo-scaffold.

Gate D = NO (or PENDING) — prod browser smoke NOT approved.

Gate B = YES (62138dc). Gate C = YES (local 36/36 PASS).
P0 OPEN. Phase 3B HARD BLOCKED. Launch NO-GO.

Next batch: frontend-only safe-lane slice (Slices 17+ polish, i18n, nav/readiness).
Pick one bounded UX slice from launch plan — no shell/gate/layout changes unless new Gate B.

Hard bans:
- NO PLAYWRIGHT_ALLOW_PROD_SMOKE prod runs
- NO Phase 3B execution
- NO launch GO or P0 closure claims
- NO default CI browser enablement
- NO backend/API/auth/workflow/live-action changes

Run static guards only; docs + static test changes OK.
Re-offer Gate D decision package when founder ready.
```

---

## Explicit Non-Claims

- **P0 performance:** remains **OPEN** (Gate D decision package does not close P0)
- **Public launch:** remains **NO-GO**
- **Gate E / Phase 3B:** remains **PENDING / HARD BLOCKED**
- **Gate D prod browser:** **NOT EXECUTED** in this package
- **Default CI:** Playwright remains **DISABLED** in `smoke.yml`

---

## Verification (this PR)

```bash
cd /Users/tomek/Projects/twin
test -f docs/gate-d-prod-browser-smoke-decision-2026-06-28.md
cd frontend && \
  npx tsc --noEmit && \
  npm run test:p0-no-headless-final-state && \
  npm run test:phase3b-controlled-multitab && \
  npm run test:p0-browser-memory-multitab-performance && \
  npm run test:p0-route-weight-inventory && \
  npm run test:p0-performance-guardrails && \
  npm run build
```

**Not run:** prod browser (Gate D execution), Phase 3B (Gate E), multitab stress.

**Public launch: NO-GO · P0 performance: OPEN · Phase 3B: HARD BLOCKED · Gate B: YES · Gate C: YES (local) · Gate D/E/F: PENDING**
