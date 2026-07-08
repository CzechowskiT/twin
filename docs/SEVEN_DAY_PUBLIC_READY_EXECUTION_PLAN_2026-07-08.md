# 7-dniowy plan wykonawczy: public-ready lub czyste ukrycie — 2026-07-08

**Typ PR:** docs + guard (ten PR). **Implementacja:** kolejne slice’y Cursor Day 1–7.  
**Źródła inventory:** `*-workspace-modules.ts`, `system-of-record-routes.ts` (83 wpisy), `product-surface-visibility.ts`, [Product Scope Reality Review](./PRODUCT_SCOPE_REALITY_REVIEW_2026-07-08.md).

**Cel:** Do końca **Dnia 7** każdy widoczny moduł ze statusem `pilot` | `preview` | `coming_soon` | `paused` | `not_live` | `hold` | `internal` (w UI publicznym lub hubie) jest albo **(A) działający public-ready** (prawdziwy flow lub uczciwy static preview bez fałszywej obietnicy), albo **(B) czysto ukryty/wyłączony** — bez broken promise w nav, CTA ani copy.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## 1. Klasyfikacja modułów

| Klasa | Znaczenie po Dniu 7 |
|-------|---------------------|
| **ship** | Działa public-ready (live lub uczciwy minimal viable z BE tam gdzie konieczne) |
| **roadmap** | Honest static preview — strona/CTA z jasnym badge, zero „live sync” |
| **hide** | Brak w primary nav / marketing CTA; deep link → redirect lub 404 z komunikatem |
| **pilot_only** | Tylko kohorta founder-led; `PilotPreviewBoundary` + invite deep link |
| **founder_decision** | Wymaga jawnej decyzji przed ship/hide (blokuje slice) |

**Twarda reguła po Dniu 7:** brak „mglistego pilota” w primary UI — każdy widoczny element ma klasę **ship** lub **roadmap** z honest copy; reszta **hide** lub **pilot_only** poza publiczną obietnicą.

---

## 2. Inventory i klasyfikacja (48 unikalnych modułów produktowych)

Legenda statusów źródłowych: z workspace modules + SoR + reality review (deduplikacja demo SoR).

### Candidate (13 modułów workspace + trust subflows)

| Moduł | Route / ID | Status źródłowy | Klasa D7 | Uzasadnienie |
|-------|------------|-----------------|----------|--------------|
| Panel, jobs, matches, applications, profile, CV, identity, calendar Google | `/dashboard/*`, `/profile` | live | *(już live)* | Rdzeń A — polish tylko |
| Evidence vault | `/dashboard/evidence` | live (thin) | **ship** | UX honesty, seed→prod path |
| Career compass | `/dashboard/career` | pilot | **ship** | FE gotowy; BE read-only OK |
| Interview prep | `/dashboard/interview-prep` | pilot | **ship** | BE+FE istnieją |
| Referrals | `/dashboard/referrals` | pilot | **pilot_only** | Brak prod persistence — kohorta |
| Plan / billing | `/dashboard/billing` | pilot+not_live | **hide** | Stripe L — preview tylko za flagą |
| Trust center (hub) | `/profile/trust` | pilot | **roadmap** | Honest static + link do overview |
| Trust subflows (8 tras) | `/profile/trust/*` | pilot+not_live | **hide** | XL compliance — nie public |
| Auto-apply | `#auto-apply-readiness` | paused | **hide** | XXL, always hidden |
| Microsoft calendar | calendar UI | coming_soon | **roadmap** | `FORCE_MICROSOFT_CALENDAR_COMING_SOON` |
| ICS/WebCal | calendar metadata | preview | **ship** | Metadata + download bez OAuth |

### Recruiter (12 workspace + demo pakiet)

| Moduł | Route | Status | Klasa D7 |
|-------|-------|--------|----------|
| Hub, inbox, pipeline, jobs, search | `/recruiter/*` | live | *(rdzeń A)* |
| Analytics | `/recruiter/analytics` | pilot | **ship** | Agregaty z istniejącego BE |
| Integrations readiness | `/recruiter/integrations` | pilot | **roadmap** | Honest „no live ATS sync” (P5) |
| Trust review queue | `/recruiter/trust-review-queue` | pilot | **pilot_only** | Demo data, kohorta |
| Daily cockpit | `/recruiter/daily-cockpit` | pilot | **pilot_only** | Ops-adjacent |
| Talent pool + import | `/recruiter/talent-pool*` | pilot | **pilot_only** | Import → hide subroute |
| Talent radar + digest | `/recruiter/talent-radar*` | pilot | **pilot_only** | Demo aggregates |
| Calendar | `/recruiter/calendar` | not_live | **hide** | MS/Google L |
| Operational work queue | hidden route | pilot | **hide** | Internal ops |
| ATS import readiness | hidden | pilot | **hide** | L, no public CTA |
| Demo journeys (7 tras, 1 pakiet) | `/recruiter/.../demo-*` | pilot | **pilot_only** | Sales proof, deep link only |

