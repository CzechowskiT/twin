# All workspace modules GREEN — Wave 3 Slice 1 (candidate Trust Center)

**Date:** 2026-07-09  
**Branch:** `feat/workspace-green-wave3-trust-center`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)  
**Wave 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md)  
**Wave 2B Slice 4:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2B_INVESTOR_WORKSPACE_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2B_INVESTOR_WORKSPACE_2026-07-09.md)  
**PR #440 merge SHA:** `ca0670d7166441998c032d1646209cbf59aabaf1`

**Scope:** Frontend/UI + docs + guard only. No backend/API/auth/DB/env changes.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO Playwright · NO route/SoR deletion

---

## 1. Wave 3 Slice 1 goal

Move **candidate Trust Center** (`trust_center`, `/dashboard/trust`, `/profile/trust/*`) from workspace visibility to **product roadmap outside workspace** — while preserving routes, components, SoR entries, and core privacy controls in profile/settings.

**Selected module:** `trust_center` (`/profile/trust` hub card; canonical route `/dashboard/trust`)

**Previous status:** ORANGE_PILOT — static overview; advanced compliance lanes not live; Pilot badge on trust hub page.

**Why not GREEN_WORKING:**

| Criterion | Trust Center |
|-----------|--------------|
| Auth flow | Demo-candidate-001 sample only on advanced lanes |
| Core action | Overview + collapsed advanced previews — no live compliance automation |
| Badge | `TRUST_CENTER_ROADMAP_STATUS = pilot` |
| Subflows | human_decision_required; not_live tags on revoke/delete, portability, audit export |
| Self-service delete | Preview only — submit disabled, no backend write |

**Action:** `MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE`

---

## 2. Trust Center surface inventory

| Surface | Route / ID | Type | Workspace visible | Action |
|---------|------------|------|-------------------|--------|
| Hub card | `trust_center` → `/dashboard/trust` | Workspace module | **N** (Wave 1 hidden) | MOVE_TO_ROADMAP |
| Trust hub | `/dashboard/trust`, `/profile/trust` | Overview + pilot badge | Deep link only | PRESERVE |
| Trust overview | `/dashboard/trust/overview` | Preview subflow | Deep link only | PRESERVE |
| Control center | `/dashboard/trust/controls` | Preview subflow | Deep link only | PRESERVE |
| Export preview | `/dashboard/trust/export-preview` | Preview subflow | Deep link only | PRESERVE |
| Consent receipt | `/dashboard/trust/consent-receipt` | Preview subflow | Deep link only | PRESERVE |
| Audit export | `/dashboard/trust/audit-export` | Preview subflow | Deep link only | PRESERVE |
| Corrections | `/dashboard/trust/corrections` | Preview subflow | Deep link only | PRESERVE |
| Identity verification | `/dashboard/trust/identity-verification` | Preview subflow | Deep link only | PRESERVE |
| Data portability | `/dashboard/trust/portability` | Preview subflow | Deep link only | PRESERVE |
| Revoke & delete | `/dashboard/trust/revoke-delete` | Planned / not live | Deep link only | PRESERVE |
| SoR `candidate_trust` + 8 subflows | system-of-record-routes | Registry | Hidden from hub | PRESERVE |
| Profile subnav | was linking trust lanes | Primary nav | **Removed** | Green-only subnav |
| Public footer / Explore TWIN | marketing links | Roadmap anchor | Outside workspace | `/investor/roadmap#candidate-trust-center` |
| Investor roadmap section | `#candidate-trust-center` | Roadmap card | Public | NEW |
| Profile privacy controls | `/profile` section | Core privacy | Active (not Trust Center label) | KEEP |
| GDPR consent on profile | CV/audio/docs consent checkboxes | Live controls | Active | KEEP |
| Data export JSON | `/api/v1/candidates/me/export.json` | Live API | Profile subnav | KEEP |
| Privacy / terms | `/privacy`, `/terms` | Public legal | Footer + profile | KEEP |

**No Pilot/Preview/Coming Soon cards** in candidate workspace hub after Wave 3.

---

## 3. What changed vs Wave 1

| Layer | Wave 1 | Wave 3 Slice 1 |
|-------|--------|----------------|
| Hub card `trust_center` | Hidden from hub | Unchanged — still hidden |
| `GREEN_WORKSPACE_ALLOWED_IDS` candidate | Excludes `trust_center` | Unchanged |
| Profile subnav | Linked trust, billing, referrals, auto-apply | **Green-only** + privacy + roadmap link |
| Marketing trust links | `/dashboard/trust` | **Roadmap anchor** `/investor/roadmap#candidate-trust-center` |
| Investor roadmap | No trust section | **Dedicated roadmap card** |
| Profile page | No privacy section | **Privacy & consent** block (not Trust Center module) |
| Routes / SoR / components | Preserved | **Preserved** |

