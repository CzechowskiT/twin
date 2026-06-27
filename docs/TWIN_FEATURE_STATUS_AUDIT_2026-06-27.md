# TWIN Feature Status Audit — 2026-06-27

Evidence-only inventory of persona workspace module cards vs the System-of-Record (SoR) navigation registry. **Public launch remains NO-GO.** No runtime changes in this slice.

**Related:** [SYSTEM_OF_RECORD_NAVIGATION_HUB_2026-06-17.md](./SYSTEM_OF_RECORD_NAVIGATION_HUB_2026-06-17.md) · [P0_ALL_PERSONA_NAVIGATION_ROUTE_AUDIT_2026-06-16.md](./P0_ALL_PERSONA_NAVIGATION_ROUTE_AUDIT_2026-06-16.md) · [P0_PERFORMANCE_INVENTORY_2026-06-27.md](./P0_PERFORMANCE_INVENTORY_2026-06-27.md) · [PRODUCTION_REALITY_MATRIX_2026-05-27.md](./PRODUCTION_REALITY_MATRIX_2026-05-27.md)

---

## Deploy / alignment snapshot

| Field | Value |
|-------|-------|
| **repo_head** | `ea8c1dcff54c76a662440c17067622113fb7b211` (`ea8c1dc`) |
| **prod_frontend_commit** | `ea8c1dcff54c76a662440c17067622113fb7b211` |
| **prod_api_commit** | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (`6d6d1e5`) |
| **alignment_status** | **frontend aligned**; API drift **expected** (frontend-only batches #309–#310) |
| **public-health** | `status=ok`, `db_ok=true` (post-#310 deploy closure) |

---

## Launch stance

| Gate | Status |
|------|--------|
| **Public launch** | **NO-GO** |
| **P0 performance / navigation** | **OPEN** |
| **Phase 3B controlled multitab** | **BLOCKED** (founder STOP) |

**Code constant:** `LAUNCH_STANCE = "noGo"` in `frontend/src/lib/investor-metrics-reality.ts` — re-exported by board readiness modules (`working-features-readiness.ts`, `board-implementation-tracker.ts`, etc.). UI marker: `investor-launch-stance-no-go`.

Do not infer launch readiness from card badges, hub completeness, or static test PASS alone.

---

## Architecture (navigation truth layers)

### Layer 1 — `SYSTEM_OF_RECORD_ROUTES` (79 entries)

**Source:** `frontend/src/lib/system-of-record-routes.ts`

| Persona | SoR entries | Notes |
|---------|-------------|-------|
| Candidate | 22 | Includes 11 trust-center sub-routes |
| Recruiter | 21 | Heavy demo-journey coverage; **no** `/recruiter/pipeline` or `/recruiter/calendar` |
| Company | 17 | Demo pipeline + roles; **no** `/company/pipeline` |
| Investor | 19 | Includes 6 `/board/*` readiness routes + 3 investor proof deep-links |

Each entry carries: `id`, `persona`, `href`, i18n keys, `status`, `moduleFamily`, `boundaryTags[]`.

### Layer 2 — Persona workspace module grids

| Persona | Registry | Hub surface |
|---------|----------|-------------|
| Candidate | `candidate-workspace-modules.ts` (12 cards) | `/dashboard` → `CandidateModuleNav` |
| Recruiter | `recruiter-workspace-modules.ts` (15 cards) | `/recruiter` → `WorkspaceModuleGrid` |
| Company | `company-workspace-modules.ts` (9 cards) | `/company/dashboard` |
| Investor | `investor-workspace-modules.ts` (6) + public preview (2) | `/workspace/investor`, `/investor` |

### Layer 3 — Status & boundary UX

| Component | Role |
|-----------|------|
| `WorkspaceStatusBadge` | Renders honest tier: `live` / `pilot` / `not_live` / `needs_setup` / `paused` / `planned` |
| `SystemOfRecordBoundaryBadge` | Surfaces `boundaryTags`: `pilot`, `draft_only`, `not_live`, `human_decision_required`, `no_outreach`, `no_ats_sync` |
| `SystemOfRecordModuleCard` | SoR hub card = status badge + boundary badges + optional `hintKey` |
| `WorkspaceModuleCard` | Workspace grid card = status badge only (no boundary tags) |

### Legacy / workspace-only modules (not in SoR)

These routes resolve via `page.tsx` and appear in `*-workspace-modules.ts` or deep-link guards (`persona-module-routes.ts`) but are **absent from `SYSTEM_OF_RECORD_ROUTES`** — invisible to SoR hub QA guards:

| Module | Persona | href | WS status | Notes |
|--------|---------|------|-----------|-------|
| `pipeline` | recruiter | `/recruiter/pipeline` | live | Primary ATS-lite surface |
| `calendar` | recruiter | `/recruiter/calendar` | not_live | Explicit NOT LIVE |
| `pipeline` | company | `/company/pipeline` | live | Company ATS-lite |
| `settings` | company | `/company/dashboard` | needs_setup | Orphan card → dashboard |
| `career_compass` | candidate | `/dashboard/career` | live | Career preview |
| `notes_scorecards` | recruiter | `/recruiter/inbox` | live | Duplicate CTA to inbox |
| `scheduling` | recruiter | `/recruiter/inbox` | pilot | Duplicate CTA to inbox |
| `audit` | recruiter | `/recruiter/inbox` | pilot | Duplicate CTA to inbox |

**Deprecated chrome (not module cards):** `header.tsx` → `@deprecated Use ChromeHeader`; `app-header.tsx` → `@deprecated Use WorkspaceHeader`. Kept for legacy imports only.

### Board routes (13 `page.tsx` under `/board/*`)

SoR lists **6** board entries under investor persona; **7 additional board pages** exist as operational/evidence monitors without SoR cards:

| Route | In SoR? | Purpose |
|-------|---------|---------|
| `/board/working-features-readiness` | ✅ | Feature readiness evidence |
| `/board/working-data-readiness` | ✅ | Data readiness evidence |
| `/board/implementation-tracker` | ✅ | Implementation tracker |
| `/board/production-persistence-status` | ✅ | Production persistence status |
| `/board/first-working-persistence-plan` | ✅ | First working persistence plan |
| `/board/audit-event-foundation` | ✅ | Audit event foundation |
| `/board/persistence-operations-monitor` | ❌ | Cross-persona ops monitor |
| `/board/placement-verification` | ❌ | Placement evidence monitor |
| `/board/calendar-readiness` | ❌ | Calendar OAuth readiness |
| `/board/microsoft-busy-read-staging-checklist` | ❌ | Microsoft busy-read staging |
| `/board/offer-readiness` | ❌ | Offer readiness monitor |
| `/board/scheduling-proposal` | ❌ | Scheduling proposal monitor |
| `/board/hiring-journey` | ❌ | Cross-persona hiring journey |

**Classification legend (this audit):**

| Class | Meaning |
|-------|---------|
| **WORKING** | Route resolves; core interaction works with real or scoped workspace data |
| **READ_ONLY_WORKING** | Page loads; preview/demo/read-only; no mutating production workflow |
| **PILOT_LIMITED** | Shipped pilot with explicit boundaries (`pilot` badge and/or boundary tags) |
| **PLACEHOLDER** | Route exists; thin or stub UI; not a complete module |
| **BLOCKED** | `not_live`, `needs_setup`, `paused`, or policy-blocked (`no_outreach`, founder STOP) |
| **MISLEADING_OR_RISKY** | Badge/copy/href mismatch; duplicate cards to same URL; live claim without scope hint |

---

## Registry drift summary (SoR ↔ workspace-modules)

| Gap | Workspace-modules | SoR registry | Risk |
|-----|-------------------|--------------|------|
| Recruiter pipeline | `pipeline` **live** → `/recruiter/pipeline` | **Absent** (only `recruiter_jobs` + demo pipeline) | SoR hub omits primary ATS-lite surface |
| Recruiter calendar | `calendar` **not_live** → `/recruiter/calendar` | **Absent** | Hidden from SoR QA guards |
| Company pipeline | `pipeline` **live** → `/company/pipeline` | **Absent** (only demo pipeline pilot) | Company hub vs SoR mismatch |
| Company settings | `settings` **needs_setup** → dashboard | **Absent** | Orphan card |
| Candidate career compass | `career_compass` **live** → `/dashboard/career` | **Absent** | Discoverability gap in SoR |
| Candidate trust (11 routes) | Partial (trust not in WS grid) | SoR-only trust sub-routes | Two navigation surfaces diverge |
| Recruiter notes/scheduling/audit | 3 cards → same `/recruiter/inbox` | Not separate SoR entries | **MISLEADING_OR_RISKY** duplicate CTAs |
| Company dashboard SoR | — | `company_dashboard` **live**, **no `hintKey`** | Live badge without token/scope hint |

---

## Audit tables

### Candidate (workspace grid — 12 cards)

| Card ID | href | WS status | Class | Evidence / notes |
|---------|------|-----------|-------|------------------|
| profile | `/profile` | live | **WORKING** | Canonical profile; API-backed sections |
| jobs | `/dashboard/jobs` | live | **WORKING** | Distinct offers page (no panel bounce) |
| matches | `/dashboard/matches` | live | **WORKING** | Distinct matches workspace |
| career_compass | `/dashboard/career` | live | **READ_ONLY_WORKING** | Not in SoR; career preview |
| plan_payments | `/dashboard/billing` | pilot | **PILOT_LIMITED** | Stripe readiness; `not_live` boundary on plan alias |
| referrals | `/dashboard/referrals` | pilot | **PILOT_LIMITED** | Referral pilot |
| identity | `/dashboard/identity` | live | **WORKING** | Identity settings |
| calendar | `/dashboard/calendar` | live | **READ_ONLY_WORKING** | Calendar connect/read; no recruiter sync |
| applications | `/dashboard/applications` | live | **READ_ONLY_WORKING** | Transparency panel; auto-apply paused |
| evidence | `/dashboard/evidence` | live | **READ_ONLY_WORKING** | Evidence bundle preview |
| interview_prep | `/dashboard/interview-prep` | pilot | **PILOT_LIMITED** | Interview prep pilot |
| auto_apply | `/dashboard#auto-apply-readiness` | paused | **BLOCKED** | Ops pause; must stay paused |

**Candidate SoR-only (not in workspace grid):** panel, cv alias, 11 trust-center routes — mostly **PILOT_LIMITED** with `human_decision_required` / `no_outreach` / `not_live` tags.

### Recruiter (workspace grid — 15 cards)

| Card ID | href | WS status | Class | Evidence / notes |
|---------|------|-----------|-------|------------------|
| trust_review_queue | `/recruiter/trust-review-queue` | pilot | **PILOT_LIMITED** | Demo queue; human decision |
| daily_cockpit | `/recruiter/daily-cockpit` | pilot | **PILOT_LIMITED** | Operating cockpit preview |
| inbox | `/recruiter/inbox` | live | **WORKING** | Token auth; accept/decline; production-smoked |
| pipeline | `/recruiter/pipeline` | live | **WORKING** | ATS-lite stages — **missing from SoR** |
| talent_pool | `/recruiter/talent-pool` | pilot | **PILOT_LIMITED** | `no_ats_sync` |
| search | `/recruiter/search` | live | **WORKING** | Workspace pool search (pilot scope) |
| talent_radar_digest | `/recruiter/talent-radar/digest` | pilot | **PILOT_LIMITED** | Weekly digest preview |
| talent_radar | `/recruiter/talent-radar` | pilot | **PILOT_LIMITED** | `no_outreach` |
| analytics | `/recruiter/analytics` | pilot | **PILOT_LIMITED** | Analytics preview |
| integrations | `/recruiter/integrations` | pilot | **PILOT_LIMITED** | Readiness only; `no_ats_sync` |
| calendar | `/recruiter/calendar` | not_live | **BLOCKED** | Explicit NOT LIVE — **missing from SoR** |
| notes_scorecards | `/recruiter/inbox` | live | **MISLEADING_OR_RISKY** | Separate card → same inbox URL |
| scheduling | `/recruiter/inbox` | pilot | **MISLEADING_OR_RISKY** | Separate card → same inbox URL |
| audit | `/recruiter/inbox` | pilot | **MISLEADING_OR_RISKY** | Separate card → same inbox URL |
| jobs | `/recruiter/jobs` | live | **WORKING** | Job list / roles |

**Recruiter SoR-only highlights:** operational work queue, demo pipeline/profile/collab/trust/team/comm/decision-memory, ATS import readiness — mostly **PILOT_LIMITED** demo journeys.

### Company (workspace grid — 9 cards)

| Card ID | href | WS status | Class | Evidence / notes |
|---------|------|-----------|-------|------------------|
| hiring_cockpit | `/company/hiring-cockpit` | pilot | **PILOT_LIMITED** | Demo cockpit; `no_ats_sync` |
| hiring_command_center | `/company/hiring-command-center` | pilot | **PILOT_LIMITED** | Command center preview |
| roles | `/company/roles` | live | **WORKING** | Roles management |
| team | `/company/team` | pilot | **PILOT_LIMITED** | Team permissions pilot |
| pipeline | `/company/pipeline` | live | **WORKING** | Company pipeline — **missing from SoR** |
| talent_pool | `/company/talent-pool` | pilot | **PILOT_LIMITED** | `no_outreach`, `no_ats_sync` |
| billing | `/company/billing` | not_live | **BLOCKED** | Honest not_live badge |
| integrations | `/company/integrations` | pilot | **PILOT_LIMITED** | Integrations readiness |
| settings | `/company/dashboard` | needs_setup | **BLOCKED** | Needs setup; points at dashboard |

**Company SoR gaps:** `company_dashboard` marked **live** without `hintKey` (token/tenant scope not surfaced on SoR card). Demo pipeline in SoR is **pilot**, while workspace `pipeline` is **live** — status skew.

### Investor (workspace — 6 + public preview 2)

| Card ID | href | WS status | Class | Evidence / notes |
|---------|------|-----------|-------|------------------|
| metrics | `/investor/metrics` | live | **READ_ONLY_WORKING** | Metrics reality dashboard |
| roadmap | `/investor/roadmap` | live | **READ_ONLY_WORKING** | Public roadmap |
| data_room | `/investor/data-room` | pilot | **PILOT_LIMITED** | Gated data room |
| calculator | `/investor/calculator` | live | **READ_ONLY_WORKING** | Calculator tool |
| placement | `/investor/placement` | pilot | **PILOT_LIMITED** | Placement verification preview |
| contact | `mailto:contact@twin.care` | live | **WORKING** | External mailto |
| public_room | `/investor` | live | **READ_ONLY_WORKING** | Public investor room |
| login | `/login/investor` | needs_setup | **BLOCKED** | Gated entry |

**Investor SoR extras:** `/workspace/investor` hub, `/demo`, product-proof (live + boundary tags), 3 proof deep-links (pipeline/collab/ATS demo).

### Board (13 routes — 6 in SoR, 7 monitor-only)

See **Board routes (13 `page.tsx`)** in Architecture above. SoR cards under investor persona:

| Card ID | href | SoR status | boundaryTags | Class |
|---------|------|------------|--------------|-------|
| working_features_readiness | `/board/working-features-readiness` | pilot | pilot, human_decision_required, no_outreach | **READ_ONLY_WORKING** |
| working_data_readiness | `/board/working-data-readiness` | pilot | + not_live | **BLOCKED** |
| board_implementation_tracker | `/board/implementation-tracker` | pilot | + not_live | **BLOCKED** |
| production_persistence_status | `/board/production-persistence-status` | pilot | + not_live | **BLOCKED** |
| first_working_persistence_plan | `/board/first-working-persistence-plan` | pilot | + not_live | **BLOCKED** |
| audit_event_foundation | `/board/audit-event-foundation` | pilot | + not_live | **BLOCKED** |

Board cards are internal readiness/evidence surfaces — not candidate/recruiter/company product modules.

---

## Top 10 gaps (priority order)

1. **SoR ↔ workspace-modules registry drift** — two sources of truth; QA guards (`test:system-of-record-navigation-hub`) do not cover workspace-only cards.
2. **Recruiter `/recruiter/pipeline` live in workspace, absent in SoR** — primary recruiter workflow invisible in SoR hub.
3. **Recruiter `/recruiter/calendar` not_live in workspace, absent in SoR** — calendar policy not enforced in SoR registry.
4. **Company `/company/pipeline` live in workspace, absent in SoR** — company ATS-lite surface orphaned from SoR.
5. **Company `company_dashboard` SoR live without `hintKey`** — live badge without token/tenant scope hint (roles/talent_pool have hints).
6. **Recruiter duplicate cards → `/recruiter/inbox`** — notes, scheduling, audit appear as separate modules but land on same page.
7. **Candidate trust center (11 SoR routes) not in workspace grid** — ~~trust discoverability split across nav surfaces~~ **Slice 7:** single `trust_center` pilot card in workspace grid → `/dashboard/trust`.
8. **Candidate `career_compass` live in workspace, absent in SoR** — compass not in SoR inventory.
9. **Company pipeline status skew** — workspace `pipeline` **live** vs SoR `company_demo_pipeline` **pilot** only.
10. **Investor/board SoR overload** — 19 investor SoR entries mix product, board evidence, and demo proof links; hard to scan vs 6-card workspace hub.

---

## Top 5 misleading or risky cards

| Rank | Card | Why |
|------|------|-----|
| 1 | Recruiter `notes_scorecards` / `scheduling` / `audit` | Three cards, one href (`/recruiter/inbox`); implies separate modules |
| 2 | Company SoR `company_dashboard` | **Live** badge without `hintKey`; scope/token expectations unclear |
| 3 | Company workspace `pipeline` vs SoR demo pipeline | User sees **live** pipeline in company grid; SoR only lists **pilot** demo pipeline |
| 4 | Recruiter workspace `pipeline` **live** | Not listed in SoR hub — investors/founders auditing SoR underestimate recruiter maturity |
| 5 | Investor SoR `investor_product_proof` | **Live** with executive proof copy; still `human_decision_required`, `no_outreach`, `no_ats_sync` — easy to over-read as production workflow |

---

## First 3 implementation slices

### Slice 1 — Docs-only (this PR) ✅

Ship `docs/TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md` with SHA snapshot, classification tables, gap list, and recommended follow-ups. **No runtime changes.**

### Slice 2 — SoR registry reconcile (next code PR)

1. Add SoR entries: `recruiter_pipeline`, `recruiter_calendar`, `company_pipeline`, `candidate_career_compass`.
2. Align statuses with workspace-modules (`recruiter_calendar` → `not_live`; company pipeline → `live`).
3. Extend `test:system-of-record-navigation-hub` assertions for new entries.
4. Optionally collapse or re-badge recruiter inbox duplicate cards in workspace-modules (separate UX PR).

### Slice 3 — Company token hints (follow-on UX PR)

1. Add `hintKey` to `company_dashboard` (and audit other company **live** SoR entries).
2. Surface tenant/token scope in `SystemOfRecordModuleCard` hint line.
3. Extend i18n + static copy guard if needed.

**First recommended path:** Slice 1 (this doc) → Slice 2 (SoR reconcile) → Slice 3 (company hints).

---

## Non-goals (this batch)

- No product / runtime / backend / API changes
- No auth weakening, auto-apply activation, outreach, calendar sync, or ATS live sync
- No shell / gate / layout rewrites (`LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceLayout`)
- No Phase 3B / browser prod smoke / multitab stress runs
- No public launch GO or “features complete” marketing claims
- No merging workspace-modules into SoR in this PR (documented only)

---

## Verification (this PR)

```bash
cd /Users/tomek/Projects/twin
git diff --check
test -f docs/TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md
cd frontend && npm run build && npx tsc --noEmit
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-27 | Initial feature status audit at scaffold `ea8c1dc` (prod FE aligned) |
| 2026-06-27 | Added LAUNCH_STANCE, legacy modules table, full board 13-route inventory |
| 2026-06-27 | Slice 2 completed by PR #312 — SoR entries for recruiter_pipeline, recruiter_calendar, company_pipeline, candidate_career_compass |
| 2026-06-27 | Slice 3 completed by PR #313 — company live SoR modules carry tenant token hints |
| 2026-06-27 | Slice 4 completed by PR #316 — collapse recruiter inbox duplicate module cards (notes_scorecards, scheduling, audit) |
| 2026-06-27 | Slice 6 completed — company workspace pipeline hintKey aligned with SoR; demo vs live copy boundaries |
| 2026-06-27 | Slice 7 completed — candidate workspace trust_center card (pilot) links to `/dashboard/trust`; no duplicate trust cards |
