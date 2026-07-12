# All workspace modules GREEN plan — 2026-07-09

> **Superseded by founder decision 2026-07-10** — see `FOUNDER_ALL_MODULES_VISIBLE_AND_GREEN_DECISION_2026-07-10.md` and `ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md`. Historical audit only.

**Type:** docs + guard only (this PR). **No mass functional changes.**  
**Branch:** `docs/all-workspace-modules-green-plan-2026-07-09`  
**Sources:** `*-workspace-modules.ts`, `system-of-record-routes.ts` (83 wpisy), `product-surface-visibility.ts`, `seven-day-d*.ts`, `product-polish-*.ts`, [Gate F review package](./GATE_F_FOUNDER_REVIEW_PACKAGE_2026-07-09.md), [D7 QA](./SEVEN_DAY_D7_FINAL_QA_2026-07-08.md), [candidate readiness flow](./CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md).

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans (this PR):** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO mass feature changes

---

## 1. Founder decision — nowe kryterium GREEN

**Zastępuje** wcześniejsze podejście „pilot-visible yellow modules” (roadmap tier z badge Pilot/Preview w hubie workspace).

| Reguła | Opis |
|--------|------|
| **GREEN_WORKING only** | Każdy moduł **widoczny** w Candidate / Recruiter / Company / Investor workspace (karta hub, primary nav, rozwinięty module nav) musi mieć status **GREEN_WORKING** — badge **Live** (lub brak ostrzegawczego badge), realny flow bez Pilot/Preview/Coming soon/Paused/Not live w UI workspace. |
| **Non-green** | Moduł żółty/pomarańczowy/czerwony → **HIDE_FROM_WORKSPACE**, **MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE** (np. `/investor/roadmap`, marketing `/for-*`), lub **INTERNAL_ONLY** (deep link / board / demo). |
| **Trasy zachowane** | Ukrycie z workspace **nie usuwa** route ani SoR wpisu — tylko warstwa widoczności (`product-surface-visibility`, flagi D2–D6). |
| **Gate F** | Ten plan **nie** ustawia Gate F YES ani Launch GO. |