### Company (8 workspace + demo pakiet)

| Moduł | Route | Status | Klasa D7 |
|-------|-------|--------|----------|
| Dashboard, roles, pipeline | `/company/*` | live | *(rdzeń A)* |
| Hub next action | dashboard | live | **ship** | P5 slice — jeden CTA |
| Talent pool | `/company/talent-pool` | pilot | **pilot_only** | Demo persistence |
| Team permissions | `/company/team` | pilot | **pilot_only** | Token demo |
| Hiring cockpit / command | `/company/hiring-*` | pilot | **pilot_only** | no_ats_sync |
| Integrations | `/company/integrations` | pilot | **roadmap** | Honest preview (P5) |
| Billing | `/company/billing` | not_live | **hide** | Stripe L |
| Demo journeys (pakiet) | `/company/.../demo-*` | pilot | **pilot_only** | Deep link only |
| Candidate trust summary | demo route | pilot | **roadmap** | Illustrative badge |

### Investor (7 + public preview)

| Moduł | Route | Status | Klasa D7 |
|-------|-------|--------|----------|
| Public room, metrics, roadmap, calculator, contact | `/investor/*` | live | *(rdzeń A)* |
| Data room | `/investor/data-room` | pilot | **founder_decision** | Signed URLs vs placeholder |
| Placement economics | `/investor/placement` | pilot | **pilot_only** | DD cohort |
| Investor login | `/login/investor` | preview | **roadmap** | Invite-only badge |
| Board evidence | `/board/*` | internal | **hide** | INTERNAL tier |

### Marketing / shared (6)

| Moduł | Route | Status | Klasa D7 |
|-------|-------|--------|----------|
| Partners / careers / media | `/partners`, etc. | coming_soon | **roadmap** | Static honest pages |
| Testimonials / case studies | marketing | illustrative | **roadmap** | Disclaimer + limited band |
| Logo marquee | home marquee | live | **founder_decision** | Opcje A/B/C disclaimer |
| Homepage social proof | `/` | live | **ship** | P5 limited band |
| For-* persona pages | `/for-*` | live | **ship** | CTA honesty audit |

---

## 3. Podsumowanie liczb (guard / raport)

```
SEVEN_DAY_CLASSIFICATION_COUNTS: ship=12, hide=14, pilot_only=11, roadmap=8, founder_decision=3, TOTAL=48
```

| Klasa | Liczba | Przykłady |
|-------|--------|-----------|
| **ship** | 12 | career, interview prep, analytics, evidence, ICS, hub next action, homepage band, integrations copy, for-pages, calendar Google polish, recruiter nav, pipeline verify |
| **hide** | 14 | auto_apply, billing×2, calendars×2, ATS import×2, trust subflows×8 (liczone jako 1 pakiet hide + 7 subflow IDs w SoR) → **14 logicznych** |
| **pilot_only** | 11 | referrals, trust queue, cockpit, talent pools×2, radar×2, demo journeys×2, placement, team, hiring×2 |
| **roadmap** | 8 | trust hub, integrations×2, MS calendar, partners/media, testimonials, investor login, trust summary |
| **founder_decision** | 3 | data room, logo disclaimer, launch scope A vs B po D7 |

*Uwaga:* trust subflows liczone jako **1 decyzja hide (pakiet 8 tras)** w execution; SoR nadal 8 wpisów — nie ship pojedynczo.

---

## 4. Slice’y „ship in 7 days” (szczegóły PR)

### 4.1 Career compass (`ship`)

| Warstwa | Zadania |
|---------|---------|
| FE | Badge „Limited pilot” → „Live” po smoke; usunąć demo-only copy jeśli BE zwraca real |
| BE | Opcjonalnie: endpoint read-only career signals z istniejącego profilu (**1d**) |
| Data | Fallback seed tylko gdy profil pusty — honest empty state |
| Testy | `test:ui-product-surface-qa-guard`, route smoke |
| Acceptance | Użytkownik z profilem widzi real recommendations; bez profilu — empty state, nie fake lista |
| Ryzyko | Niskie — głównie FE/copy |
| PR slice | `feat: candidate career compass public-ready` |

