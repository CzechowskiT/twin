# All workspace modules GREEN — Wave 3 Slice 3 (investor public login preview)

**Date:** 2026-07-09  
**Branch:** `feat/workspace-green-wave3-investor-login`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)  
**Wave 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md)  
**Wave 3 Slice 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE3_TRUST_CENTER_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE3_TRUST_CENTER_2026-07-09.md)  
**Wave 3 Slice 2:** [ALL_WORKSPACE_MODULES_GREEN_WAVE3_INTEGRATIONS_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE3_INTEGRATIONS_2026-07-09.md)  
**PR #442 merge SHA:** `8335bf8523f04b6beb9b0939e795e416c9a661bc`

**Scope:** Frontend/UI + docs + guard only. No backend/API/auth/DB/env changes.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO Playwright · NO route/SoR deletion

---

## 1. Wave 3 Slice 3 goal

Move **investor public login preview** (`login`, `/login/investor`, `INVESTOR_PUBLIC_PREVIEW_MODULES`) from workspace and marketing visibility to **product roadmap outside workspace** — while preserving the route, login components, invite-only copy, and deep link.

**Selected module:** `login` (public preview card; deep link `/login/investor`)

**Previous status:** ORANGE/PREVIEW — invite-only badge on login page; marketing CTAs still pointed to `/login/investor` as primary sign-in path.

**Why not GREEN_WORKING:**

| Criterion | Investor public login |
|-----------|----------------------|
| Auth flow | Invite-only preview — no public self-service onboarding |
| Core action | Login form exists but access not publicly available |
| Badge | `preview` / invite-only — not `live` |
| Backend | No invite system, no public investor account creation |
| Data room | Request-based — not open self-serve |

**Action:** `MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE`

---

## 2. Investor login surface inventory

| Surface | Route / ID | Type | Workspace visible | Action |
|---------|------------|------|-------------------|--------|
| Public preview card `login` | `/login/investor` | Preview module | **N** | MOVE_TO_ROADMAP |
| Login deep link | `/login/investor` | Invite-only preview page | Deep link only | PRESERVE + roadmap badge |
| Investor room gated grid | was showing login card | Public room | **Removed** | Green-only modules |
| Login hub investor zone | was `/login/investor` | Auth hub card | **Roadmap anchor** | `/investor/roadmap#investor-public-login` |
| `/for-investors` marketing | primary CTA sign-in | Marketing | **Request access** | mailto + roadmap |
| `/investor` fundraising traction | sign-in link | Marketing | **Metrics + roadmap** | No login CTA |
| Explore TWIN investors group | — | Header nav | **Roadmap link** | `footerInvestorAccessRoadmap` |
| Candidate gate (investor persona) | sign-in primary | Cross-persona | **Request access** | mailto + roadmap |
| `INVESTOR_PUBLIC_PREVIEW_MODULES` | registry | Module def | Hidden from hub | PRESERVE |
| Investor roadmap | `#investor-public-login` | Roadmap card | Public | NEW |

**No Pilot/Preview/Coming Soon login cards** in investor workspace hub or public room grid after Wave 3 Slice 3.

---

## 3. What changed vs Wave 3 Slice 2

| Layer | Wave 3 Slice 2 | Wave 3 Slice 3 |
|-------|----------------|----------------|
| Investor hub quartet | metrics, roadmap, calculator, contact | **Unchanged** |
| Public preview login card | Visible when room grid expanded | **Hidden** |
| Login hub investor card | `/login/investor` | **Roadmap anchor** |
| Marketing `/for-investors` | Sign in CTAs | **Request access + roadmap** |
| Deep link `/login/investor` | Invite-only badge | **+ outside-workspace note, CTAs, roadmap link** |
| Investor roadmap | Integrations sections | **+ `#investor-public-login`** |
| Routes / components / auth | Preserved | **Preserved** |

---

## 4. Roadmap outside workspace

Investor public login is documented on:

- `/investor/roadmap#investor-public-login` — invite-only, no public self-service, data room request-based
- `/for-investors` — marketing roadmap note + anchor links
- `/login/investor` — deep link preview with invite-only badge (not workspace module)