**Smoke (PR #433 / authenticated 2026-07-09):** M3 checklist (profile), M5 evidence, **M7 recruiter**, **M8 company** = **NEEDS_REVIEW** — wpływa na klasyfikację MAKE_GREEN vs KEEP_GREEN.

---

## 2. Pełna inwentaryzacja (83 wpisy SoR + 39 kart workspace)

Legenda **visible in workspace:** Y = primary hub lub roadmap tier (collapsed) w `splitWorkspaceModules`; N = `hidden` / `ALWAYS_HIDDEN` / board prefix.

### 2.1 Candidate (23 SoR + 13 workspace cards)

| ID | Route | Workspace card | Visible | Badge UI | Real status | Evidence / deps | Action |
|----|-------|----------------|---------|----------|-------------|-----------------|--------|
| candidate_panel | `/dashboard` | — | Y | live | GREEN_WORKING | Auth + jobs feed; M2 PASS | KEEP_GREEN |
| profile | `/profile` | profile | Y | live | GREEN_WORKING | Real profile API | KEEP_GREEN |
| candidate_cv | `/profile/cv` | — | Y | live | GREEN_WORKING | CV upload path | KEEP_GREEN |
| jobs | `/dashboard/jobs` | jobs | Y | live | GREEN_WORKING | Scraped jobs BE | KEEP_GREEN |
| matches | `/dashboard/matches` | matches | Y | live | GREEN_WORKING | Matching BE | KEEP_GREEN |
| applications | `/dashboard/applications` | applications | Y | live | GREEN_WORKING | Applications list | KEEP_GREEN |
| calendar | `/dashboard/calendar` | calendar | Y | live | GREEN_WORKING | Google OAuth; MS coming_soon sub-UI only | KEEP_GREEN |
| identity | `/dashboard/identity` | identity | Y | live | GREEN_WORKING | Identity settings | KEEP_GREEN |
| career_compass | `/dashboard/career` | career_compass | Y | live | GREEN_WORKING | M4 PASS; career API | KEEP_GREEN |
| interview_prep | `/dashboard/interview-prep` | interview_prep | Y | live | GREEN_WORKING | Static + app context | KEEP_GREEN |
| evidence | `/dashboard/evidence` | evidence | Y | live | YELLOW_PARTIAL | M5 NEEDS_REVIEW — profile gate | MAKE_GREEN |
| candidate_plan | `/dashboard/billing` | plan_payments | N | pilot | RED_NOT_WORKING | Stripe not public; hidden | HIDE_FROM_WORKSPACE |
| referrals | `/dashboard/referrals` | referrals | Y | pilot | ORANGE_PILOT | No prod persistence | HIDE_FROM_WORKSPACE |
| trust_center | `/profile/trust` | trust_center | Y | pilot | ORANGE_PILOT | Static overview; advanced lanes not live | MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE |
| candidate_trust + 8 subflows | `/profile/trust/*` | — | N* | pilot | RED_NOT_WORKING | human_decision_required; not_live tags | INTERNAL_ONLY |
| auto_apply | `/dashboard#auto-apply-readiness` | auto_apply | N | paused | HIDDEN | M12 PAUSED copy | HIDE_FROM_WORKSPACE |

\* Trust subflows: widoczne tylko z trust hub deep link — nie w primary workspace cards.

### 2.2 Recruiter (23 SoR + 12 workspace cards)

| ID | Route | Workspace card | Visible | Badge UI | Real status | Evidence / deps | Action |
|----|-------|----------------|---------|----------|-------------|-----------------|--------|
| recruiter_hub | `/recruiter` | — | N | live | GREEN_WORKING | Hub route | HIDE_FROM_WORKSPACE |
| inbox | `/recruiter/inbox` | inbox | Y | live | GREEN_WORKING | Real inbox BE | KEEP_GREEN |
| pipeline | `/recruiter/pipeline` | pipeline | Y | live | YELLOW_PARTIAL | M7 NEEDS_REVIEW — no recruiter token in vault | MAKE_GREEN |
| jobs | `/recruiter/jobs` | jobs | Y | live | GREEN_WORKING | Jobs management | KEEP_GREEN |
| search | `/recruiter/search` | search | Y | live | GREEN_WORKING | Search API | KEEP_GREEN |
| analytics | `/recruiter/analytics` | analytics | Y | **preview** | ORANGE_PILOT | Primary nav #5 — Preview badge violates GREEN | MAKE_GREEN |
| integrations | `/recruiter/integrations` | integrations | Y | coming_soon | ORANGE_PILOT | No live ATS sync | MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE |
| calendar | `/recruiter/calendar` | calendar | N | not_live | RED_NOT_WORKING | Hidden per D3 | HIDE_FROM_WORKSPACE |
| trust_review_queue | `/recruiter/trust-review-queue` | trust_review_queue | Y | pilot | ORANGE_PILOT | Demo journey | HIDE_FROM_WORKSPACE |
| daily_cockpit | `/recruiter/daily-cockpit` | daily_cockpit | Y | pilot | ORANGE_PILOT | Ops demo | HIDE_FROM_WORKSPACE |
| talent_pool | `/recruiter/talent-pool` | talent_pool | Y | pilot | ORANGE_PILOT | Limited pilot | HIDE_FROM_WORKSPACE |
| talent_pool_import | `/recruiter/talent-pool/import` | — | N | pilot | ORANGE_PILOT | Subroute | INTERNAL_ONLY |
| talent_radar | `/recruiter/talent-radar` | talent_radar | Y | pilot | ORANGE_PILOT | Demo aggregates | HIDE_FROM_WORKSPACE |
| talent_radar_digest | `/recruiter/talent-radar/digest` | talent_radar_digest | Y | pilot | ORANGE_PILOT | Digest pilot | HIDE_FROM_WORKSPACE |
| operational_work_queue | `/recruiter/operational-work-queue` | — | N | pilot | RED_NOT_WORKING | Internal ops | INTERNAL_ONLY |
| ats_import_readiness | demo href | — | N | pilot | RED_NOT_WORKING | No ATS sync | INTERNAL_ONLY |
| demo journeys (7) | `/recruiter/.../demo-*` | — | N | pilot | ORANGE_PILOT | Sales proof deep links | INTERNAL_ONLY |

### 2.3 Company (18 SoR + 8 workspace cards)

| ID | Route | Workspace card | Visible | Badge UI | Real status | Evidence / deps | Action |
|----|-------|----------------|---------|----------|-------------|-----------------|--------|
| company_dashboard | `/company/dashboard` | — | Y | live | YELLOW_PARTIAL | M8 NEEDS_REVIEW — company login not in vault | MAKE_GREEN |
| roles | `/company/roles` | roles | Y | live | GREEN_WORKING | Roles CRUD MVP | KEEP_GREEN |
| pipeline | `/company/pipeline` | pipeline | Y | live | GREEN_WORKING | Pipeline UI | KEEP_GREEN |
| talent_pool | `/company/talent-pool` | talent_pool | Y | pilot | ORANGE_PILOT | In primary-4 — violates GREEN | HIDE_FROM_WORKSPACE |
| team | `/company/team` | team | Y | pilot | ORANGE_PILOT | Token demo | HIDE_FROM_WORKSPACE |
| hiring_cockpit | `/company/hiring-cockpit` | hiring_cockpit | Y | pilot | ORANGE_PILOT | Demo cockpit | HIDE_FROM_WORKSPACE |
| hiring_command_center | `/company/hiring-command-center` | hiring_command_center | Y | pilot | ORANGE_PILOT | Demo command | HIDE_FROM_WORKSPACE |
| integrations | `/company/integrations` | integrations | Y | coming_soon | ORANGE_PILOT | Honest no ATS | MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE |
| billing | `/company/billing` | billing | N | not_live | RED_NOT_WORKING | Stripe L | HIDE_FROM_WORKSPACE |
| candidate_trust_summary | demo route | — | N | pilot | ORANGE_PILOT | Illustrative | INTERNAL_ONLY |
| demo journeys (7) | `/company/.../demo-*` | — | N | pilot | ORANGE_PILOT | Deep link only | INTERNAL_ONLY |
| ats_import_readiness | demo href | — | N | pilot | RED_NOT_WORKING | Internal | INTERNAL_ONLY |

### 2.4 Investor (19 SoR + 7 workspace cards + 2 public preview)

| ID | Route | Workspace card | Visible | Badge UI | Real status | Evidence / deps | Action |
|----|-------|----------------|---------|----------|-------------|-----------------|--------|
| investor_public_room | `/investor` | public_room | Y* | live | GREEN_WORKING | Public preview | KEEP_GREEN |
| investor_workspace_hub | `/workspace/investor` | — | Y | live | GREEN_WORKING | Auth hub | KEEP_GREEN |
| metrics | `/investor/metrics` | metrics | Y | live | GREEN_WORKING | Controlled illustrative copy (D5) | KEEP_GREEN |
| roadmap | `/investor/roadmap` | roadmap | Y | live | GREEN_WORKING | **Target** for MOVE modules | KEEP_GREEN |
| calculator | `/investor/calculator` | calculator | Y | live | GREEN_WORKING | Illustrative model | KEEP_GREEN |
| contact | `mailto:…` | contact | Y | live | GREEN_WORKING | External mailto | KEEP_GREEN |
| data_room | `/investor/data-room` | data_room | Y | **preview** | ORANGE_PILOT | Invite-only; no signed URLs | FOUNDER_DECISION |
| placement | `/investor/placement` | placement | Y | pilot | ORANGE_PILOT | DD cohort only | HIDE_FROM_WORKSPACE |
| investor_trust_proof | `/investor/trust-proof` | — | N | pilot | ORANGE_PILOT | Roadmap tier | HIDE_FROM_WORKSPACE |
| investor_product_proof | `/investor/product-proof` | — | Y | live | YELLOW_PARTIAL | human_decision boundary | FOUNDER_DECISION |
| investor_demo | `/demo` | — | N | live | GREEN_WORKING | Public demo | INTERNAL_ONLY |
| working_features_readiness | `/board/working-features-readiness` | — | N | pilot | RED_NOT_WORKING | Board evidence | INTERNAL_ONLY |
| working_data_readiness | `/board/working-data-readiness` | — | N | pilot | RED_NOT_WORKING | Board evidence | INTERNAL_ONLY |
| board_implementation_tracker | `/board/implementation-tracker` | — | N | pilot | RED_NOT_WORKING | Board evidence | INTERNAL_ONLY |
| production_persistence_status | `/board/production-persistence-status` | — | N | pilot | RED_NOT_WORKING | Board evidence | INTERNAL_ONLY |
| first_working_persistence_plan | `/board/first-working-persistence-plan` | — | N | pilot | RED_NOT_WORKING | Board evidence | INTERNAL_ONLY |
| audit_event_foundation | `/board/audit-event-foundation` | — | N | pilot | RED_NOT_WORKING | Board evidence | INTERNAL_ONLY |
| sor proof (3) | demo hrefs | — | N | pilot | ORANGE_PILOT | Demo proof pack | INTERNAL_ONLY |
| login (public) | `/login/investor` | login | N* | preview | ORANGE_PILOT | Public preview only | MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE |

\* Public room / login — poza authenticated workspace hub; login na public investor room.

---

## 3. Model bramkowania (workspace module launch gate)

### 3.1 Definicje statusu rzeczywistego

| Status | Kryterium |
|--------|-----------|
| **GREEN_WORKING** | Auth flow OK; core user action completes with real or honest empty-state data; no Pilot/Preview/Coming soon/Paused badge in workspace; smoke PASS or documented waiver. |
| **YELLOW_PARTIAL** | Route loads; badge may say Live but smoke NEEDS_REVIEW or profile/role gate blocks happy path. |
| **ORANGE_PILOT** | Demo/seed/preview data; pilot or preview badge; limited cohort. |
| **RED_NOT_WORKING** | not_live / paused / placeholder bez real BE; lub stripe/calendar/ATS obietnica bez implementacji. |
| **HIDDEN** | Już ukryty z workspace (`ALWAYS_HIDDEN`, board prefix). |

### 3.2 Reguły widoczności workspace (post-founder)

```
IF visible_in_workspace(module):
  REQUIRE real_status == GREEN_WORKING
  REQUIRE badge_ui IN { live, none }
  FORBID badge_ui IN { pilot, preview, coming_soon, paused, not_live, needs_setup }
ELSE:
  ALLOW deep_link OR roadmap_outside OR internal_only
```

### 3.3 Mapowanie akcji minimalnych

| Action | Kiedy |
|--------|-------|
| **KEEP_GREEN** | GREEN_WORKING — utrzymaj w primary workspace |
| **MAKE_GREEN** | YELLOW_PARTIAL — dokończ smoke/BE/badge (Wave 2) |
| **HIDE_FROM_WORKSPACE** | ORANGE/RED/paused — usuń z hub/nav; route zostaje |
| **MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE** | Produktowo ważne, ale nie green — link z `/investor/roadmap` lub marketing, nie z workspace hub |
| **INTERNAL_ONLY** | Board, demo journeys, ATS import, ops queues |
| **FOUNDER_DECISION** | Data room, product proof claims, scope launch |

### 3.4 Guard techniczny (kolejne PR)

1. Rozszerzyć `product-surface-visibility.ts`: `WORKSPACE_GREEN_ONLY_MODE = true` — roadmap tier w workspace = empty.
2. Test: `splitWorkspaceModules` → `roadmap.length === 0` dla candidate/recruiter/company/investor authenticated hub.
3. `ui-product-surface-qa-guard`: zero pilot/preview badges w `D7_PRIMARY_UI_PATHS` + workspace module cards.

---

## 4. Podsumowanie liczb

```
ALL_WORKSPACE_GREEN_COUNTS: GREEN_WORKING=28, MAKE_GREEN=6, HIDE_FROM_WORKSPACE=24, MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE=8, INTERNAL_ONLY=14, FOUNDER_DECISION=3, TOTAL=83
```

| Kategoria | Liczba | Przykłady |
|-----------|--------|-----------|
| **GREEN_WORKING** (KEEP_GREEN) | 28 | candidate jobs/matches/calendar, recruiter inbox/jobs/search, company roles/pipeline, investor metrics/roadmap/calculator |
| **MAKE_GREEN** | 6 | evidence (M5), recruiter pipeline (M7), company dashboard (M8), recruiter analytics (preview→live), calendar MS sub-copy, investor product_proof boundaries |
| **HIDE_FROM_WORKSPACE** | 24 | referrals, talent_*, cockpits, placement, auto_apply, billing×2, calendars hidden, pilot demos visible w hub |
| **MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE** | 8 | trust_center, integrations×2, trust hub subflows marketing link, investor login public |
| **INTERNAL_ONLY** | 14 | board×6, working readiness×2, demo journeys packs, ATS import×2, operational queue, investor demo |
| **FOUNDER_DECISION** | 3 | data_room (signed URLs vs hide), product_proof external claims, launch surface A vs B po green pass |

**Workspace-visible non-green today (Wave 1 target):** **22** karty/moduły z Pilot/Preview/Coming soon w hub lub primary (candidate 2, recruiter 8, company 5, investor 2, plus analytics preview w primary).

**Docelowe primary limits po Wave 1–2 (tylko GREEN):**

```
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_7, recruiter_4, company_3, investor_5
```

(Redukcja vs D7 Surface A — usunięcie non-green z primary; analytics i talent_pool wypadają do hide/make.)

---

## 5. Plan wykonawczy — fale 1–4

### Wave 1 — Hide non-green from workspace (pierwszy slice implementacji)

**Cel:** Zero żółtych/pomarańczowych badge w workspace hub i module nav. **Tylko flagi widoczności** — bez zmian BE.

| Persona | Moduły do ukrycia z hub/nav |
|---------|----------------------------|
| Candidate | referrals, trust_center (card) |
| Recruiter | trust_review_queue, daily_cockpit, talent_pool, talent_radar, talent_radar_digest, integrations (card), analytics (tymczasowo hide jeśli nie MAKE_GREEN w W2) |
| Company | hiring_cockpit, hiring_command_center, team, talent_pool, integrations (card) |
| Investor | data_room, placement, trust_proof |

**Pliki:** `product-surface-visibility.ts` (przenieś ID do `ALWAYS_HIDDEN` lub nowy `WORKSPACE_NON_GREEN_HIDDEN`), `seven-day-d2`…`d5` flagi, i18n bez zmian copy na stronach.

**Acceptance:** Founder otwiera `/dashboard`, `/recruiter`, `/company/dashboard`, `/workspace/investor` — **tylko Live** karty w widocznym hubie.

**PR slice:** `feat: wave-1 hide non-green workspace modules`

### Wave 2 — MAKE_GREEN (smoke-close)

| Moduł | Praca |
|-------|-------|
| evidence | M5 re-smoke z seeded profile; checklist link PASS |
| recruiter pipeline + company dashboard | M7/M8 authenticated smoke z vault credentials |
| recruiter analytics | Badge preview→live po verify aggregates API |
| calendar | MS row stays coming_soon **inside** page, not module card |

**PR slice:** `feat: wave-2 make-green smoke-close modules`

### Wave 3 — MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE

- trust_center → sekcja na `/investor/roadmap` + opcjonalny link z marketing `/for-candidates`
- integrations (recruiter/company) → roadmap page + honest static `/for-companies`
- Usunąć „roadmap tier” z workspace — pojedynczy link „Zobacz roadmapę produktu” → `/investor/roadmap`

**PR slice:** `feat: wave-3 roadmap-outside-workspace links`

### Wave 4 — INTERNAL_ONLY + founder decisions

- Board routes: pozostają `/board/*` bez linków z investor hub (już `HIDE_BOARD_FROM_INVESTOR_DEFAULT_HUB`)
- Data room: founder wybór §2.3 [decision record](./GATE_F_FOUNDER_DECISION_RECORD_2026-07-09.md) — signed URLs / hide / placeholder
- Demo journeys: tylko `/demo` i founder-led deep links
- Guard `WORKSPACE_GREEN_ONLY_MODE` + regression w `test:all-workspace-modules-green-plan-guard`

**PR slice:** `docs: wave-4 founder decisions + green-only guard lock`

---

## 6. Relacja do Gate F i D7

| Dokument | Relacja |
|----------|---------|
| [SEVEN_DAY plan](./SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md) | Klasyfikacja ship/hide/pilot_only — **superseded** dla workspace visibility przez GREEN-only |
| [Gate F review package](./GATE_F_FOUNDER_REVIEW_PACKAGE_2026-07-09.md) | Smoke M3/M5/M7/M8 NEEDS_REVIEW wpływa na MAKE_GREEN |
| [Candidate readiness flow](./CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md) | Career/evidence/consent — ścieżki MAKE_GREEN |
| [D7 final QA](./SEVEN_DAY_D7_FINAL_QA_2026-07-08.md) | `LAUNCH_SURFACE_A` — punkt wyjścia; ten plan **zaostrza** do green-only visible |

---

## 7. Launch stance footer

**P0:** CLOSED · **Gate E:** PASS · **Gate F:** PENDING · **Launch:** NO-GO

```
ALL_WORKSPACE_MODULES_GREEN_PLAN_DATE: 2026-07-09
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
NO_MASS_FEATURE_CHANGES_THIS_PR: true
ALL_WORKSPACE_GREEN_COUNTS: GREEN_WORKING=28, MAKE_GREEN=6, HIDE_FROM_WORKSPACE=24, MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE=8, INTERNAL_ONLY=14, FOUNDER_DECISION=3, TOTAL=83
WORKSPACE_VISIBLE_NON_GREEN_CURRENT: 22
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_7, recruiter_4, company_3, investor_5
WAVE_1_RECOMMENDED_SLICE: hide non-green workspace cards (22 modules)
SUPERSEDES_WORKSPACE_RULE: pilot_visible_yellow_modules
```