### 4.2 Interview prep (`ship`)

| Warstwa | Zadania |
|---------|---------|
| FE | Pilot badge off po weryfikacji API; honest loading/error |
| BE | Już istnieje — verify prod endpoint |
| Testy | Existing route guard + manual smoke |
| Acceptance | Generuje prep z real application/match context |
| Ryzyko | Niskie |
| PR slice | `feat: interview prep remove pilot chrome` |

### 4.3 Recruiter analytics (`ship`)

| Warstwa | Zadania |
|---------|---------|
| FE | Wykresy z API aggregates; usuń `*-demo-data` gdy API OK |
| BE | **Wymagane:** `/recruiter/analytics` aggregates z DB (**2–3d**) |
| Testy | pytest API + frontend guard |
| Acceptance | Liczby zgodne z inbox/pipeline w staging |
| Ryzyko | Średnie — jedyny ship z obowiązkowym BE |
| PR slice | `feat: recruiter analytics prod aggregates` |

### 4.4 Evidence vault polish (`ship`)

| FE | Thin live → pełny empty/real state; brak „demo vault” |
| BE | Opcjonalnie persist upload metadata |
| PR slice | `polish: candidate evidence honest states` |

### 4.5 ICS/WebCal preview (`ship`)

| FE | Download ICS + subscribe URL visible; badge „Export” not „Sync” |
| BE | Metadata endpoint jeśli brak |
| PR slice | `feat: calendar ics webcal honest preview` |

### 4.6 Company hub next action (`ship` — P5)

| FE | `CompanyHubNextAction`, promos off, roadmap collapsed |
| PR slice | `product-polish-p5` (w toku) |

### 4.7 Homepage social proof band (`ship` — P5)

| FE | `LIMIT_HOMEPAGE_SOCIAL_PROOF_BAND`, illustrative notes |
| PR slice | `product-polish-p5` |

### 4.8 Integrations honest copy (`ship` — P5)

| FE | `INTEGRATIONS_HONEST_NOT_LIVE_SYNC` company + recruiter |
| PR slice | `product-polish-p5` |

### 4.9 Marketing for-pages CTA (`ship`)

| FE | Audit `/for-candidates`, `/for-companies`, `/for-recruiters` — CTA tylko do live modules |
| PR slice | `polish: marketing persona CTA honesty` |

### 4.10–4.12 Nav / calendar Google / pipeline verify (`ship`)

| Moduł | Zadania |
|-------|---------|
| Recruiter hub nav | Usuń pilot moduły z primary >5; roadmap collapsed |
| Calendar Google | Verify OAuth prod; honest disconnect state |
| Company pipeline | Smoke live data path |

---

## 5. Harmonogram Day 1–7

| Dzień | Fokus | Moduły / deliverable | Exit criteria |
|-------|-------|----------------------|---------------|
| **D1** | **Marketing** | partners/careers/media roadmap pages; testimonials illustrative; logo decision prep; homepage P5; for-* CTA audit | Zero overclaim na `/` i `/for-*`; marquee decision documented |
| **D2** | **Candidate** | career ship; interview prep ship; trust hub roadmap; referrals pilot_only boundary; evidence polish; auto-apply hide verify; ICS ship | Candidate hub: każdy card = ship/roadmap/pilot_only/hidden |
| **D3** | **Recruiter** | analytics ship (+BE); integrations roadmap; cockpit/talent/radar pilot_only; calendar hide; demo journeys pilot_only; nav ≤5 primary | Recruiter primary nav tylko live + honest badges |
| **D4** | **Company** | hub next action ship; integrations roadmap; hiring/team/talent pilot_only; billing hide; demo pilot_only | Company dashboard jeden next action, brak violet promos |
| **D5** | **Investor** | data room founder decision; placement pilot_only; login roadmap; board hide verify | `/investor` bez broken links; board niedostępny publicznie |
| **D6** | **Integrations / billing / calendar** | Stripe preview hide paths; ATS readiness static; MS coming_soon roadmap; Google cal verify; billing copy audit | Żadne „live sync” bez backendu |
| **D7** | **QA** | `test:seven-day-public-ready-plan-guard`; readiness lock; build; manual smoke checklist; audit „vague pilot clutter” | Wszystkie 48 modułów: klasa D7 spełniona; stance lock |

---

## 6. Powierzchnie launch po Dniu 7

### A — Minimum (scoped, bez rozszerzenia)

