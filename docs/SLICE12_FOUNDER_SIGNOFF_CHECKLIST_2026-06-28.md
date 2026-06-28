# Slice 12 Founder Sign-Off Checklist — 2026-06-28

**Branch:** `fix/p0-shell-lightweight-route-2026-06-28`  
**Base:** `cursor/phase1-monorepo-scaffold` @ `23b60ed`  
**Owner:** TWIN P0 Performance / Shell Review  
**Purpose:** Founder decision checklist for Slice 12 Gates A–F — **Gate B minimal shell implementation merged 2026-06-28**.

**Canonical references:**
- [P0_SHELL_FOUNDER_REVIEW_2026-06-28.md](./P0_SHELL_FOUNDER_REVIEW_2026-06-28.md)
- [P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md](./P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md)
- [PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md](./PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md)
- [P0_PERFORMANCE_INVENTORY_2026-06-27.md](./P0_PERFORMANCE_INVENTORY_2026-06-27.md)

---

## 1. Executive Summary

| Item | Status |
|------|--------|
| **Slice 12** | **Gate B SHIPPED** — minimal `LightweightRouteShell` / `PersonaWorkspaceGate` fix merged; Gates C–F **PENDING** |
| **This checklist** | **Gate B = YES** — minimal implementation only; browser blocked until Gate C |
| **Implementation approval** | **Gate B YES** — minimal shell/gate/layout branch only; no broad refactor |
| **Public launch** | **NO-GO** |
| **P0 performance** | **OPEN** |
| **Phase 3B controlled multitab** | **HARD BLOCKED** (Gate E **PENDING**) |

Founder must complete §7 decision table before any shell/gate/layout implementation branch opens. Gate A approval merges this checklist and confirms scope — it does **not** authorize code changes.

---

## 2. Current Baseline