Copy (EN):

- "Investor workspace login is on the product roadmap."
- "Access is invite-only — no public self-service onboarding."
- "Data room materials are request-based, not open self-serve."

---

## 5. Visibility per workspace (post Wave 3 Slice 3)

| Persona | Visible (Live) | Hidden (effective) |
|---------|----------------|-------------------|
| **Candidate** | 9 hub cards + CV SoR (unchanged) | 4 |
| **Recruiter** | 5 (unchanged) | 7 |
| **Company** | 3 (unchanged) | 6 |
| **Investor** | 4 (metrics, roadmap, calculator, contact) | 2 + board/admin via D5 |

**Hidden count:** Wave 1 audit = 20 card IDs; effective = **19** (unchanged — login preview was never in WAVE1_HIDDEN audit).

**Investor green hub modules:** metrics, roadmap, calculator, contact.

---

## 6. Implementation files

| File | Change |
|------|--------|
| `frontend/src/lib/all-workspace-green-gate.ts` | `WAVE3_SLICE3_*` exports; `INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF` |
| `frontend/src/lib/seven-day-d5-investor.ts` | `INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE`, `HIDE_INVESTOR_PUBLIC_LOGIN_FROM_PREVIEW`, `LOGIN_HUB_INVESTOR_ZONE_HREF` |
| `frontend/src/lib/product-surface-visibility.ts` | Hide `login` module from default hub |
| `frontend/src/app/login/investor/page.tsx` | Outside-workspace note, request access CTAs, roadmap link |
| `frontend/src/components/auth/login-zone-hub.tsx` | Investor hub card → roadmap anchor |
| `frontend/src/components/investor/investor-room-page.tsx` | Remove login from public preview grid |
| `frontend/src/components/investor/investor-roadmap-founder-updates-panel.tsx` | `#investor-public-login` section |
| `frontend/src/lib/persona-pages.ts` | Investor marketing CTAs → request access / roadmap |
| `frontend/src/components/marketing/persona-marketing-page.tsx` | Investor login roadmap marketing block |
| `frontend/src/components/marketing/investor-fundraising-page.tsx` | Metrics + roadmap links (no login CTA) |
| `frontend/src/components/candidate-workspace-gate.tsx` | Investor gate → request access |
| `frontend/src/lib/public-explore-mega-panel-routes.ts` | Explore investors → roadmap access link |
| `frontend/src/lib/investor-founder-roadmap.ts` | `nextInvestorPublicLogin` |
| `frontend/src/lib/i18n.ts` | Wave 3 investor login copy EN + PL |
| `frontend/scripts/all-workspace-modules-green-wave3-investor-login-guard.test.ts` | Static regression guard |

**Unchanged (preserved):** `/login/investor` route, `LoginZoneForm`, `INVESTOR_PUBLIC_PREVIEW_MODULES` registry, `LOGIN_PATH.investor` for auth routing, invite-only P3 copy.

---

## 7. Remaining Wave 3 candidates

| Module | Action | Status |
|--------|--------|--------|
| — | — | **Wave 3 complete** (trust center, integrations, investor login) |

---

## 8. Tests

```bash
npm run test:all-workspace-modules-green-wave3-investor-login-guard
npm run test:all-workspace-modules-green-wave3-integrations-guard
npm run test:seven-day-d5-investor-guard
npm run test:product-surface-visibility-guard
```

---

## 9. Launch stance footer

```
ALL_WORKSPACE_MODULES_GREEN_WAVE3_INVESTOR_LOGIN_DATE: 2026-07-09
PR_442_MERGE_SHA: 8335bf8523f04b6beb9b0939e795e416c9a661bc
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
WAVE3_SLICE3_MOVE_TO_ROADMAP_MODULES: investor_public_login
WAVE3_SLICE3_MOVE_TO_ROADMAP_ACTION: MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE
INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF: /investor/roadmap#investor-public-login
WAVE3_SLICE3_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT: 19
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_10, recruiter_5, company_3, investor_4
WAVE3_COMPLETE: true
```
