# Gate D Production Browser Smoke — Preflight Runbook — 2026-06-28

**Branch at package:** `cursor/phase1-monorepo-scaffold` @ `27aa372c` (post PR #343 evidence index merge)  
**Founder decision:** Gate D = **PENDING** — **no prod browser smoke executed in this package**  
**Package type:** Preflight runbook + static guards — **not execution approval**  
**Gate B:** **YES** (PR #332 `62138dc` shell fix merged)  
**Gate C:** **YES** — local browser **36/36 PASS** — [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md)  
**Gate E / F:** **PENDING**  
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Phase 3B:** **HARD BLOCKED**

**Related:** [gate-d decision](./gate-d-prod-browser-smoke-decision-2026-06-28.md) · [result template](./gate-d-prod-browser-smoke-result-template-2026-06-28.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Executive Summary

Gate D remains **PENDING**. This document is a **preflight runbook** that makes the production browser smoke execution path mechanically unambiguous and safer. It does **not** approve Gate D execution, does **not** run prod browser smoke, and does **not** change launch or P0 stance.

| Item | Status |
|------|--------|
| **Gate D** | **PENDING** — awaiting explicit founder YES |
| **This preflight package** | Runbook only — **not execution approval** |
| **Prod browser smoke** | **NOT RUN** in this package |
| **Public launch** | **NO-GO** |
| **P0 performance** | **OPEN** |
| **Phase 3B** | **HARD BLOCKED** (Gate E **PENDING**) |
| **Default CI browser** | **DISABLED** — `smoke.yml` has no Playwright steps |

When founder explicitly marks Gate D = **YES**, use §4 command after §5 preflight checks pass, then fill [result template](./gate-d-prod-browser-smoke-result-template-2026-06-28.md).

---

## 2. Current Evidence

### Deploy alignment (Part A capture — 2026-06-28, Slice 26)

| Field | Value |
|-------|-------|
| **repo_head** | `27aa372c52008b96c815976942bbf7038383a4ce` (PR #343 merge on scaffold) |
| **prod_frontend_commit** | `27aa372c52008b96c815976942bbf7038383a4ce` |
| **prod_api_commit** | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (`6d6d1e5`, PR #281) |
| **public-health** | `status=ok`, `db_ok=true`, `validated_jobs=652` |
| **alignment_status** | **ALIGNED** — prod FE matches scaffold HEAD post-#343 |
| **docs_only_drift** | **false** at capture — prior baseline expected `b50ef103` vs `27aa372c`; Vercel caught up to `27aa372c` |

### Evidence chain (prior gates + packages)

| Gate / milestone | Evidence | Result |
|------------------|----------|--------|
| **B** | PR #332 @ `62138dcc986bb068e717a9dafee38f822e94c66` — minimal shell fix | **MERGED** |
| **C** | PR #333 @ `8774d33` + [gate-c result](./gate-c-browser-validation-result-2026-06-28.md) | **36/36 PASS** local, workers=1 |
| **D decision** | PR #334 @ `b585055` + [gate-d decision](./gate-d-prod-browser-smoke-decision-2026-06-28.md) | **PENDING** — not run |
| **E prerequisites** | PR #342 @ `b50ef103` + [gate-e prerequisites](./gate-e-phase3b-prerequisites-decision-2026-06-28.md) | **PENDING** — not run |
| **Evidence index** | PR #343 @ `27aa372c` + [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md) | **MERGED** |
| **D preflight** | This package (Slice 26) | **PENDING** — runbook only |

### HTTP smoke (10 routes, prod read-only — curl)

All **HTTP 200** on `https://twin-sooty.vercel.app`:

| # | Route | Status |
|---|-------|--------|
| 1 | `/` | 200 |
| 2 | `/for-investors` | 200 |
| 3 | `/investor` | 200 |
| 4 | `/investor/product-proof` | 200 |
| 5 | `/demo` | 200 |
| 6 | `/how-it-works` | 200 |
| 7 | `/faq` | 200 |
| 8 | `/dashboard/trust` | 200 |
| 9 | `/status` | 200 |
| 10 | `/api/public-health` | 200 |

---

## 3. Gate D Scope

**Gate D — Production browser smoke** validates that local Gate C PASS reproduces on production.

| In scope | Out of scope |
|----------|--------------|
| Production base URL `https://twin-sooty.vercel.app` | Local webServer (`PLAYWRIGHT_ENABLE_WEBSERVER`) |
| Same **36** `p0-no-headless-final-state` routes | Phase 3B controlled multitab (Gate E) |
| Sequential single-page pattern, **workers=1** | Multitab, stress, parallel workers |
| Explicit opt-in: `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` + `PLAYWRIGHT_SKIP_WEBSERVER=1` | Default CI browser enablement |
| Read-only route evaluation | Prod mutations, live writes, outreach |

**Explicit non-claims:** Gate D does **not** close P0, does **not** approve public launch, does **not** unblock Phase 3B, and does **not** set Gate E = YES.

---

## 4. Required Command

**Do not run until founder sets Gate D = YES and §5 preflight checks pass.**

```bash
cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:p0-no-headless-final-state-browser -- --workers=1
```

| Parameter | Value |
|-----------|-------|
| `PLAYWRIGHT_ALLOW_PROD_SMOKE` | **required** `=1` |
| `PLAYWRIGHT_SKIP_WEBSERVER` | **required** `=1` (no local Next.js webServer) |
| `PLAYWRIGHT_BASE_URL` | `https://twin-sooty.vercel.app` (repo default in `playwright.config.ts` falls back to `http://127.0.0.1:3000` — **must set for prod**) |
| Workers | `--workers=1` (enforced in npm script; explicit for clarity) |
| Routes | **36** (`P0_CRITICAL_ALL_ROUTES`) |
| Pattern | Sequential, `withFreshContext`, one page at a time |

Reference: `frontend/e2e/p0-no-headless-final-state-browser.spec.ts`, [gate-d decision §4](./gate-d-prod-browser-smoke-decision-2026-06-28.md).

---

## 5. Required Preflight Checks

Run **all** before §4:

| # | Check | Command / source |
|---|-------|------------------|
| 1 | Scaffold synced | `git checkout cursor/phase1-monorepo-scaffold && git pull --ff-only` |
| 2 | Known repo HEAD | `git rev-parse HEAD` |
| 3 | Gate D founder approval | Founder explicitly marked Gate D = **YES** (§8 in [gate-d decision](./gate-d-prod-browser-smoke-decision-2026-06-28.md)) |
| 4 | public-health OK | `curl https://twin-sooty.vercel.app/api/public-health` → `status=ok`, `db_ok=true` |
| 5 | Deploy alignment | `frontend_commit` matches intended runtime baseline; wait for Vercel if mismatch |
| 6 | Safe HTTP smoke | 10/10 or 14/14 routes × 200 (curl only) |
| 7 | TypeScript | `cd frontend && npx tsc --noEmit` |
| 8 | P0 static guards | `npm run test:p0-no-headless-final-state` and related static suite |
| 9 | CI browser disabled | `smoke.yml` has no `playwright test` steps |
| 10 | No active incident | No `chrome-headless-shell` CPU storm; no deploy lag if strict alignment required |

Static guard: `npm run test:gate-d-preflight-readiness`

---

## 6. Stop Conditions

**STOP immediately** if any occur — do not claim PASS:

| Condition | Action |
|-----------|--------|
| Founder has **not** explicitly said Gate D = YES | Do not run §4 |
| `public-health` not `ok` or `db_ok=false` | Abort; fix ops first |
| Safe HTTP smoke non-200 | Abort; document route; fix before retry |
| `frontend_commit` ≠ expected SHA | Wait for Vercel deploy; re-check; do not claim PASS |
| Static gate failure (`tsc`, p0 guards) | Fix on branch; re-run static suite |
| Route timeout (>900s suite) or stuck skeleton | Abort; categorize per §7 |
| Chrome-only shell passes evaluator | Tighten evaluator; do not unblock Phase 3B |
| Auth-shell mismatch / stale JWT / logged-in chrome | Abort; configure credentials or fix shell |
| Hydration/runtime exception | Abort; shell/gate regression |
| Playwright starts local webServer despite `SKIP` flag | Abort; document harness incident |
| Script attempts Phase 3B / multitab / stress | Abort; wrong command |
| Script attempts prod mutation | Abort; out of Gate D scope |
| Any doc claims P0 **CLOSED** or launch **GO** from Gate D alone | Revert claim |

---

## 7. Failure Taxonomy

Categorize each failure when filling the [result template](./gate-d-prod-browser-smoke-result-template-2026-06-28.md):

| Code | Category | Description |
|------|----------|-------------|
| **A** | Stuck skeleton | Final state stuck on `lightweight-route-shell-skeleton` |
| **B** | Route timeout | Per-route or suite timeout exceeded |
| **C** | Chrome-only / blank content | `isChromeOnly` false PASS or blank render |
| **D** | Auth-shell mismatch | Wrong auth chrome for route persona |
| **E** | Stale JWT / logged-in chrome | Stale token shows logged-in chrome on guest route |
| **F** | Hydration/runtime exception | Client hydration error or uncaught exception |
| **G** | Route-specific data/config | Missing demo data or route config on prod |
| **H** | Prod-only config/deploy issue | Deploy lag, env mismatch, Vercel-only regression |
| **I** | Playwright harness/env issue | Wrong flags, webServer started, worker >1 |

---

## 8. Result Template

After Gate D execution (founder-approved only), copy [gate-d-prod-browser-smoke-result-template-2026-06-28.md](./gate-d-prod-browser-smoke-result-template-2026-06-28.md) and fill:

- Gate D decision, founder approval timestamp, runner
- `repo_head`, `prod_frontend_commit`, `prod_api_commit`
- public-health, HTTP smoke summary
- Exact command, base URL, workers, total routes (36)
- Pass / fail counts, duration, slowest routes
- Failure counts by taxonomy (A–I)
- Traces/screenshots/log path
- Gate E recommendation (separate founder decision)
- P0 stance (**OPEN** unless separate closure process)
- Launch stance (**NO-GO** unless separate founder GO)

Save completed record as `docs/gate-d-prod-browser-smoke-result-YYYY-MM-DD.md` — **not** the template file.

---

## 9. After PASS

If Gate D prod browser smoke **PASS** (36/36):

1. Create `docs/gate-d-prod-browser-smoke-result-YYYY-MM-DD.md` from template — **do not** edit template in place.
2. Update [LAUNCH_READINESS_EVIDENCE_INDEX](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md) runtime/evidence sections with run-time alignment.
3. Update [SLICE12 checklist](./SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md) Gate D row — still requires founder sign-off on meaning of PASS.

**Explicit non-claims (must remain true after PASS):**

- **P0 performance:** remains **OPEN** — Phase 3B prod PASS + RSS validation still required
- **Public launch:** remains **NO-GO**
- **Gate E / Phase 3B:** remains **PENDING** — Gate E requires **separate** founder YES; does **not** auto-unblock
- **Default CI:** Playwright remains **DISABLED** in `smoke.yml`

---

## 10. After FAIL

If Gate D prod browser smoke **FAIL** or **ABORTED**:

1. **Do not** proceed to Gate E or Phase 3B.
2. **Do not** close P0 or claim launch GO.
3. Categorize failures per §7 taxonomy.
4. Create targeted fix branch (shell/gate/auth/deploy as indicated).
5. Re-run static guards on fix branch.
6. Re-run Gate D §4 command only after fix + founder-approved retry if needed.

**Rollback stance:** Gate D FAIL does not revert Gate B/C merges; it blocks Gate E and keeps P0 **OPEN**, launch **NO-GO**, Phase 3B **BLOCKED**.

---

## Explicit Non-Claims

- **Gate D prod browser:** **NOT EXECUTED** in this preflight package
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate E / Phase 3B:** **PENDING / HARD BLOCKED**
- **Default CI browser:** **DISABLED**

---

## Verification (this PR)

```bash
cd /Users/tomek/Projects/twin
test -f docs/gate-d-prod-browser-smoke-preflight-2026-06-28.md
test -f docs/gate-d-prod-browser-smoke-result-template-2026-06-28.md
cd frontend && \
  npx tsc --noEmit && \
  npm run test:gate-d-preflight-readiness && \
  npm run test:launch-readiness-evidence-guard && \
  npm run test:p0-no-headless-final-state && \
  npm run test:phase3b-controlled-multitab && \
  npm run test:p0-browser-memory-multitab-performance && \
  npm run build
```

**Not run:** prod browser (Gate D execution), Phase 3B (Gate E), multitab stress.

**Public launch: NO-GO · P0: OPEN · Gate D/E: PENDING · Phase 3B: HARD BLOCKED**