| Field | Value |
|-------|-------|
| **repo_head** | `23b60eddd7e1459663ecd686217c102459cf1c79` (Gate B shell fix branch base) |
| **prod_frontend_commit** | `ffc8432f5c1f04339ce56f500acd0bf50e6f8907` (public-health 2026-06-28) |
| **prod_api_commit** | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (`6d6d1e5`, PR #281) |
| **public-health** | `status=ok`, `db_ok=true` |
| **alignment_status** | **PARTIAL** — prod FE `ffc8432` ahead of Gate B merge; re-check post-deploy |
| **p0-no-headless route inventory** | **36 routes** (public 3, candidate 10, recruiter 11, company 11, board 1) |
| **Phase 3B static inventory** | **20 routes** in `PHASE3B_ALL_ROUTES` |
| **Phase 3B batches** | **7 + 7 + 6** (`PHASE3B_ROUTE_BATCHES`) |
| **Launch stance** | **NO-GO** — `LAUNCH_STANCE = "noGo"` |
| **P0 performance** | **OPEN** |
| **Phase 3B** | **HARD BLOCKED** |
| **Browser / default CI** | **Gated** — `test:e2e` DISABLED; no Playwright in `smoke.yml` |

Inventory sources:
- P0: `frontend/e2e/helpers/p0-no-headless-final-state.ts`
- Phase 3B: `frontend/e2e/helpers/phase3b-controlled-routes.ts`

---

## 3. What Gate A Means

**Gate A — Static scope confirmed**

- Founder confirms they have read the review package ([P0_SHELL_FOUNDER_REVIEW_2026-06-28.md](./P0_SHELL_FOUNDER_REVIEW_2026-06-28.md)), understand the shell/gate/layout risks, and accept that static guards are in place.
- Gate A approves merging this checklist and related docs/guards only.
- Gate A does **NOT** approve implementation of `LightweightRouteShell`, `PersonaWorkspaceGate`, or layout changes.
- Gate A does **NOT** approve browser validation (Gate C) or production smoke (Gate D).
- Gate A does **NOT** unblock Phase 3B (Gate E).
- Gate A does **NOT** change launch stance, P0 status, or auto-apply boundaries.

---

## 4. What Gate B Means

**Gate B — Implementation branch approved**

- Founder explicitly approves opening a focused implementation branch for minimal `LightweightRouteShell` / `PersonaWorkspaceGate` / workspace layout fixes.
- Suggested branch name: `fix/p0-shell-lightweight-route-2026-06-XX` — **do not create until Gate B = YES**.
- Gate B still does **NOT** approve browser validation — requires separate Gate C after static gates pass on implementation PR.
- Gate B still does **NOT** unblock Phase 3B — requires Gate E after Gates B + C success.
- Gate B still does **NOT** close P0 or change launch stance to GO.
- If Gate B = NO or PENDING, **no shell/gate/layout code changes** are permitted.

---

## 5. What Gate C Means

**Gate C — Gated browser validation approved**

- Founder explicitly approves running local browser smokes **only after** implementation PR passes §9 static gates.
- Requires explicit env flags: `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1`, `PLAYWRIGHT_ENABLE_WEBSERVER=1`.
- Commands (local only):

```bash
cd frontend
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
  npm run test:p0-no-headless-final-state-browser
```

- Never default CI. GitHub `smoke.yml` must remain Playwright-free.
- Gate C does **NOT** approve production smoke (Gate D) or Phase 3B (Gate E).

---

## 6. What Gate E Means

**Gate E — Phase 3B controlled multitab approved**

- Founder explicitly approves Phase 3B controlled multitab browser execution (20 routes, 3 batches 7+7+6).
- **Prerequisites:** Gate B = YES (shell fix merged), Gate C = YES (local browser PASS on 36 P0 routes).
- Phase 3B remains **HARD BLOCKED** until Gate E is explicitly marked **YES**.
- Gate E does **NOT** close P0 — prod Phase 3B PASS + RSS validation still required.
- Gate E does **NOT** approve public launch.

Reference: [PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md](./PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md) — **STATUS: BLOCKED, DO NOT RUN**.

---

## 7. Required YES/NO Decision Table

**Default for all gates: PENDING.** Founder must change to YES or NO explicitly.

| Gate | Question | Status | If YES → allowed next step |
|------|----------|--------|---------------------------|
| **A** | Static scope confirmed (docs + guards)? | **PENDING** | Merge checklist PR; no runtime change |
| **B** | Implementation branch approved (`LightweightRouteShell` / `PersonaWorkspaceGate`)? | **YES** | Minimal fix branch merged; §9 static gates passed |
| **C** | Gated local browser validation approved? | **PENDING** | Run `test:p0-no-headless-final-state-browser` with env flags locally only |
| **D** | Production smoke boundary approved? | **PENDING** | Run prod smoke with `PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1` |
| **E** | Phase 3B controlled multitab approved? | **PENDING** | Gated browser per Phase 3B doc (20 routes, workers=1) |
| **F** | Launch-gate re-audit approved? | **PENDING** | Re-run launch gate checklist; still requires separate founder GO for public launch |

**Founder note (2026-06-28):** Gate B approved for **minimal implementation only** — `PersonaWorkspaceGateShell`, `hasActiveSession` stale-JWT guard, lazy `OnboardingGate`. Browser validation **blocked until Gate C = YES**. Phase 3B **blocked until Gate E = YES**.

---

## 8. Founder Must Explicitly Accept These Constraints

Before marking any gate YES, founder confirms acceptance of:

- No backend, API, auth-provider, or server changes
- No DB migrations or env changes
- No live workflow activation (auto-apply, delegated apply, outreach send)
- No ATS writeback or email send
- No calendar write (Google/Microsoft)
- No payment, revenue recognition, or contract activation
- No public launch GO claim
- No P0 closure claim without Phase 3B prod proof
- No Phase 3B execution without Gate E = YES
- No browser tests in default CI (`test:e2e` remains DISABLED)
- No multitab stress or CPU-storm scripts without explicit founder approval
- Shell/gate/layout changes forbidden without Gate B = YES

---

## 9. Static Gates Required Before Any Gate B Implementation Merge

All must pass on implementation PR before merge:

```bash
cd frontend
npm run test:p0-no-headless-final-state      # 10/10 assertions
npm run test:phase3b-controlled-multitab     # 8/8 static guards
npm run test:p0-browser-memory-multitab-performance
npm run test:p0-route-weight-inventory
npm run test:p0-performance-guardrails
npm run test:hiring-journey
npm run build
npx tsc --noEmit
```

**Merge criteria:** Changes must be shell/gate/layout fixes only if Gate B approved. Route-level fixes allowed without shell touch. If shell files change → founder Gate B must be YES.

---

## 10. Stop Conditions

**STOP immediately and revert if any occur during gated work:**

| Condition | Action |
|-----------|--------|
| Route timeout (>900s suite) or stuck skeleton final state | Abort; fix route or shell before retry |
| CPU/memory storm (`chrome-headless-shell` hang, >512 MB JS heap/tab, founder RSS regression) | Abort; keep Phase 3B BLOCKED |
| Hydration/auth-shell regression (lost `next=` deep link) | Revert shell/gate change |
| Playwright exposed in default CI or `smoke.yml` | Revert; restore DISABLED stance |
| Unexpected browser execution without explicit env flags | Abort; document incident |
| Production commit mismatch during prod smoke | Wait for Vercel deploy; do not claim PASS |
| Launch/P0/Phase 3B overclaim in docs or code | Revert claim; restore NO-GO / OPEN / BLOCKED |
| False PASS (chrome-only shell passes evaluator) | Tighten evaluator; do not unblock Phase 3B |

**Rollback:** Revert implementation PR; restore Phase 3B **BLOCKED**; P0 remains **OPEN**; launch remains **NO-GO**.

---

## 11. Decision Record Template

Copy-paste and fill when founder decides:

```
Slice 12 Founder Sign-Off — Decision Record
===========================================
Founder decision date: ____________________
Approver: _________________________________

Gate A (static scope confirmed):     PENDING | YES | NO
Gate B (implementation branch):      PENDING | YES | NO
Gate C (gated local browser):        PENDING | YES | NO
Gate D (production smoke boundary):  PENDING | YES | NO
Gate E (Phase 3B multitab):          PENDING | YES | NO
Gate F (launch-gate re-audit):       PENDING | YES | NO

Notes:
_____________________________________________
_____________________________________________

Short form (for Slack/issue):
Slice 12 gates: A=___ B=___ C=___ D=___ E=___ F=___
Notes: ...
```

---

## 12. Next Prompt If Gate B = YES

Use this prompt stub only after founder explicitly marks Gate B = YES in §11:

```
Continue TWIN on cursor/phase1-monorepo-scaffold.

Gate B = YES (founder approved [date]).

Create branch: fix/p0-shell-lightweight-route-2026-06-XX

Implement minimal LightweightRouteShell / PersonaWorkspaceGate / workspace layout fixes
per docs/P0_SHELL_FOUNDER_REVIEW_2026-06-28.md §4.

Hard bans:
- NO browser unless Gate C explicitly YES
- NO Phase 3B unless Gate E explicitly YES
- NO backend/API/auth/DB/env changes
- NO launch GO or P0 closure claims
- NO default CI browser enablement

Before merge, all §9 static gates must pass.
After merge, wait for founder Gate C before any browser smoke.
```

---

## 13. Next Prompt If Gate B = NO

Use this prompt stub if founder marks Gate B = NO or leaves it PENDING:

```
Continue TWIN on cursor/phase1-monorepo-scaffold.

Gate B = NO (or PENDING) — shell implementation NOT approved.

Next batch: frontend-only safe-lane UX/navigation/readiness slice.
Pick from launch plan Slices 17+ or investor/demo polish.

Hard bans:
- NO LightweightRouteShell / PersonaWorkspaceGate / layout changes
- NO browser/headless/multitab/stress
- NO Phase 3B execution
- NO launch GO or P0 closure claims
- NO backend/API/auth/workflow/live-action changes

Run static guards only; docs + static test changes OK.
```

---

## Verification (this PR)

```bash
cd /Users/tomek/Projects/twin
test -f docs/SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md
cd frontend && \
  npm run test:p0-no-headless-final-state && \
  npm run test:phase3b-controlled-multitab && \
  npm run test:p0-browser-memory-multitab-performance && \
  npm run test:p0-route-weight-inventory && \
  npm run test:p0-performance-guardrails && \
  npm run test:hiring-journey && \
  npm run build && npx tsc --noEmit
```

**Not run:** browser smokes, Phase 3B, multitab, stress, shell implementation.

**Public launch: NO-GO · P0 performance: OPEN · Phase 3B: HARD BLOCKED · Gate B: YES · Gate C/E: PENDING**