---

## 4. Core privacy controls (not Trust Center module)

| Control | Location | Status |
|---------|----------|--------|
| CV / audio / document processing consent | `/profile` form | Live |
| Talent pool opt-in + processing consent | `/profile` | Live |
| Identity settings | `/dashboard/identity` | Live (green hub) |
| Privacy policy | `/privacy` | Public |
| Terms | `/terms` | Public |
| Profile JSON export | Profile subnav button | Live API |
| Self-service account delete | `/dashboard/trust/revoke-delete` | **Not live** — honest copy on profile; no false claims |

---

## 5. Visibility per workspace (post Wave 3 Slice 1)

| Persona | Visible (Live) | Hidden (effective) |
|---------|----------------|-------------------|
| **Candidate** | 9 hub cards + CV SoR (unchanged) | 4 (referrals, trust_center, plan_payments, auto_apply) |
| **Recruiter** | 5 (unchanged) | 7 |
| **Company** | 3 (unchanged) | 6 |
| **Investor** | 4 (unchanged) | 2 + board/admin via D5 |

**Hidden count:** Wave 1 audit = 20 card IDs; effective = **19** (unchanged — trust_center was hidden in Wave 1).

**Candidate green hub modules:** profile, jobs, matches, applications, calendar, identity, career_compass, interview_prep, evidence (+ CV SoR).

---

## 6. Roadmap outside workspace

Trust Center is documented on:

- `/investor/roadmap#candidate-trust-center` — primary roadmap card (EN + PL)
- Public footer, Explore TWIN, mega-panel — link to roadmap anchor
- Profile subnav — “Trust Center product roadmap” link (not workspace module)
- `/for-candidates` — inherits marketing persona page; trust via public chrome roadmap links

Copy (EN):

- “Trust Center is on the product roadmap.”
- “Core privacy and consent controls remain available.”
- “Advanced trust workflows are not part of the current pilot.”

---

## 7. Implementation files

| File | Change |
|------|--------|
| `frontend/src/lib/all-workspace-green-gate.ts` | `WAVE3_*` exports; `TRUST_CENTER_ROADMAP_OUTSIDE_HREF` |
| `frontend/src/lib/seven-day-d2-candidate.ts` | `TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE` |
| `frontend/src/components/candidate-workspace-subnav.tsx` | Green-only links; privacy + roadmap |
| `frontend/src/app/profile/page.tsx` | Privacy & consent section |
| `frontend/src/lib/investor-founder-roadmap.ts` | `nextCandidateTrustCenter` roadmap item |
| `frontend/src/components/investor/investor-roadmap-founder-updates-panel.tsx` | `#candidate-trust-center` section |
| `frontend/src/lib/public-footer-sitemap-routes.ts` | Roadmap anchor href |
| `frontend/src/lib/public-explore-twin-routes.ts` | Roadmap anchor href |
| `frontend/src/lib/public-explore-mega-panel-routes.ts` | Roadmap anchor href |
| `frontend/src/lib/i18n.ts` | Wave 3 copy EN + PL |
| `frontend/scripts/all-workspace-modules-green-wave3-trust-center-guard.test.ts` | Static regression guard |

**Unchanged (preserved):** all `/dashboard/trust/*` and `/profile/trust/*` routes, `candidate-trust-center-workspace.tsx`, SoR entries, demo data.

---

## 8. Remaining Wave 3 candidates

| Module | Action | Status |
|--------|--------|--------|
| recruiter `integrations` | MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE | **Done — Wave 3 Slice 2** |
| company `integrations` | MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE | **Done — Wave 3 Slice 2** |
| investor public login preview | MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE | Planned |

---

## 9. Tests

```bash
npm run test:all-workspace-modules-green-wave3-trust-center-guard
npm run test:all-workspace-modules-green-wave2b-investor-workspace-guard
npm run test:all-workspace-modules-green-wave1-guard
npm run test:seven-day-d2-candidate-guard
npm run test:product-surface-visibility-guard
```

---

## 10. Launch stance footer

```
ALL_WORKSPACE_MODULES_GREEN_WAVE3_TRUST_CENTER_DATE: 2026-07-09
PR_440_MERGE_SHA: ca0670d7166441998c032d1646209cbf59aabaf1
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
WAVE3_MOVE_TO_ROADMAP_MODULE: trust_center
WAVE3_MOVE_TO_ROADMAP_ACTION: MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE
TRUST_CENTER_ROADMAP_OUTSIDE_HREF: /investor/roadmap#candidate-trust-center
WAVE3_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT: 19
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_10, recruiter_5, company_3, investor_4
NEXT_SLICE: Wave 3 Slice 2 — recruiter/company integrations MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE
```
