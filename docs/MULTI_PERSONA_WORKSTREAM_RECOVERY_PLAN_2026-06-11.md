# Multi-Persona Workstream Recovery Plan — 2026-06-11

**Program:** TWIN multi-persona MVP (candidate, recruiter, company, investor)
**Base branch:** `cursor/phase1-monorepo-scaffold`
**Scaffold HEAD (2026-06-11 post-audit):** `adfcac0` — PRs **#94–#113 merged** (except #98/#105 closed); Alembic head **`057_candidate_evidence_items`**
**Production API `git_commit` (2026-06-11):** `e48bff1` — 1 commit behind scaffold; founder redeploy pending
**Archive branch:** `wip/multi-persona-mvp-local-snapshot-2026-06-11` @ `1c35bce`
**Recovery docs branch:** `docs/multi-persona-workstream-recovery-2026-06-11`

---

## 1. Executive summary

The multi-persona MVP program was orchestrated in parallel across 20 conceptual workstreams, but **implementation landed in a single dirty working tree and 48+ overlapping stashes** rather than isolated PRs. Feature branches exist locally but **mostly have 0 commits above scaffold**; only a few have remote branches or open PRs.

**Actions taken (this recovery):**

- Frozen repo state and catalogued 89 stashes (48 multi-persona relevant).
- Archived all dirty WIP to `wip/multi-persona-mvp-local-snapshot-2026-06-11` — **no PR, no merge**.
- Reset docs branch to clean `origin/cursor/phase1-monorepo-scaffold`.
- Documented Alembic linearization strategy (scaffold head `050`, no duplicate `051`).
- Defined safe rebuild order and hot-file protection rules.

**Post-audit status (2026-06-11):** Recovery rebuild **largely complete** — PRs #84–#113 delivered persona MVPs to scaffold. **Next action:** founder prod redeploy to `adfcac0`; O7 re-drill; i18n-coverage debt; no new mega-PRs.

**Launch stance preserved:**

| Gate | Status |
|---|---|
| Public launch | **NO-GO** |
| Auto-apply | **PAUSED** |
| Delegated apply | **NOT LIVE** |
| Recruiter calendar | **NOT LIVE** |
| External invites | **0** |
| H5c/H5d | **HOLD** unless founder changes |
| Fake traction | **BANNED** |

---

## 2. Workstream status table

**Column key:**
- **Branch** — local `feature/*-2026-06-11` exists
- **Ahead** — commits above `origin/cursor/phase1-monorepo-scaffold`
- **PR** — open / merged / none
- **Scaffold** — code already on integration branch
- **WIP** — code in archive branch or stashes
- **Migration** — Alembic revision required
- **Hot** — touches i18n / inbox / premium / recruiter API / models

