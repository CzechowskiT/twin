# P0 production stuck routes & renderer memory — 2026-06-16

**Branch:** `fix/p0-production-stuck-routes-renderer-memory-2026-06-16`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Production URL:** https://twin-sooty.vercel.app  
**Incident:** Founder (authenticated recruiter) opens 6+ tabs from `/recruiter` → blank dark/white screens; Chrome renderers 5–7.5 GB each, 16 GB swap. PRs #144–#148 did not resolve.

## Phase 1 — Production diagnostics (Playwright + CDP)

**Command:**

```bash
cd frontend
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  node scripts/prod-recruiter-multitab-stuck-routes-diagnostic.mjs
```

**Quick 4-route probe (unauthenticated, concurrent tabs, 2026-06-16):**

| Route | Final URL @ 30s | visibleText | shell | skeleton | auth card | redirects |
| ----- | ---------------- | ----------- | ----- | -------- | --------- | --------- |
| `/recruiter` | `/login/recruiter?next=%2Frecruiter` | **0** | false | false | false | 1 |
| `/recruiter/inbox` | `/login/recruiter?next=%2Frecruiter%2Finbox` | **0** | false | false | false | 1 |
| `/recruiter/pipeline` | `/login/recruiter?next=%2Frecruiter%2Fpipeline` | **0** | false | false | false | 1 |
| `/recruiter/talent-radar` | `/login/recruiter?next=%2Frecruiter%2Ftalent-radar` | **0** | false | false | false | 1 |

**CDP @ 5s:** `Runtime.getHeapUsage` / `Memory.getDOMCounters` failed — renderer processes at **~99% CPU**; pages detached (`page: no object with guid`). Full 10-route diagnostic hung >7 min before CDP timeout patch.

**Console / network (production baseline):** No chunk 404s on initial `domcontentloaded`; redirect preserves `?next=` correctly (1 navigation). Failure mode is **paint never completes**, not auth misrouting.

**Screenshots:** `.diagnostics/failure-*.png` when `visibleTextLength < 40` and no auth card (pre-fix production).

### Root-cause hypotheses (confirmed on prod baseline)

| # | Mechanism | Evidence | Severity |
| - | --------- | -------- | -------- |
| 1 | **`LightweightRouteShell` gates children on double-rAF** | Background tabs never run rAF → skeleton forever; login layout uses same shell | P0 |
| 2 | **`PersonaWorkspaceGate` `router.replace(loginWithNext)` on mount** | Multi-tab: each tab replaces URL → navigation churn + re-render loops | P0 |
| 3 | **Recruiter layout fully `"use client"`** | No server `loading.tsx` shell → blank until hydration | P0 |
| 4 | **Persona redirect without once-guard** | Wrong-persona `router.replace(WORKSPACE_PATH)` can repeat | P1 |
| 5 | **Renderer memory** | 10 concurrent prod tabs → 10 renderers ~300 MB+ each at 5s, CPU pegged; founder reports GB/tab with authenticated heavy trees | P0 |

## Phase 2 — Fixes (A–F)

| Fix | Change | Files |
| --- | ------ | ----- |
| **A** Minimal server/static shell | `recruiter/loading.tsx` + server `layout.tsx` wrapper | `recruiter/layout.tsx`, `recruiter/loading.tsx`, `recruiter-layout-client.tsx` |
| **B** Stop redirect loops | Remove `router.replace(loginWithNext)`; `personaRedirectedRef` once-guard | `persona-workspace-gate.tsx` |
| **C** Auth-card over immediate replace | Link CTA with `loginWithNext`; no background `replace` | `persona-workspace-gate.tsx` |
| **D** Shell not dependent on hidden-tab RAF | `useLayoutEffect` immediate paint; hidden-tab fast path | `lightweight-route-shell.tsx` |
| **E** Memory leaks | Deduper bounded (prior PR); no new unbounded Maps | `create-request-deduper.ts` (unchanged) |
| **F** Split client boundaries | Server layout → `RecruiterLayoutClient` island | `recruiter/layout.tsx`, `recruiter-layout-client.tsx` |

