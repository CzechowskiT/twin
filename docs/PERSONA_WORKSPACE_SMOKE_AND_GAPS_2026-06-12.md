# Persona workspace smoke & gaps — 2026-06-12

**Owner:** TWIN Persona Workspace Smoke and Gap Owner  
**Closure branch:** `fix/persona-audit-p0-p1-closure-2026-06-12`  
**Audit branch (baseline):** `audit/persona-workspace-smoke-and-gaps-2026-06-12`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Production FE:** https://twin-sooty.vercel.app  
**Production API:** https://twin-production-bcd9.up.railway.app  

---

## Closure summary (P0/P1 — 2026-06-12)

| # | Gap | Status | Evidence |
| - | --- | ------ | -------- |
| 1 | **P0** `test:i18n-coverage` (848 EN fallbacks) | **CLOSED** | Premium overlays regenerated (`extract-premium-tree` + delta sync); `npm run test:i18n-coverage` **PASS** |
| 2 | **P1** Auth gate blank shell | **CLOSED** | `PersonaWorkspaceGate` shows sign-in required card + redirect; `test:persona-workspace-gate-auth` |
| 3 | **P1** `/company/integrations` 404 | **CLOSED** | Readiness stub at `/company/integrations`; `test:company-integrations-readiness-mvp` |
| 4 | **P1** Founder manual smoke runbook | **CLOSED** | `docs/FOUNDER_AUTHENTICATED_PERSONA_SMOKE_RUNBOOK_2026-06-12.md` |
| 5 | **P1** Calendar #124 prod verification | **DOC** | Week events **PASS** on prod only after founder confirms no hung **Ładowanie wydarzeń…** — see runbook §5 |

**Still PARTIAL (out of scope — no new features):**

- `/recruiter/scorecard`, `/recruiter/scheduling` — inbox-embedded only (documented in runbook).
- Recruiter calendar sync — **NOT LIVE** (hard ban).
- Authenticated E2E in CI — still absent (by design).
- Market coverage ~6% — ops, not this PR.

---

## Executive verdict (post-closure)

| Persona | Werdykt | Notes |
| ------- | ------- | ----- |
| **Candidate** | **PARTIAL+** | Routes LIVE; unauth UX fixed; calendar #124 needs founder prod sign-off |
| **Recruiter** | **PARTIAL+** | Inbox/pipeline LIVE; calendar sync NOT LIVE |
| **Company** | **PARTIAL+** | Integrations readiness route added |
| **Investor** | **PARTIAL+** | Public `/investor` PASS; gated tools need founder smoke |

**Controlled demo:** **PARTIAL** — founder-led only. **Public launch:** **NO-GO**.

---

## Route inventory (updated)

| Trasa | HTTP (prod smoke) | Status |
| ----- | ----------------- | ------ |
| `/company/integrations` | 200 (post-deploy) | **PASS** — readiness stub |
| `/recruiter/scorecard` | 404 | **NOT FOUND** — use inbox |
| `/recruiter/scheduling` | 404 | **NOT FOUND** — use inbox |

---

## Test matrix (closure)

| Skrypt | Wynik |
| ------ | ----- |
| `test:i18n-coverage` | **PASS** |
| `test:persona-workspace-gate-auth` | **PASS** |
| `test:company-integrations-readiness-mvp` | **PASS** |
| `test:trust-language-guard` | (run on CI) |
| `test:candidate-calendar-week-events-loading` | CI guard; prod **PARTIAL** until founder §5 |

---

## Hard bans — unchanged

| Ban | Status |
| --- | ------ |
| Public launch GO | **NO** |
| Auto-apply | **PAUSED** |
| Delegated apply | **NOT LIVE** |
| Recruiter calendar sync | **NOT LIVE** |
| Fake traction | **NO** |
| Auth weakening | **NO** |

---

*Baseline audit detail preserved in git history on `audit/persona-workspace-smoke-and-gaps-2026-06-12`. This file tracks closure on `fix/persona-audit-p0-p1-closure-2026-06-12`.*