Marketing public + auth + rdzeń live: candidate **8**, recruiter **5**, company **4**, investor public room.  
`LAUNCH_SURFACE_A: candidate_8_recruiter_5_company_4_marketing_public`

### B — Agresywna 7-dniowa (rekomendowana po wykonaniu planu)

Surface A **plus**: career compass, interview prep, evidence polish, recruiter analytics, ICS/WebCal, honest integrations preview (roadmap tier), homepage limited social proof.  
`LAUNCH_SURFACE_B: A_plus_ship_12_modules`

### C — Wyłączone po Dniu 7 (nigdy public primary bez founder override)

auto-apply, trust subflows prod, ATS writeback/OAuth live, Stripe checkout, Microsoft calendar live, board/admin, operational queue, full billing, demo journeys w primary nav, data room bez signed URLs.  
`LAUNCH_SURFACE_C_EXCLUDED: auto_apply,trust_subflows_prod,ats_writeback,stripe_live,ms_calendar_live,board,ops_queue,billing_live,demo_primary_nav,data_room_unsigned`

---

## 7. Logo disclaimer — opcje A / B / C

**Kontekst:** Marquee Fortune 500 na marketingu. Founder preferuje **premium UX** — **bez dużego widocznego disclaimeru**; copy ma być subtelne.

| Opcja | Opis | UX | Ryzyko prawne | Effort |
|-------|------|-----|---------------|--------|
| **Opcja A — Subtelny copy pod marquee** ✅ **rekomendowane** | Krótki `text-[10px]` „Representative market context…” (`SUBTLE_MARQUEE_LOGO_DISCLAIMER`, P4) | Premium, adjacent | Niskie przy obecnym copy | XS — wdrożone |
| **Opcja B — Footer / tooltip** | Disclaimer poza marquee | Czystszy hero | Średnie — słabsza adjacency | XS |
| **Opcja C — Usunąć disclaimer** | Brak copy przy logo | Najczystszy wizualnie | **Wysokie** overclaim | XS kod, XL ryzyko |

**LOGO_DISCLAIMER_RECOMMENDATION:** `Option_A_subtle_premium`  
**NOT:** duży banner disclaimer (odrzucone — psuje premium UX).

---

## 8. Decyzje foundera (wymagane)

| # | Decyzja | Opcje | Blokuje |
|---|---------|-------|---------|
| 1 | **Akceptacja planu 7-dniowego** | TAK / NIE / EDYCJA | Cały execution |
| 2 | **Backend w ship slices** | Zezwól na BE dla analytics (+ opcjonalnie career) / FE-only | D3 recruiter analytics |
| 3 | **Ukrywanie modułów** | Zezwól na hide billing/calendar/trust subflows | D2, D4, D6 |
| 4 | **Logo disclaimer** | A (subtelny) / B (footer) / C (usuń) | D1 marketing |
| 5 | **Launch scope po D7** | Surface A minimum / B aggressive | D7 QA sign-off |
| 6 | **Investor data room** | Placeholder roadmap / signed URLs ship / hide | D5 |
| 7 | **Gate F** | Osobny krok — **≠ Launch GO** | Po D7 |

**FOUNDER_DECISION_FORMAT:** `YES|NO|EDIT` per row

---

## 9. Stance footer

**P0 CLOSED** | **Gate E PASS** | **Gate F PENDING** | **Launch NO-GO**

- **NOT** Launch GO
- **NOT** Gate F YES
- Gate F YES ≠ Launch GO
- Ten PR = **plan + guard only**; implementacja w slice’ach D1–D7
- **Nie** rekomendujemy 18–30 miesięcy jako ścieżki wykonawczej — superseded przez ten plan

---

## Metryki (guard / automation)

```
SEVEN_DAY_PLAN_DATE: 2026-07-08
SEVEN_DAY_CLASSIFICATION_COUNTS: ship=12, hide=14, pilot_only=11, roadmap=8, founder_decision=3, TOTAL=48
LAUNCH_SURFACE_A: candidate_8_recruiter_5_company_4_marketing_public
LAUNCH_SURFACE_B: A_plus_ship_12_modules
LAUNCH_SURFACE_C_EXCLUDED: auto_apply,trust_subflows_prod,ats_writeback,stripe_live,ms_calendar_live,board,ops_queue,billing_live,demo_primary_nav,data_room_unsigned
LOGO_DISCLAIMER_RECOMMENDATION: Option_A_subtle_premium
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
SUPERSEDES_TIMELINE_RECOMMENDATION: 18-30_months_passive
```
