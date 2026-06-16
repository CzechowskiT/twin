# P0 workspace deep-link & multi-tab — 2026-06-16

**Branch:** `fix/p0-workspace-deeplink-multitab-performance-2026-06-16`  
**Issues:** (A) module cards opened in new tab land on generic hub; (B) multi-tab slow without automated smoke.  
**Scope:** Frontend navigation, auth gate `next` preservation, Playwright smoke — no backend, no auth weakening.

## Root causes

| # | Issue | Evidence | Fix |
| - | ----- | -------- | --- |
| 1 | **PersonaWorkspaceGate** redirected to login **without `?next=`** | Unauthenticated deep link → `/login/recruiter` → post-login generic hub | `buildAuthRedirectNext` + `loginPathWithNext` on gate + workspace layout |
| 2 | **Transient persona state** (`candidate` default) on new tab before `useLayoutEffect` | Gate saw wrong persona → `router.replace(WORKSPACE_PATH)` | `resolveEffectiveSessionPersona` — path-locked lane wins |
| 2b | **`?next=` dropped** when gate recomputed destination after redirect | Playwright: login URL missing `next` on 2nd poll tick | `lockAuthRedirectDestination` ref in gate + workspace layout |
| 3 | **Generic hub redirect** for valid module routes | `sessionPersonaHomeRedirect` fallback | `isPersonaModuleDeepLink` + `isPathAllowedForPersona` guard before hub replace |
| 4 | Module cards already `Link` but hash scroll could block plain click | `dashboard-anchor.ts` | `scrollToDashboardHash` only on `#` hrefs; modifier keys pass through |
| 5 | Multi-tab perf regression visibility | No automated concurrent-route smoke | Playwright `workspace-multitab-browser-smoke.spec.ts` (12 routes) |

## New / updated utilities

| Utility | Path | Purpose |
| ------- | ---- | ------- |
| `PERSONA_MODULE_ROUTES` | `frontend/src/lib/persona-module-routes.ts` | Canonical module hrefs per persona |
| `buildAuthRedirectNext` | `frontend/src/lib/login-redirect.ts` | Preserve pathname + query for auth |
| `lockAuthRedirectDestination` | `frontend/src/lib/login-redirect.ts` | Freeze deep-link path before `/login/*` client navigation |
| `resolveEffectiveSessionPersona` | `frontend/src/lib/persona-access.ts` | Path-locked persona for gates |

## Surfaces fixed

- `PersonaWorkspaceGate` — `next` param, effective persona, no hub bounce on allowed deep links
- `PersonaRouteGuard` — uses `resolveEffectiveSessionPersona`
- `PersonaProvider` — initial persona from path/session (not hardcoded `candidate`)
- `/workspace` layout — unauthenticated redirect with `next`
- `WorkspaceModuleCard` — `prefetch={false}`, hash scroll helper, real `Link` href

## Verification

```bash
cd frontend
npm run build
npm run test:workspace-deeplink-new-tab      # 10 static + 6 Playwright deeplink
npm run test:workspace-multitab-browser-smoke  # 9 Playwright, 12 parallel routes
npm run test:persona-workspace-gate-auth
npm run test:p0-browser-memory-multitab-performance
npm run build
```

**E2E server:** `npm run start:e2e` copies `.next/static` + `public` into standalone output (required for Playwright with `output: standalone`).

**Prod Playwright (no manual founder smoke):**

```bash
cd frontend
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:workspace-deeplink-new-tab
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:workspace-multitab-browser-smoke
```

## Launch stance

Unchanged: public **NO-GO**, auto-apply **PAUSED**, no auth relaxation.

## Related P0 (2026-06-16)

- **`docs/P0_ALL_PERSONA_NAVIGATION_ROUTE_AUDIT_2026-06-16.md`** — all-persona module href audit, candidate Oferty/Dopasowania/Profil i CV aliases, logout → `/` with Demo on homepage.

## Related docs

- `docs/P0_BROWSER_MEMORY_MULTITAB_PERFORMANCE_2026-06-16.md`
- `docs/P0_RENDERER_MEMORY_PROFILE_2026-06-16.md`
- `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` — multi-tab / module nav row
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` — workspace deeplink entry
