# P0 Performance Inventory — 2026-06-27

Evidence-only discovery batch. **P0 performance remains OPEN.** No Phase 3B, multitab, browser stress, headless verification, or browser prod smoke was run in this slice.

**Prior inventory:** [P0_PERFORMANCE_INVENTORY_2026-06-21.md](./P0_PERFORMANCE_INVENTORY_2026-06-21.md) · **Safe evidence:** [P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md](./P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md) · **Operating context:** [TWIN_OPERATING_CONTEXT_2026-06-26.md](./TWIN_OPERATING_CONTEXT_2026-06-26.md)

---

## Deploy / alignment snapshot

| Field | Value |
|-------|-------|
| **repo_head** | `e60437aa3be2e24cf97421f69e6e4f7b6e23d2ec` (`e60437a`) |
| **prod_frontend_commit** | `50ff73d435d25259af60eae0fccb452f54010607` |
| **prod_api_commit** | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` |
| **alignment_status** | `acceptable_docs_only_drift` |
| **docs_only_drift** | **true** — diff `50ff73d..e60437a` touches only `docs/TWIN_OPERATING_CONTEXT_2026-06-26.md` (PR #303 reconcile) |
| **public-health** | HTTP 200, `status=ok`, `db_ok=true` (curl 2026-06-27) |

Frontend (Vercel) aligned with prod runtime at `50ff73d`. API at `6d6d1e5` is **expected drift** after frontend/docs-only batch #287–#303. See [PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md](./PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md).

---

## Launch stance

| Gate | Status |
|------|--------|
| **Public launch** | **NO-GO** |
| **P0 performance** | **OPEN** |
| **Phase 3B controlled multitab** | **HARD BLOCKED** (founder STOP) |

Do not claim “P0 fixed”, “performance solved”, or launch-ready performance from docs/tests alone.

---

## Full inventory table

| Route / module | Symptom | Evidence | Category | Launch-blocking | Next action | Risk |
|----------------|---------|----------|----------|-----------------|-------------|------|
| Phase 3B multitab (20 routes) | No prod proof; local ~4.6 min; prod crash + commit mismatch | [PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md](./PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md), `frontend/e2e/phase3b-controlled-multitab.spec.ts` | Multitab / memory | **YES** | Founder unblock + shell fix before rerun | High |
| Playwright default OFF | `test:e2e`, multitab smokes **DISABLED** (CPU storm 2026-06-16) | `frontend/package.json` (e.g. `test:e2e`, `test:workspace-multitab-browser-smoke`, `test:prod-recruiter-multitab-stuck-routes`) | CI / ops | **YES** (no auto browser gate) | Explicit env flags only; no CI headless yet (`P1_CI_HARDENING`) | High |
| `LightweightRouteShell` + Phase 3B heuristic | Skeleton-only could pass as PASS | [P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md](./P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md), `SLOW_PAINT_MS=4000` in e2e helpers | Shell / paint | **YES** | Founder review shell; Phase 3B blocked until fix | High |
| 8–12 Chrome tabs (founder) | 3–6 GB/renderer, tab slow | [P0_BROWSER_MEMORY_MULTITAB_PERFORMANCE_2026-06-16.md](./P0_BROWSER_MEMORY_MULTITAB_PERFORMANCE_2026-06-16.md) | Memory | **YES** | Manual multitab after Phase 3B unblock | High |
| `/dashboard` + readiness surfaces | Many panels; partial lazy-load | `frontend/scripts/p0-route-weight-inventory.test.ts`, [P0_PERFORMANCE_INVENTORY_2026-06-21.md](./P0_PERFORMANCE_INVENTORY_2026-06-21.md) | Route weight | **YES** (gate OPEN) | Deeper code-split audit | Medium |
| `/board/persistence-operations-monitor` | Multi-channel fetch aggregate | [P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md](./P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md) | Fetch fan-out | **YES** | API latency budget for live persistence fan-out | Medium |
| Placement verification (4 personas) | Timeline fetch on mount | Lazy `dynamic()` timeline — shipped (#247–#251) | Network | Partial | Verify no polling regressions | Low |
| 89-logo marketing marquee | Renderer pressure if leaked to workspace/auth | `frontend/scripts/p0-performance-guardrails.test.ts`, `PerformanceSafeMovingLogoMarquee` | Animation / DOM | **YES** if regresses | Keep guardrails on CI | Medium |
| `p0-no-headless-final-state` (36 routes) | Sequential browser ~7–18 min; auth shell OK | `frontend/e2e/p0-no-headless-final-state-browser.spec.ts`, timeout 900s | Browser smoke | **YES** | Prod smoke with flags post-deploy | Medium |
| Hiring Journey (5 routes) | In route-weight inventory (Batch 1) **and** p0-no-headless (Slice 13); browser smoke still gated | [HIRING_JOURNEY_TIMELINE_2026-06-25.md](./HIRING_JOURNEY_TIMELINE_2026-06-25.md), [TWIN_OPERATING_CONTEXT_2026-06-26.md](./TWIN_OPERATING_CONTEXT_2026-06-26.md) | Route weight | No (availability OK) | Optional gated browser smoke post-deploy | Low–medium |
| Lighthouse budgets | No signed-off numbers | [P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md](./P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md) | Metrics | **YES** | Define budgets when Phase 3B unblocked | Medium |
| Backend pytest ~325s | Slow CI | `docs/CTO_PRODUCT_TECH_AUDIT_2026-05-26.md` | CI duration | No (launch) | Parallelize pytest | Low |
| `/status` Playwright | Cookie banner flake | `docs/RESPONSIVE_QA_MATRIX_2026-05-29.md` | Flaky test | No | Strict mode fix | Low |
| CDP heap PASS vs RSS | Heap &lt;512 MB ≠ GB-scale RSS | [P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md](./P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md) | Measurement gap | **YES** | Real Chrome multitab validation (RSS, not CDP heap alone) | High |

---

## Playwright / browser smoke status

| Script | Status | Reason |
|--------|--------|--------|
| `test:e2e` | **DISABLED** | CPU storm 2026-06-16 |
| `test:workspace-multitab-browser-smoke` | **DISABLED** | Same incident |
| `test:prod-recruiter-multitab-stuck-routes` | **DISABLED** | Same incident |
| ~60 `*-browser` specs | **Gated** | Requires `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1` or `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` |
| `playwright.config.ts` | `workers: 1`, `fullyParallel: false`, webServer opt-in | Incident 2026-06-16 hardening |

**Estimated smoke duration (`workers=1`, sequential):**

| Script | Duration (approx.) |
|--------|-------------------|
| `test:hiring-journey-browser` | ~2–3 min (5 routes × `SETTLE_MS=12_000`, timeout 120s/test) |
| `test:p0-no-headless-final-state-browser` | ~7–18 min (36 routes × 12s settle, timeout 900s) |
| Phase 3B local (blocked) | ~4.6 min documented |

---

## Hiring Journey — performance subsection

**NOT solved.** Preview-only (`readiness_preview`); no live workflow engine; P0 **OPEN**; Phase 3B **HARD BLOCKED**.

### Routes

| Route | Persona |
|-------|---------|
| `/dashboard/hiring-journey` | Candidate |
| `/profile/hiring-journey` | Candidate alias |
| `/recruiter/hiring-journey` | Recruiter |
| `/company/hiring-journey` | Company |
| `/board/hiring-journey` | Board (blocked demo state) |

### Evidence (prior batches — not re-run in this doc slice)

| Check | Result |
|-------|--------|
| Prod HTTP (curl 2026-06-27) | **5/5 × 200** |
| Static guards | `npm run test:hiring-journey` — **25/25 PASS** (includes #296 forbidden-copy guard, #298 drill-in) |
| Browser smoke | **NOT RUN** in this batch — requires `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1` or `PLAYWRIGHT_ALLOW_PROD_SMOKE=1`; prior prod runs documented 5/5 when explicitly gated |
| Auth shell without session | Accepted for read-only route checks — not proof of full authenticated panel |

### Performance risks (code inspection)

1. **11 steps + cross-links + provenance drill-in** — moderate DOM; `useMemo` on `resolveHiringJourney` (OK).
2. **In** `p0-route-weight-inventory` (Batch 1, 2026-06-27) **and** `p0-no-headless-final-state` (Slice 13, 36 routes). **Not in** Phase 3B route batches (20 routes).
3. **Browser spec** — `SETTLE_MS = 12_000` × 5 routes ≈ 2–3 min sequential smoke.
4. **Board persona** — blocked state adds extra provenance blocks; monitor-only drill-in (no href churn).

Detail: [HIRING_JOURNEY_TRACEABILITY_2026-06-26.md](./HIRING_JOURNEY_TRACEABILITY_2026-06-26.md).

---

## Prior mitigations (still in force)

- Workspace/auth uses `PerformanceSafeMovingLogoMarquee` (~12 brands) — full 89-logo marquee isolated to marketing via `dynamic()`. See [P0_RENDERER_MEMORY_PROFILE_2026-06-16.md](./P0_RENDERER_MEMORY_PROFILE_2026-06-16.md).
- `PlacementEventsTimeline` lazy-loaded (`dynamic`, `ssr: false`) on placement-verification persona routes.
- `/dashboard` — `OpportunityForecast` and `ProgressDashboard` behind `dynamic()`.
- Cockpit/monitor routes memoize static demo resolvers with `useMemo`.
- No heavy polling on readiness/evidence surfaces.

---

## Remediation batches

### Batch 1 — safe-lane static guards (**covered**)

**Scope:** docs + static guardrails only. **No Phase 3B, no browser prod smoke.**

1. ~~Ship this inventory doc~~ — shipped (#304).
2. ~~Extend `p0-route-weight-inventory`~~ — 5 hiring-journey routes added; scheduling-proposal **skipped** (dedicated `test:scheduling-proposal` already guards those routes).
3. ~~Run guardrails on scaffold HEAD~~ — `test:p0-performance-guardrails`, `test:p0-route-weight-inventory`, `test:hiring-journey`.
4. ~~Cross-link from 2026-06-21 doc~~ — done.
5. Operating context §9 — no material blocker change (inventory only; P0 **OPEN**).

**P0 performance remains OPEN** — Batch 1 does not close the gate.

### Batch 1.5 — Slice 13: hiring journey → p0-no-headless (**covered**)

**Scope:** static route inventory + guards only. **No Phase 3B, no default browser CI.**

1. Add 5 hiring-journey routes to `frontend/e2e/helpers/p0-no-headless-final-state.ts` (31 → **36** routes; new `P0_CRITICAL_BOARD_ROUTES`).
2. Extend `p0-no-headless-final-state.test.ts` — all 5 present, no dupes, hiring-journey page marker, browser gated, P0 OPEN / Phase 3B HARD BLOCKED.
3. **No shell / gate / layout changes.**

**P0 performance remains OPEN** — Slice 13 does not close the gate.

### Batch 2 — post-unblock Phase 3B (not now)

**Scope:** founder review required. **Do not start until explicit unblock.**

1. Shell fix (`LightweightRouteShell` + Phase 3B paint evaluator) — founder review. See [P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md](./P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md).
2. Phase 3B static guards only → then controlled browser (local, then prod with JWT).
3. Prod sequential smokes: `test:hiring-journey-browser`, `test:p0-no-headless-final-state-browser`.
4. Lighthouse budgets + manual 8–12 tab Chrome validation (RSS, not CDP heap alone).

---

## Non-goals (this batch)

- No product / runtime / backend / API changes
- No Phase 3B / stress / headless / browser prod smoke
- No claims that P0 performance is fixed or launch-ready
- No shell / gate / layout rewrites without founder review (`LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceLayout`)
- No public launch GO or marketing spike
- No fake Lighthouse or memory numbers — quantitative Phase 3B profiling remains blocked

---

## Related docs

| Doc | Role |
|-----|------|
| [P0_CHECKLIST.md](./P0_CHECKLIST.md) | Deploy checklist |
| [P0_ALL_PERSONA_NAVIGATION_ROUTE_AUDIT_2026-06-16.md](./P0_ALL_PERSONA_NAVIGATION_ROUTE_AUDIT_2026-06-16.md) | Persona route audit |
| [P0_WORKSPACE_DEEPLINK_MULTITAB_2026-06-16.md](./P0_WORKSPACE_DEEPLINK_MULTITAB_2026-06-16.md) | Multitab incident context |
| [PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md](./PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md) | Founder launch gates |
| [PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md](./PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md) | Phase 3B verification state |

---

## Related tests

```bash
cd frontend
npm run test:p0-performance-guardrails
npm run test:p0-route-weight-inventory
npm run test:hiring-journey
npm run test:p0-renderer-memory-bundle-reduction
npm run test:performance-safe-moving-logo-marquee
# Browser (gated — NOT default CI):
# PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:hiring-journey-browser
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-28 | **Slice 13** — 5 hiring-journey routes added to `p0-no-headless-final-state` (31 → 36 routes); static guards 9/9; browser smoke remains gated; P0 **OPEN**; Phase 3B **HARD BLOCKED** |
| 2026-06-28 | **Slice 16** — Phase 3B static guard refresh: `PHASE3B_ALL_ROUTES` = **20 routes** (7+7+6 batches; reconciled from historical ~21 label); static guards 3→8; p0-no-headless **36 unchanged**; browser gated |

---

**Public launch: NO-GO · P0 performance: OPEN · Phase 3B: HARD BLOCKED**
