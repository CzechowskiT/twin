# All workspace modules GREEN — Wave 2B Slice 1 (candidate evidence)

**Date:** 2026-07-09  
**Branch:** `feat/workspace-green-wave2b-evidence`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)  
**Wave 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md)  
**Wave 2A:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2A_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2A_2026-07-09.md)  
**Readiness flow:** [CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md](./CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md)

**Scope:** Frontend/UI visibility + docs + guard only. Uses existing `GET/POST/DELETE /api/v1/candidates/me/evidence` and verified-readiness API — no backend/API/auth/DB/env changes.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO Playwright · NO new backend

---

## 1. Wave 2B Slice 1 goal

Confirm **candidate evidence** (`evidence`, `candidate_evidence`) as **GREEN_WORKING** in workspace hub — Live badge only, honest manual-vault UX, M5 readiness checklist linked.

**Selected module:** `evidence` (`/dashboard/evidence`)

**Why GREEN_WORKING (audit):**

| Criterion | Evidence |
|-----------|----------|
| Auth flow | Redirect to `/login/candidate` when unauthenticated |
| Core action | Manual add/remove proof items via evidence API (persisted) |
| Badge | `EVIDENCE_VAULT_SHIP_STATUS = live` — no Pilot/Preview |
| Copy | Manual vault; no auto-upload, AI extraction, or verified labels |
| M5 readiness | `skill_evidence` missing item links to `/dashboard/evidence`; page has missing checklist + recruiter summary |
| Delegated apply | **OFF** — unchanged from readiness flow |

**Why not hidden:** Evidence was **already visible** in Wave 1 (10 Live candidate cards). Wave 2B closes M5 NEEDS_REVIEW classification from the green plan — formal MAKE_GREEN, not a hub restore.

---

## 2. Module change summary

| Field | Wave 1 | Wave 2B |
|-------|--------|---------|
| Hub visibility | Visible (Live) | Unchanged — confirmed GREEN |
| `GREEN_WORKSPACE_ALLOWED_IDS` candidate | includes `evidence`, `candidate_evidence` | Unchanged |
| `EVIDENCE_VAULT_SHIP_STATUS` | `live` | `live` |
| SoR `candidate_evidence` status | `live` | `live` |
| Workspace card value copy | generic | honest manual-vault wording |
| M5 checklist route | `/dashboard/evidence` | Unchanged |

---

## 3. Visibility per workspace (post Wave 2B)

| Persona | Visible (Live) | Hidden (effective) |
|---------|----------------|-------------------|
| **Candidate** | 9 hub cards (profile, jobs, matches, applications, calendar, identity, career_compass, interview_prep, **evidence**) + CV SoR | referrals, trust_center, plan_payments, auto_apply (4) |
| **Recruiter** | 5 (unchanged from Wave 2A) | 7 |
| **Company** | 3 (unchanged) | 6 |
| **Investor** | 4 (unchanged) | 2 |

**Hidden count:** Wave 1 audit = 20 card IDs; Wave 2A effective = **19**; Wave 2B effective = **19** (evidence was never hidden).

---

## 4. M5 readiness checklist

| Item | Route | API signal |
|------|-------|------------|
| Skill evidence baseline | `/dashboard/evidence` | `skill_evidence_present` |

- Dashboard checklist: `/dashboard#dashboard-readiness` — missing `skill_evidence` links to evidence vault.
- Evidence page: `CandidateReadinessFlowBanner` cross-links back to checklist.
- Local baseline: ≥2 proof types + note + source URL → readiness card shows ready (UI hint; server gate via verified-readiness API).
- **Delegated apply stays OFF** — `CANDIDATE_READINESS_DELEGATED_APPLY_ENABLED = false`.

---

## 5. Implementation files

| File | Change |
|------|--------|
| `frontend/src/lib/all-workspace-green-gate.ts` | `WAVE2B_*` exports; evidence GREEN audit constants |
| `frontend/src/lib/i18n.ts` | Honest hub card value copy (manual vault) |
| `frontend/scripts/all-workspace-modules-green-wave2b-evidence-guard.test.ts` | Static regression guard |

**Unchanged (already GREEN):** `candidate-evidence-client.tsx`, `seven-day-d2-candidate.ts`, `candidate-readiness-working-flow.ts`, `candidate-workspace-modules.ts`.

---

## 6. Tests

```bash
npm run test:all-workspace-modules-green-wave2b-evidence-guard
npm run test:all-workspace-modules-green-wave2a-guard
npm run test:all-workspace-modules-green-wave1-guard
npm run test:candidate-readiness-working-flow-guard
npm run test:seven-day-d2-candidate-guard
```

---

## 7. Launch stance footer

```
ALL_WORKSPACE_MODULES_GREEN_WAVE2B_EVIDENCE_DATE: 2026-07-09
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
WAVE2B_MAKE_GREEN_MODULE: evidence
WAVE2B_BACK_IN_HUB: true
WAVE2B_EVIDENCE_ALWAYS_IN_HUB: true
WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT: 19
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_10, recruiter_5, company_3, investor_4
NEXT_SLICE: Wave 2B Slice 2 MAKE_GREEN (recruiter pipeline M7, company dashboard M8)
```
