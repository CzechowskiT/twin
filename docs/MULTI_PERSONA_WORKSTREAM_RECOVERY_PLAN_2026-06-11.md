# Multi-Persona Workstream Recovery Plan — 2026-06-11

**Program:** TWIN multi-persona MVP (candidate, recruiter, company, investor)
**Base branch:** `cursor/phase1-monorepo-scaffold`
**Scaffold HEAD (2026-06-11):** `cd4b698` — includes merged investor roadmap + recruiter message drafts
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

**Next action:** Rebuild **one workstream at a time** — one branch, one PR, one CI pass, one smoke — starting with **Investor Room MVP** (frontend-only, no migration risk).

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
| 1 | Profile / evidence vault | yes | 0 | none | no | yes (45, 37) | yes (`055` planned) | yes | WIP ARCHIVED | Rebuild Phase 3 after recruiter core |
| 2 | Timeline / career CRM | yes | 0 | none | no | yes (35) | unlikely | yes | WIP ARCHIVED | Rebuild Phase 3 |
| 3 | Interview prep | yes | 0 | none | no | yes (37) | unlikely | yes | WIP ARCHIVED | Rebuild Phase 3 |
| **Recruiter** |
| 4 | Audit trail | yes (clean) | 0 | none | no | yes (11, 42, 45, archive) | yes (`051` planned) | yes | WIP ARCHIVED | Rebuild Phase 2 first backend |
| 5 | Pipeline | yes | 0 | none | no | yes (45, 36, 46) | yes (`052` planned) | yes | WIP ARCHIVED | Rebuild after audit trail |
| 6 | Notes / scorecards | yes | 0 | none | no | yes (33, 45) | yes (`053` planned) | yes | WIP ARCHIVED | Rebuild after pipeline |
| 7 | Message drafts | yes | merged | **MERGED** (#83) | **yes** | stash overlap | no | yes | **PARTIAL ON SCAFFOLD** | Verify i18n completeness only |
| 8 | Manual scheduling | yes | 0 | none | no | yes (0, 12, 28, 45) | yes (`054` planned) | yes | WIP ARCHIVED | Rebuild Phase 2 |
| 9 | Candidate search | yes | 1 | **OPEN** | partial | yes (45, 41) | unlikely | yes | PARTIAL ON SCAFFOLD | Finish/rebase open PR or rebuild |
| 10 | Analytics | yes | 0 | none | no | yes (45) | unlikely | yes | WIP ARCHIVED | Rebuild Phase 5 |
| 11 | Integrations readiness | yes | 0 | none | no | yes (31, 45) | unlikely | yes | WIP ARCHIVED | Rebuild Phase 5 |
| **Company** |
| 12 | Hiring dashboard | yes | 0 | none | no | yes (16, 17, archive) | unlikely | yes | WIP ARCHIVED | Rebuild Phase 1 (#5) |
| 13 | Jobs / roles management | yes | 0 | none | no | yes (13, 18, 37) | TBD | yes | WIP ARCHIVED | Rebuild Phase 4 |
| 14 | Team / permissions | yes | 0 | none | no | yes (7, 9, 20, 21) | TBD | yes | WIP ARCHIVED | Rebuild Phase 4 |
| 15 | Pipeline quality metrics | yes | 0 | none | no | yes (10, 27, 35, archive) | unlikely | yes | WIP ARCHIVED | Rebuild Phase 4 |
| 16 | Billing / plan / usage readiness | yes | 0 | none | no | yes (4, 16, 32, archive) | TBD | yes | WIP ARCHIVED | Rebuild Phase 4 |
| **Investor** |
| 17 | Investor room | yes | 0 | none | partial (pages exist) | yes (1, 19, 30) | no | yes | **READY TO REBUILD** | **First clean implementation PR** |
| 18 | Metrics / reality dashboard | yes | 2 | **OPEN** | no | yes | no | yes | PARTIAL ON SCAFFOLD | Rebase open PR or rebuild Phase 1 |
| 19 | Roadmap / founder updates | yes | 0 | **MERGED** (#85) | **yes** | stash 34, 39 | no | yes | **PARTIAL ON SCAFFOLD** | Done — verify only |
| 20 | Data room / request access | yes | 0 | none | partial | yes (22, 25, 30) | unlikely | yes | WIP ARCHIVED | Rebuild Phase 1 (#4) |

**Summary counts:**

| Status | Count |
|---|---|
| NOT STARTED (branch only) | 0 |
| WIP ARCHIVED | 15 |
| PARTIAL ON SCAFFOLD | 4 (message drafts, roadmap, candidate search PR, metrics PR) |
| READY TO REBUILD | 1 (investor room — first target) |

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
| 6 | Recruiter Audit Trail | `051_recruiter_audit_events` |
| 7 | Recruiter Pipeline | `052_recruiter_pipeline_status` |
| 8 | Recruiter Notes / Scorecards | `053_recruiter_application_scorecards` |
| 9 | Recruiter Message Drafts | verify merged — no new migration |
| 10 | Recruiter Manual Scheduling | `054_recruiter_manual_scheduling` |

### Phase 3 — candidate core

| Order | Workstream | Migration revision |
|---|---|---|
| 11 | Candidate Profile / Evidence Vault | `055_candidate_evidence_items` |
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
