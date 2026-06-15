# Persona workspace navigation & premium UX — 2026-06-12

**Owner:** TWIN Persona Workspace UX Navigation and Premium UI Owner  
**Branch:** `fix/persona-workspace-navigation-premium-ux-2026-06-12`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Scope:** UX/navigation + honest readiness states — **no new feature expansion**

---

## Executive verdict

| Persona | Werdykt | Notes |
| ------- | ------- | ----- |
| **Candidate** | **PARTIAL+** | Module grid on `/dashboard`; auto-apply **PAUSED** with anchor |
| **Recruiter** | **PARTIAL+** | Hub at `/recruiter`; calendar sync **NOT LIVE** |
| **Company** | **PARTIAL+** | Module grid on dashboard; integrations/billing honest |
| **Investor** | **PARTIAL+** | Gated preview on public `/investor`; workspace hub gated |

**Controlled demo:** **PARTIAL** — founder-led only. **Public launch:** **NO-GO**.

---

## Global pattern (shipped)

| Component | Path |
| --------- | ---- |
| `WorkspaceModuleGrid` | `frontend/src/components/workspace/workspace-module-grid.tsx` |
| `WorkspaceModuleCard` | `frontend/src/components/workspace/workspace-module-card.tsx` |
| `WorkspaceStatusBadge` | `frontend/src/components/workspace/workspace-status-badge.tsx` |
| `WorkspaceQuickActions` | `frontend/src/components/workspace/workspace-quick-actions.tsx` |
| `WorkspaceModuleHub` | `frontend/src/components/workspace/workspace-module-hub.tsx` |

Status tiers: **Live / Pilot / Planned / Not live / Needs setup / Paused**

---

## Route map (updated)

| Route | Status | Notes |
| ----- | ------ | ----- |
| `/dashboard` | **LIVE** | `CandidateModuleNav` module grid |
| `/recruiter` | **LIVE** | Canonical recruiter hub (includes Talent Radar pilot tile) |
| `/recruiter/talent-radar` | **PILOT** | Sourcing Memory Agent — explainable internal resurfacing |
| `/workspace/recruiter` | **REDIRECT** | → `/recruiter` |
| `/workspace/recruiter/integrations` | **REDIRECT** | → `/recruiter/integrations` |
| `/company/dashboard` | **LIVE** | Company module grid |
| `/workspace/investor` | **LIVE** | Investor module hub (gated) |
| `/investor` | **LIVE** | Public room + gated tools preview |

---

## Hard bans — unchanged

| Ban | Status |
| --- | ------ |
| Public launch GO | **NO** |
| Auto-apply live | **PAUSED** |
| Delegated apply | **NOT LIVE** |
| Recruiter calendar sync | **NOT LIVE** |
| Fake traction / integrations / billing | **NO** |
| Auth weakening | **NO** |

---

## Test matrix

| Script | Wynik |
| ------ | ----- |
| `test:persona-dashboard-navigation` | **PASS** |
| `test:workspace-premium-empty-states` | **PASS** |
| `test:auth-login-options-ux` | **PASS** |
| `test:i18n-coverage` | **PASS** |
| `test:trust-language-guard` | **PASS** |
| `test:auth-role-choice` | **PASS** |
| `test:company-integrations-readiness-mvp` | **PASS** |
| `test:recruiter-integrations-readiness-mvp` | **PASS** |
| `npm run build` | **PASS** |
| `tsc --noEmit` | **PASS** |

---

## Login UX polish

- PL loading: **„Sprawdzamy dostępność logowania…”**
- Disabled OAuth rows show explicit reason (`login.oauthDisabledReason`)
- Active buttons when provider configured; grey rows explain why

---

## Founder smoke (manual)

1. **Candidate:** `/dashboard` → expand module grid → auto-apply card → `#auto-apply-readiness`
2. **Recruiter:** `/recruiter` → calendar card shows **Not live** → inbox CTA works
3. **Company:** `/company/dashboard` → module grid → integrations/billing badges honest
4. **Investor (unauth):** `/investor` → gated preview section visible
5. **Investor (auth):** `/workspace/investor` → full module hub
6. **Login:** `/login/candidate` → OAuth loading copy PL/EN

See also: `docs/FOUNDER_AUTHENTICATED_PERSONA_SMOKE_RUNBOOK_2026-06-12.md`

---

*Generated 2026-06-12 on `fix/persona-workspace-navigation-premium-ux-2026-06-12`.*