| # | Workstream | Branch | Ahead | PR | Scaffold | WIP/stash | Migration | Hot | Status | Next action |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|---|
| **Candidate** |
| 1 | Profile / evidence vault | yes | merged | **MERGED** (#111) | **yes** | archive ref only | yes (`057`) | yes | **MERGED** | Verify prod redeploy + i18n |
| 2 | Timeline / career CRM | yes | merged | **MERGED** (#109) | **yes** | archive ref only | unlikely | yes | **MERGED** | Verify `/dashboard/applications` on prod |
| 3 | Interview prep | yes | merged | **MERGED** (#112) | **yes** | archive ref only | unlikely | yes | **MERGED** | Verify `/dashboard/interview-prep` |
| **Recruiter** |
| 4 | Audit trail | yes | merged | **MERGED** (#94) | **yes** | archive ref only | yes (`053`) | yes | **MERGED** | Pilot scope; launch NO-GO |
| 5 | Pipeline | yes | merged | **MERGED** (#93) | **yes** | archive ref only | yes (`054`) | yes | **MERGED** | `/recruiter/pipeline` on scaffold |
| 6 | Notes / scorecards | yes | merged | **MERGED** (#104) | **yes** | archive ref only | yes (`056`) | yes | **MERGED** | Inbox integration verify |
| 7 | Message drafts | yes | merged | **MERGED** (#83) | **yes** | stash overlap | no | yes | **MERGED** | Verify i18n completeness |
| 8 | Manual scheduling | yes | merged | **MERGED** (#93) | **yes** | archive ref only | yes (`055`) | yes | **MERGED** | No outbound email; calendar NOT LIVE |
| 9 | Candidate search | yes | merged | **MERGED** (#84) | **yes** | archive ref only | unlikely | yes | **MERGED** | Workspace pool only |
| 10 | Analytics | yes | merged | **MERGED** (#107) | **yes** | archive ref only | unlikely | yes | **MERGED** | `/recruiter/analytics` |
| 11 | Integrations readiness | yes | merged | **MERGED** (#106) | **yes** | archive ref only | unlikely | yes | **MERGED** | Hub + ATS stub |
| **Company** |
| 12 | Hiring dashboard | yes | merged | **MERGED** (#102) | **yes** | archive ref only | unlikely | yes | **MERGED** | `/company/dashboard` |
| 13 | Jobs / roles management | yes | merged | **MERGED** (#89) | **yes** | archive ref only | yes (`051`) | yes | **MERGED** | `/company/roles` |
| 14 | Team / permissions | yes | merged | **MERGED** (#92) | **yes** | archive ref only | TBD | yes | **MERGED** | `/company/team` |
| 15 | Pipeline quality metrics | yes | merged | **MERGED** (#91) | **yes** | archive ref only | unlikely | yes | **MERGED** | `/company/pipeline` |
| 16 | Billing / plan / usage readiness | yes | merged | **MERGED** (#103) | **yes** | archive ref only | TBD | yes | **MERGED** | `/company/billing` |
| **Investor** |
| 17 | Investor room | yes | merged | **MERGED** (#90) | **yes** | archive ref only | no | yes | **MERGED** | `/investor` honest status |
| 18 | Metrics / reality dashboard | yes | merged | **MERGED** (prior) | **yes** | archive ref only | no | yes | **MERGED** | `/investor/metrics` |
| 19 | Roadmap / founder updates | yes | merged | **MERGED** (#85) | **yes** | stash 34, 39 | no | yes | **MERGED** | Verify only |
| 20 | Data room / request access | yes | merged | **MERGED** (#95) | **yes** | archive ref only | unlikely | yes | **MERGED** | Request-access flow |

**Summary counts:**

| Status | Count |
|---|---|
| NOT STARTED (branch only) | 0 |
| WIP ARCHIVED | 0 (delivered slices removed — archive `wip/multi-persona-mvp-local-snapshot-2026-06-11` reference only) |
| MERGED on scaffold | 20 |
| PARTIAL / ops follow-up | prod redeploy lag (`e48bff1` vs `adfcac0`); i18n-coverage debt |

---

## 3. Safe rebuild order

One branch → one PR → CI green → production smoke → **then** next workstream.

### Phase 1 — low-risk frontend / docs (investor + company shell)

| Order | Workstream | Branch name | Migration |
|---|---|---|
| 1 | **Investor Room MVP** | `feature/investor-room-mvp-2026-06-11` | none |
| 2 | Investor Metrics / Reality Dashboard | `feature/investor-metrics-reality-dashboard-2026-06-11` | none |
| 3 | Investor Roadmap / Founder Updates | already merged — skip unless gaps | none |
| 4 | Investor Data Room / Request Access | `feature/investor-data-room-request-access-2026-06-11` | none |
| 5 | Company Hiring Dashboard | `feature/company-hiring-dashboard-mvp-2026-06-11` | none |

### Phase 2 — recruiter core (backend + hot files)

| Order | Workstream | Migration revision |
|---|---|---|
| — | Company role fields | `051_company_role_fields` (merged) |
| — | Calendar access token cache | `052_calendar_access_token_cache` (merged) |
| 6 | Recruiter Audit Trail | `053_recruiter_audit_events` (merged) |
| 7 | Recruiter Pipeline | `054_recruiter_pipeline_status` (merged) |
| 8 | Recruiter Notes / Scorecards | `056_recruiter_application_scorecards` (planned) |
| 9 | Recruiter Message Drafts | verify merged — no new migration |
| 10 | Recruiter Manual Scheduling | `055_recruiter_manual_scheduling` (merged) |

### Phase 3 — candidate core

| Order | Workstream | Migration revision |
|---|---|---|
| 11 | Candidate Profile / Evidence Vault | `057_candidate_evidence_items` (planned) |
| 12 | Candidate Timeline / Career CRM | TBD |
| 13 | Candidate Interview Prep | TBD |

### Phase 4 — company expansion

| Order | Workstream |
|---|---|
| 14 | Company Jobs / Roles |
| 15 | Company Team / Permissions |
| 16 | Company Pipeline Quality Metrics |
| 17 | Company Billing / Usage Readiness |

### Phase 5 — search / analytics / integrations

| Order | Workstream |
|---|---|
| 18 | Recruiter Candidate Search (resolve open PR first) |
| 19 | Recruiter Analytics |
| 20 | Recruiter Integrations Readiness |

---

## 4. Hot-file protection rules

These files were touched by multiple parallel agents. **Violating these rules reintroduces merge conflicts and UI regressions.**

### `frontend/src/app/recruiter/inbox/recruiter-inbox-client.tsx`

- Premium inbox cards shipped via `redesign/recruiter-inbox-premium-cards-2026-06-11` (merged).
- **Do not overwrite** from archive branch or stashes (indices 1, 6, 9, 10, 14, 15, 37, etc.).
- Workstream-specific UI → new components or panels, not inbox rewrites.

### `frontend/src/lib/i18n.ts`

- No mass key dumps from WIP/stash apply.
- Add keys under workstream namespaces only (`investorRoom.*`, `recruiterAudit.*`, etc.).
- Run i18n tests / `npm run test:i18n` (or project equivalent) before PR.

### `frontend/src/lib/overlays/premium/generated/*.ts`

- Generated files — regenerate via extract tooling, do not hand-merge from stashes.
- One locale overlay per PR when possible.

### `backend/app/api/recruiter.py` + `backend/app/services/recruiter_inbox.py`

- Append routes/handlers per workstream; avoid unrelated refactors.
- Coordinate with Alembic order — models first in same PR.

### `backend/app/database/models.py`

- Model changes only with matching Alembic revision in same PR.
- Never point `down_revision` at unmerged WIP migrations.

### Alembic migrations

- Single linear head at all times (see `docs/ALEMBIC_WORKSTREAM_MIGRATION_PLAN_2026-06-11.md`).
- No duplicate revision IDs (`051` conflict resolved by sequential renumbering from `050`).

### Cross-persona isolation

- No branch may modify files belonging to another persona's MVP unless explicitly shared infrastructure (router registration, persona-access).
- Investor/company frontend workstreams must not touch recruiter inbox.

---

## 5. Next immediate PR recommendation

### Default: Option A — Investor Room MVP

| Factor | Assessment |
|---|---|
| Technical risk | **Low** — frontend/docs, no Alembic |
| Migration conflict | **None** |
| Hot file risk | Moderate (i18n only — namespace-scoped keys) |
| Product value | High — investor persona demo-ready honest status page |
| WIP reference | Archive `1c35bce`, stashes 1, 19, 30 |

**Branch:** `feature/investor-room-mvp-2026-06-11` from fresh `origin/cursor/phase1-monorepo-scaffold`
**Scope:** `/investor` honest sections (thesis, problem, wedge, demo map, personas, live/demo/not-live, roadmap, risks, founder CTA)
**Hard bans:** No fake revenue, customers, counts, fundraising claims, launch GO

### Alternative: Option B — Recruiter Audit Trail

| Factor | Assessment |
|---|---|
| Technical risk | **High** — backend + migration `051` |
| Value | High — compliance foundation for pipeline/scheduling |
| Blocker | Alembic must be first backend PR; inbox/i18n discipline required |

**Use Option B only if founder explicitly prioritizes backend recruiter foundation over investor frontend.**

---

## Hard bans (confirmed)

- NO mega-PR
- NO force-merge
- NO mixing workstreams in one PR
- NO destructive migration
- NO overwriting premium recruiter inbox UI
- NO overwriting i18n/chrome fixes
- NO public launch GO
- NO auto-apply enablement
- NO delegated apply enablement
- NO recruiter calendar live enablement
- NO fake traction / users / revenue
- NO hidden PII exposure
- NO auth/CSP/env weakening

---

## Related documents

- `docs/MULTI_PERSONA_WIP_STASH_CATALOG_2026-06-11.md` — stash index 0–47
- `docs/ALEMBIC_WORKSTREAM_MIGRATION_PLAN_2026-06-11.md` — migration linearization
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` — honest status source
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — launch gate source
