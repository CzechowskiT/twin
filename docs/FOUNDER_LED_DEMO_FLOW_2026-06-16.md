# Founder-led demo flow — 2026-06-16

**Branch:** `product/founder-led-demo-flow-2026-06-16`  
**Route:** `/demo` (public, marketing layout)

## Purpose

Lightweight product orchestration layer connecting existing TWIN surfaces into one founder-led walkthrough — not a new heavy feature. Shows TWIN as:

- candidate-first trust layer,
- organizational talent memory,
- recruiter operating cockpit,
- company talent intelligence,
- safe system-of-record direction.

## Demo structure

1. **Hero** — founder-led title, controlled walkthrough explanation, CTAs:
   - Start company demo → `/for-companies`
   - Open recruiter cockpit → `/recruiter` (auth + `?next=`)
   - Open candidate view → `/dashboard` (auth + `?next=`)
2. **Journey cards** — company memory, Talent Pool import, Talent Radar, candidate profile, decision memory, weekly digest, human decisioning.
3. **Role entry cards** — candidate, recruiter, company, investor.
4. **Safe boundaries** — no auto-apply, no auto-outreach, no hidden scraping, human recruiter decides, consent central.
5. **Interactive simulation** — existing 8-step walkthrough preserved below (`#interactive-simulation`).

## Linked routes

| Surface | Route | Gated |
| ------- | ----- | ----- |
| Homepage | `/` | Public |
| Companies entry | `/for-companies` | Public |
| Company dashboard | `/company/dashboard` | Auth |
| Company talent pool | `/company/talent-pool` | Auth |
| Recruiter hub | `/recruiter` | Auth |
| Talent Pool | `/recruiter/talent-pool` | Auth |
| Talent Pool import | `/recruiter/talent-pool/import` | Auth |
| Talent Radar | `/recruiter/talent-radar` | Auth |
| Weekly digest | `/recruiter/talent-radar/digest` | Auth |
| Recruiter inbox | `/recruiter/inbox` | Auth |
| Candidate Profile 360 (pilot) | `/recruiter/candidates/demo-candidate-001` | Auth |
| Job pipeline (pilot) | `/recruiter/jobs/demo-role-001/pipeline` | Auth |
| Company pipeline alias | `/company/roles/demo-role-001/pipeline` | Auth |
| Company Profile 360 alias | `/company/candidates/demo-candidate-001` | Auth |
| Candidate panel | `/dashboard` | Auth |
| Offers | `/dashboard/jobs` | Auth (alias) |
| Matches | `/dashboard/matches` | Auth |
| Profile | `/profile` | Auth |
| Investor preview | `/investor` | Public preview |
| Investor workspace | `/workspace/investor` | Auth |

Constants: `frontend/src/lib/founder-led-demo-routes.ts`

## Homepage Demo button

Marketing header (`headerMarketingLaneLinks`) — **Demo** → `/demo` (unchanged, validated in tests).

## Live vs planned

- **Live:** existing workspace surfaces linked above; honest status badges on modules unchanged.
- **Pilot:** Talent Pool import, Talent Radar, digest — pilot badges in product.
- **Paused / not live:** auto-apply, auto-outreach, recruiter calendar sync, live ATS sync — **not activated**.
- **Pilot (2026-06-16):** Candidate Profile 360 — sample `demo-candidate-001` only; invalid IDs → guided not-found.
- **Pilot (2026-06-17):** Job-Specific Pipeline — sample `demo-role-001` only; 7 stages; disabled stage actions; invalid IDs → guided not-found.

## Automated verification

```bash
cd frontend
npm run test:founder-led-demo-flow
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:founder-led-demo-flow-browser
```

Production smoke (gated):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:founder-led-demo-flow-browser
```

## Hard bans confirmed

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallbacks.
- No auth weakening, no test weakening.
- No auto-apply, delegated apply, outreach, calendar sync, live ATS activation.
- Moving logo remains performance-safe (#152).

## Launch & P0 stance

- **Public launch:** unchanged **NO-GO**
- **P0 performance:** unchanged **OPEN**
- **Phase 3B multitab:** unchanged **OPEN / BLOCKED**

## Related docs

- `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md`
- `docs/P0_ALL_PERSONA_NAVIGATION_ROUTE_AUDIT_2026-06-16.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`