## Verification

```bash
cd frontend
npm run test:p0-production-stuck-route-regression    # 9 static assertions
npm run build && npx tsc --noEmit
npm run test:p0-browser-memory-multitab-performance
npm run test:workspace-deeplink-new-tab

# After deploy (gated — NOT in default CI):
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:prod-recruiter-sequential-behavioral-smoke
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:prod-recruiter-controlled-multitab-smoke
```

## Phase 3A — Sequential behavioral smoke (P0 gate)

**Spec:** `frontend/e2e/prod-recruiter-sequential-behavioral-smoke.spec.ts`  
**Jedna instancja przeglądarki, trasy sekwencyjnie (bez równoległych kart).**  
**Bramka:** `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` — nie uruchamia się w domyślnym CI.

```bash
cd frontend
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:prod-recruiter-sequential-behavioral-smoke
```

| Trasa | Status | Uwagi |
| ----- | ------ | ----- |
| 6 tras recruiter | _pending post-merge run_ | CDP heap/DOM @ 15s settle |

**P0 Phase 3A:** _pending evidence_

## Phase 3B — Controlled multitab smoke (P0 gate)

**Spec:** `frontend/e2e/prod-recruiter-controlled-multitab-smoke.spec.ts`  
**Jeden kontekst, 6 kart otwartych z opóźnieniem 500–1000 ms, checkpointy @ 15s i 30s.**

```bash
cd frontend
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:prod-recruiter-controlled-multitab-smoke
```

**PASS criteria (per tab @ 30s):**

- Treść widoczna (≥40 znaków) **lub** karta auth **lub** `lightweight-route-shell-ready`
- Brak utkniętego skeletonu @ 15s
- Brak bounce do `/workspace/candidate` / `/workspace/recruiter`
- `redirectCount ≤ 2`
- `jsHeapUsedMb < 512` (CDP `Runtime.getHeapUsage` — **nie** RSS procesu Chrome)

**Wyłączone:** brutalny 10–12 tab test (`test:prod-recruiter-multitab-stuck-routes`), `test:workspace-multitab-browser-smoke` na prod.

| Checkpoint | Status | Uwagi |
| ---------- | ------ | ----- |
| 6 tab @ 30s | _pending post-merge run_ | stagger 500–1000 ms |

**P0 Phase 3B:** _pending evidence_

### JS heap (CDP) vs RSS — disclaimer

Metryki w smoke używają **CDP `Runtime.getHeapUsage`** (JS heap V8 w rendererze Playwright/headless). **Nie mierzą RSS** procesu Chrome widocznego w Activity Monitor (founder: 5–7.5 GB/tab). PASS heap <512 MB **nie dowodzi** braku regresji GB-scale RSS przy 8–12 kartach w normalnym Chrome z sesją — wymaga osobnej walidacji po Phase 3B stable.

## P0 incident status

| Faza | Status |
| ---- | ------ |
| Phase 1 diagnostics | DONE |
| Phase 2 fixes (PR #149) | MERGED |
| Phase 3A sequential smoke | **OPEN** (pending prod run) |
| Phase 3B controlled multitab | **OPEN** (pending prod run) |
| **P0 overall** | **PARTIAL** — nie DONE dopóki 3B nie stable |

## Launch stance

Unchanged: public **NO-GO**, auto-apply **PAUSED**, no auth weakening.

## Related

- `docs/P0_BROWSER_MEMORY_MULTITAB_PERFORMANCE_2026-06-16.md`
- `docs/P0_RENDERER_MEMORY_PROFILE_2026-06-16.md`
- `docs/P0_WORKSPACE_DEEPLINK_MULTITAB_2026-06-16.md`
