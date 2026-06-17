# Phase 3B Controlled Multitab Verification — 2026-06-17

**STATUS: BLOCKED** — merged test infra only (PR #167); **forbidden to run** until shell fix + founder review.

**Branch:** `verify/phase3b-controlled-multitab-2026-06-17`  
**Base:** `cursor/phase1-monorepo-scaffold` @ `fda7567`  
**Expected production frontend commit:** `fda75677c306aec76dbb83f65c483f8ba7cbe885`  
**Verdict:** **BLOCKED** — founder STOP. Test harness merged to `main`; verification **must not execute** until shell fix lands and founder unblocks. Prior session was **PARTIAL** (local 21/21; prod not verified). P0 **OPEN**. Launch **NO-GO** unchanged.

## Scope

Controlled Phase 3B multitab — **not** the founder 50-tab session. 21 routes in 3 batches (≤8 tabs), staggered open, 60–90s idle, CDP heap/DOM per tab. Auth shell OK; 404/blank/redirect storm NOT OK.

### Route batches

| Batch | Routes | Count |
| ----- | ------ | ----- |
| public-candidate | `/`, `/demo`, `/for-companies`, `/dashboard`, `/dashboard/jobs`, `/dashboard/matches`, `/profile` | 7 |
| recruiter | `/recruiter`, `/recruiter/candidates/demo-candidate-001`, `…/trust`, `…/team`, `…/communication`, `/recruiter/jobs/demo-role-001/pipeline`, `/recruiter/integrations/ats/import-readiness` | 7 |
| company | `/company/dashboard`, `/company/candidates/demo-candidate-001`, `…/trust`, `…/team`, `…/communication`, `/company/roles/demo-role-001/pipeline` | 6 |

### Thresholds

| Metric | Target | WARN | FAIL |
| ------ | ------ | ---- | ---- |
| JS heap (per page) | <80 MB | >120 MB | >180 MB |
| DOM nodes | <6000 | >10000 | >15000 |
| Safe marquee logo nodes (workspace/auth) | ≤27 | — | >30 or 89-logo marketing strip |
| Redirects per tab | ≤2 | — | >2 |
| public-health requests per tab | ≤4 | — | loop |
| Console errors per tab | ≤12 | — | burst |

## Commands

> **DO NOT RUN** — Phase 3B is **BLOCKED** (founder STOP). npm scripts below exist in `package.json` (PR #167) for future use only. Do not execute static, browser, or prod variants until shell fix + founder review.

```bash
cd frontend
npm run test:phase3b-controlled-multitab
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:phase3b-controlled-multitab-browser
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:phase3b-controlled-multitab-prod
```

## Implementation

| Artifact | Path |
| -------- | ---- |
| Route inventory | `frontend/e2e/helpers/phase3b-controlled-routes.ts` |
| Playwright (workers=1) | `frontend/e2e/phase3b-controlled-multitab.spec.ts` |
| Static guards (8) | `frontend/scripts/phase3b-controlled-multitab.test.ts` |

## PASS / PARTIAL / FAIL

| Verdict | Criteria |
| ------- | -------- |
| **PASS** | All routes pass; metrics within fail thresholds; prod `git_commit` matches `fda7567`; no loops |
| **PARTIAL** | Local green; prod commit mismatch or incomplete; heuristic gaps; CDP unreliable; auth-only without token |
| **FAIL** | HTTP 404; blank shell; heap/DOM fail; redirect/console/public-health/auth/marquee loops; 89-logo on workspace/auth |

---

## Polish report (20 sections)

### 1. Cel weryfikacji
Kontrolowana weryfikacja Phase 3B na buildzie `fda7567`: 21 tras w 3 partiach multitab (≤8 kart), idle 60–90s, metryki CDP heap/DOM, bez zmian shell/gate/layout.

### 2. Stan przed abortem
Utworzono branch `verify/phase3b-controlled-multitab-2026-06-17`, pliki testów e2e + static guards, skrypty npm. Lokalny build + `tsc` zielone. Test przeglądarkowy uruchomiony, przerwany w trakcie pierwszej partii prod.

### 3. Stan po wznowieniu
Odtworzono pliki testów na branchu verify @ `fda7567`. Ponowiono lokalny multitab — **3/3 partie PASS** (4.6 min). Prod — **FAIL** (crash kontekstu + mismatch commit).

### 4. Prekondycje prod
`GET /api/public-health`: `status=ok`, `git_commit=4bb425d3377c496d90970884409e5fce52197485` — **nie** `fda7567`. Vercel nie wdrożył jeszcze PR #165 (marquee readability).

### 5. Wynik lokalny (fda7567, build + webserver)
| Partia | Trasy | Status | idleMs |
| ------ | ----- | ------ | ------ |
| public-candidate | 7 | **PASS** | 86250 |
| recruiter | 7 | **PASS** | 86250 |
| company | 6 | **PASS** | 82500 |

**21/21 tras PASS.** Brak 404, redirect storm, pętli public-health/auth/marquee. Safe marquee **27 węzłów** na workspace (≤30). DOM 236–1039 (cel <6000). Marketing 89-logo **0** na workspace.

### 6. Wynik produkcyjny
- `PHASE3B_COMMIT_MISMATCH`: expected `fda7567`, actual `4bb425d`
- Partia `public-candidate`: **FAIL** po ~7.8 min — `browserContext.newPage: Target page, context or browser has been closed`
- Partie recruiter/company: **nie uruchomione**
- Gate commit: **FAIL** (oczekiwane przy mismatch)

### 7. Marquee / wydajność
Lokalnie: `safeMarqueeLogoNodes=27`, `marketingLogoNodes=0` na trasach workspace/auth — zgodne z polityką PerformanceSafeMovingLogoMarquee. `test:performance-safe-moving-logo-marquee` — 18/18 PASS.

### 8. Heurystyka treści (ograniczenie)
Wielu tras workspace: `shellSkeleton=true`, `shellReady=false`, ale `visibleTextLength` 791–1090 i `mainVisible=true` → PASS wg evaluatora. Founder review wskazał ryzyko **chrome-only pass** — wymaga `p0-no-headless-final-state` jako węższego guardrail.

### 9. Metryki CDP
Lokalnie `jsHeapUsedMb=1` (headless under-reporting); `layoutCount=null`. Traktować heap jako **niewiarygodny** w headless — PARTIAL na metrykach, nie FAIL progów.

### 10. Auth bez tokenu
`TWIN_ACCESS_TOKEN` nie ustawiony — workspace pokazuje auth shell / demo content; **akceptowalne** (PARTIAL auth-only, nie FAIL).

### 11. Bundle wymagany (lokalny)
| Test | Wynik |
| ---- | ----- |
| `test:phase3b-controlled-multitab` | 8/8 (po aktualizacji docs) |
| `test:performance-safe-moving-logo-marquee` | 18/18 |
| `test:p0-all-persona-navigation-routes` | 15/15 |
| `test:login-options-instant-render` | 12/12 |
| `test:trust-language-guard` | 4/4 |
| `npm run build` | PASS |
| `npx tsc --noEmit` | PASS |

### 12. Ryzyko CPU (chrome-headless-shell)
Prod multitab crash po długim idle sugeruje ten sam incydent co 2026-06-16. Phase 3B **nie** zastępuje sequential `p0-no-headless-final-state` smoke.

### 13. Zmiany produktowe
**Brak** — zgodnie z regułą verification-first. Root cause prod crash = infrastruktura testu + deploy lag, nie narrow fix w shell/gate.

### 14. P0 / Launch
- P0 performance: **OPEN → PARTIAL** (kontrolowany lokalny multitab + marquee bounded; prod i heurystyka nie DONE)
- Launch: **NO-GO** bez zmian
- Phase 3B: **PARTIAL**, nie PASS

### 15. Artefakty
- `frontend/.diagnostics/phase3b-controlled-multitab-{batch}.json` (lokalne, sesja 2026-06-17)
- `frontend/test-results/` — screenshoty przy FAIL prod

### 16. Następne kroki
1. Wdrożyć `fda7567` na Vercel → ponowić `test:phase3b-controlled-multitab-prod`
2. Użyć `test:p0-no-headless-final-state-browser` dla sequential chrome-only guard
3. Nie przenosić P0 na DONE bez prod PASS + founder sign-off

### 17. PR
Branch: `verify/phase3b-controlled-multitab-2026-06-17` — testy + docs only, bez zmian produktowych.

### 18. Regresja
Istniejące `test:p0-browser-memory-multitab-performance`, `test:multi-tab-performance-hardening` — bez zmian.

### 19. Podsumowanie tras (lokalne max DOM)
- `/`: 1039 DOM, 7431 znaków
- `/dashboard`: 541 DOM, safe marquee 27
- `/recruiter/candidates/demo-candidate-001`: 533 DOM
- `/company/roles/demo-role-001/pipeline`: 535 DOM

### 20. Werdykt końcowy
**PARTIAL** — lokalna kontrolowana weryfikacja Phase 3B na `fda7567` przeszła wszystkie 21 tras (marquee bounded, brak pętli, DOM w budżecie). Produkcja **nie zweryfikowana** na docelowym commicie (`4bb425d` live); prod multitab **FAIL** (crash kontekstu). Heurystyka PASS zbyt permissive dla skeleton+chrome. **Nie** oznaczać P0 DONE. Launch NO-GO bez zmian.
