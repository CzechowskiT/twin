# Product Scope Reality Review — 2026-07-08

**Metoda:** rejestry `*-workspace-modules.ts`, `system-of-record-routes.ts` (83 wpisy), `product-surface-visibility.ts`, `product-polish-p0/p1/p2/p3.ts`, audyt `docs/PRODUCT_UX_AUDIT_2026-07-08.md`, slice’y Product Polish P0–P3, grep statusów (`pilot`, `preview`, `coming_soon`, `paused`, `not_live`, `hold`, `internal`, `needs_setup`).

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Źródła liczb:** `SYSTEM_OF_RECORD_ROUTES` — 26 `live`, 57 `pilot`, 2 `not_live` (recruiter calendar, company billing). Workspace modules: 13 candidate, 12 recruiter, 8 company, 7 investor (+2 public preview). Product surface tiers: LIVE / PILOT / HOLD / INTERNAL / COMING_SOON (`product-surface-visibility.ts`).

---

## 1. Executive summary

TWIN ma **szeroką powierzchnię produktową** (83 trasy SoR, ~230 `page.tsx`) przy **wąskim rdzeniu live** (~26 tras SoR + marketing). Większość modułów pilot/preview ma **frontend i demo data**, ale brakuje **persistencji produkcyjnej**, **integracji zewnętrznych** (ATS writeback, Microsoft Calendar, Stripe) lub **workflow compliance** (GDPR revoke/portability, identity verification).

**Odpowiedź na pytanie czasowe:** doprowadzenie **wszystkich** 57 tras pilot + 2 not_live + subflow’y demo do stanu **public-launch-ready** (prawdziwe dane, E2E, compliance, integracje) to **~18–30 miesięcy** przy 2–3 FTE full-stack — nie jeden sprint. **Nie warto** tego robić przed public launch.

**Rekomendacja:** utrzymać **controlled pilot** (P0–P3 już wdrożone) z **~17 modułami live** na public launch surface; resztę trzymać w roadmap/hidden/internal. Szacowany czas do **honest limited public launch** (bez rozszerzania scope’u pilotów): **2–4 tygodnie** decyzji foundera + smoke QA, nie 18 miesięcy dev.

**Logo disclaimer:** po P0 disclaimer `site.marqueeLogoDisclaimer` jest **pod marquee** na stronach marketingowych. **Zostawić** (opcja 1) lub przenieść do footera z widocznością above-the-fold (opcja 2). **Usunąć** (opcja 3) — **wysokie ryzyko overclaim** przy 80+ logotypach Fortune 500.

**Podsumowanie effort (unikalne moduły produktowe, deduplikacja demo SoR):**

| Tier | Liczba | Znaczenie |
|------|--------|-----------|
| **XS** | 6 | Etykiety, copy, badge — już prawie live |
| **S** | 9 | Frontend gotowy; brakuje danych prod lub jednego API |
| **M** | 14 | Backend częściowy + E2E + decyzje produktowe |
| **L** | 8 | Integracje zewnętrzne lub billing |
| **XL** | 5 | Compliance suite, auto-apply, ATS writeback |
| **XXL** | 6 | Strategic bets — nie na public launch |
| **Razem** | **48** | |

---

## 2. Czy warto developować wszystkie pilot paths do public launch?

**Nie.** Uzasadnienie evidence-based:

1. **Duplikacja demo vs produkt** — wiele tras pilot to **demo journey** (pipeline 360, collaboration, decision-memory) powielone dla recruiter/company/investor SoR. To **proof surfaces**, nie osobne produkty — łącznie ~12 tras, jeden effort M, nie 12×M.

2. **Board / investor evidence** (`/board/*`, working-data-readiness, audit-event-foundation) — **INTERNAL** w `product-surface-visibility.ts`; nie dla end user.

3. **Trust center subflows** (10+ tras) — `boundaryTags: not_live, human_decision_required`; demo data w `*-demo-data.ts`; pełne live wymaga **append-only audit**, **DSAR workflows**, **legal review** — XL/XXL, nie quick win.

4. **ATS / calendar / billing** — jawne `no_ats_sync`, `not_live` w rejestrach; OAuth/env istnieje częściowo, ale product tier wymusza coming soon (`FORCE_MICROSOFT_CALENDAR_COMING_SOON`, `BILLING_PREMIUM_PREVIEW_ONLY`).

5. **North star** (`.cursorrules`) — kalendarz akceptacji, nie gęstość feature’ów. Public launch = **matches + applications + calendar (Google) + pipeline/inbox** dla wąskiej kohorty, nie 57 modułów.

6. **Koszt alternatywny** — 18–30 miesięcy na pełny pilot→live vs **2–4 tyg.** na controlled pilot z istniejącym rdzeniem live.

**Wniosek:** developować **selektywnie** (tabela sekcja 3 + roadmap sekcja 4), nie „wszystko do live”.

---

## 3. Per-module estimates

Legenda effort: **XS** 1–2d | **S** 3–5d | **M** 1–2w | **L** 3–6w | **XL** 2–3mo | **XXL** 3+mo  
Kolumny: BE=backend, FE=frontend, Data=real prod data, Ext=external integration, Human=human decision queue, Compliance, E2E, Prod=prod data needed.

### Candidate

| Moduł | Route | Status | BE | FE | Data | Ext | Human | Compliance | E2E | Prod | Effort | Grupa |
|-------|-------|--------|----|----|------|-----|-------|------------|-----|------|--------|-------|
| Panel / jobs / matches / applications / profile / CV / identity / calendar (Google) | `/dashboard/*`, `/profile` | live | ✓ | ✓ | częściowo | Google Cal | — | consent | tak | tak | — | **Live (public)** |
| Evidence vault | `/dashboard/evidence` | live (thin) | częściowo | ✓ | seed | — | — | — | tak | tak | **XS** | Quick wins |
| Career compass | `/dashboard/career` | pilot | częściowo | ✓ | demo | — | — | — | tak | tak | **S** | Quick wins |
| Interview prep | `/dashboard/interview-prep` | pilot | ✓ | ✓ | demo | — | — | — | tak | tak | **S** | Quick wins |
| Referrals | `/dashboard/referrals` | pilot | częściowo | ✓ | brak | — | — | — | tak | tak | **M** | Medium |
| Plan / billing | `/dashboard/billing` | pilot+not_live | brak checkout | ✓ preview | — | Stripe | — | — | tak | tak | **L** | Major bets |
| Trust center (hub) | `/profile/trust` | pilot | częściowo | ✓ | demo | — | tak | GDPR | tak | tak | **M** | Medium |
| Trust subflows (export, correction, ID verify, portability, revoke, audit, consent, overview) | `/profile/trust/*` | pilot+not_live | brak | ✓ | demo | IDV vendor? | tak | **tak** | tak | tak | **XL** | Major bets |
| Auto-apply | `#auto-apply-readiness` | paused | częściowo | ✓ | — | boards | tak | **tak** | tak | tak | **XXL** | Not for launch |

### Recruiter

| Moduł | Route | Status | BE | FE | Data | Ext | Human | Compliance | E2E | Prod | Effort | Grupa |
|-------|-------|--------|----|----|------|-----|-------|------------|-----|------|--------|-------|
| Hub / inbox / pipeline / jobs / search | `/recruiter/*` | live | ✓ | ✓ | tak | — | tak | — | tak | tak | — | **Live (public)** |
| Trust review queue | `/recruiter/trust-review-queue` | pilot | częściowo | ✓ | demo | — | tak | trust | tak | tak | **M** | Medium |
| Daily cockpit | `/recruiter/daily-cockpit` | pilot | częściowo | ✓ | demo | — | tak | — | tak | tak | **M** | Medium |
| Talent pool + import | `/recruiter/talent-pool*` | pilot | częściowo | ✓ | demo | ATS | — | — | tak | tak | **M** | Medium |
| Talent radar + digest | `/recruiter/talent-radar*` | pilot | częściowo | ✓ | demo | — | tak | — | tak | tak | **M** | Medium |
| Analytics | `/recruiter/analytics` | pilot | częściowo | ✓ | demo | — | — | — | nie | tak | **S** | Quick wins |
| Integrations | `/recruiter/integrations` | pilot | częściowo | ✓ | readiness rows | ATS OAuth | — | — | tak | tak | **L** | Major bets |
| Calendar | `/recruiter/calendar` | not_live | brak | ✓ | — | MS/Google | — | — | tak | tak | **L** | Major bets |
| Operational work queue | `/recruiter/operational-work-queue` | pilot+hidden | brak | ✓ | demo | — | tak | — | nie | tak | **L** | Major bets |
| Demo journeys (pipeline, 360, collab, trust, team, comm, decision-memory) | `/recruiter/.../demo-*` | pilot | demo | ✓ | demo | no_ats_sync | tak | — | częściowo | nie | **M** (pakiet) | Medium |
| ATS import readiness | `/recruiter/integrations/ats/*` | pilot+hidden | częściowo | ✓ | demo | ATS | tak | — | tak | tak | **L** | Major bets |

### Company

| Moduł | Route | Status | BE | FE | Data | Ext | Human | Compliance | E2E | Prod | Effort | Grupa |
|-------|-------|--------|----|----|------|-----|-------|------------|-----|------|--------|-------|
| Dashboard / roles / pipeline | `/company/*` | live | ✓ | ✓ | tak | — | tak | — | tak | tak | — | **Live (public)** |
| Talent pool | `/company/talent-pool` | pilot | częściowo | ✓ | demo | — | — | — | tak | tak | **M** | Medium |
| Team permissions | `/company/team` | pilot | częściowo | ✓ | token demo | — | — | — | tak | tak | **M** | Medium |
| Hiring cockpit / command center | `/company/hiring-*` | pilot | częściowo | ✓ | demo | no_ats_sync | tak | — | tak | tak | **M** | Medium |
| Integrations | `/company/integrations` | pilot | częściowo | ✓ | readiness | webhooks | — | — | tak | tak | **L** | Major bets |
| Billing | `/company/billing` | not_live+hidden | brak | ✓ preview | — | Stripe | — | — | tak | tak | **L** | Major bets |
| Candidate trust summary (demo) | `/company/candidates/.../trust-summary` | pilot | demo | ✓ | demo | — | tak | — | nie | nie | **S** | Quick wins |
| Demo journeys (jak recruiter) | `/company/.../demo-*` | pilot | demo | ✓ | demo | — | tak | — | częściowo | nie | **M** (pakiet) | Medium |

### Investor / internal

| Moduł | Route | Status | BE | FE | Data | Ext | Human | Compliance | E2E | Prod | Effort | Grupa |
|-------|-------|--------|----|----|------|-----|-------|------------|-----|------|--------|-------|
| Public room / metrics / roadmap / calculator / demo | `/investor`, `/demo` | live | ✓ | ✓ | public | — | — | — | nie | nie | — | **Live (investor)** |
| Data room | `/investor/data-room` | pilot | brak URLs | ✓ | placeholder | — | tak | confidential | nie | nie | **M** | Medium |
| Placement economics | `/investor/placement` | pilot | częściowo | ✓ | demo | — | tak | — | nie | tak | **M** | Medium |
| Investor login | `/login/investor` | preview | auth | ✓ | — | — | tak | — | nie | nie | **S** | Quick wins |
| Board evidence (`/board/*`, working-*-readiness, persistence, audit) | `/board/*` | pilot+internal | read-only | ✓ | ops | — | tak | — | nie | nie | **XXL** | Not for launch |
| SoR demo proof links | investor SoR demoProof | pilot | demo | ✓ | demo | — | — | — | nie | nie | **XS** | Not for launch |

### Marketing / shared (COMING_SOON / HOLD)

| Moduł | Route | Status | Uwagi | Effort | Grupa |
|-------|-------|--------|-------|--------|-------|
| Partners / careers / media | `/partners`, `/careers`, `/media` | coming_soon (P1) | Placeholder copy; ukryte z nav | **S** (content) | Quick wins |
| Microsoft calendar | candidate calendar UI | coming_soon | `CALENDAR_PROVIDER_TIERS.microsoft` | **L** | Major bets |
| ICS/WebCal | calendar | preview | metadata only | **S** | Quick wins |
| Testimonials / case studies | `/testimonials`, `/case-studies` | illustrative | disclaimer istnieje | **M** (verified) | Medium |
| Logo marquee | home marquee | live+disclaimer | P0 disclaimer dodany | **XS** | Quick wins |

---

## 4. Roadmap: Now / Next / Later / Not for public launch

### Now (0–2 tyg.) — bez nowego scope’u dev

- Utrzymać **Launch NO-GO** i stance P0 CLOSED | Gate E PASS | Gate F PENDING.
- **Public launch surface:** candidate live core (8 primary), recruiter live core (5), company live core (4), marketing public routes (`PUBLIC_SURFACE_HREFS`).
- **Controlled pilot:** roadmap slice w hubach (`splitProductSurfaceRoutes`), `PilotPreviewBoundary` na deep linkach (`product-polish-p0`).
- Founder decisions (sekcja 8).

### Next (2–8 tyg.) — selektywne S/M

- Career compass, interview prep, evidence — doprecyzować prod data path (**S**).
- Recruiter analytics — real aggregates z istniejącego BE (**S**).
- Referrals, talent pool — minimal viable persistence (**M**).
- Verified testimonials / partners content — content, nie kod (**M**).

### Later (2–6 mies.) — L/XL

- Microsoft calendar + recruiter calendar (**L**).
- Stripe billing candidate + company (**L**).
- ATS OAuth + import (**L**); writeback (**XL**).
- Trust subflows production (**XL**).
- Demo journeys → real persistence za jednym wzorcem (**M** pakiet, ale zależy od ATS).

### Not for public launch (3+ mies., XXL)

- Auto-apply (paused) — compliance + board ToS (**XXL**).
- Operational work queue — ops product, nie self-serve launch.
- Board `/board/*` — internal investor evidence.
- Full placement verification automation (`docs/PLACEMENT_VERIFICATION.md`).
- Greenhouse/Lever webhooks (`planned` w integrations readiness).

---

## 5. Public launch surface recommendation

**Rekomendacja:** public launch = **marketing** + **auth** + **wąski rdzeń live** per persona. Nie promować pilot/roadmap w primary nav.

| Persona | Public primary (live) | Ukryć / roadmap / internal |
|---------|----------------------|----------------------------|
| **Candidate** | panel, jobs, matches, profile, CV, applications, calendar (Google), identity | trust subflows, billing, referrals, career, interview prep, evidence (roadmap), auto-apply (hidden) |
| **Recruiter** | hub, inbox, pipeline, jobs, search | wszystko pilot, calendar, demo journeys, ATS hidden |
| **Company** | dashboard, roles, pipeline | talent pool pilot w roadmap, billing hidden, hiring cockpits roadmap |
| **Investor** | public room, metrics, roadmap, calculator | data room pilot, board internal |
| **Marketing** | `/`, `/for-*`, `/waitlist`, `/demo`, `/faq`, legal | partners/careers/media coming soon (P1) |

**Szacowany czas do tego stanu:** już osiągnięty po P0–P3; pozostaje **founder sign-off + Gate F**, nie 57× dev.

---

## 6. Controlled pilot surface recommendation

**Rekomendacja:** kontynuować model z `product-surface-visibility.ts` + flagi `product-polish-p0/p1/p2/p3.ts`.

- **Primary limits:** candidate ≤8, recruiter ≤5, company ≤4 (`CONTROLLED_PILOT_PRIMARY_LIMITS`).
- **Roadmap:** pilot modules z badge Limited Pilot / Preview (`product-polish-p3`).
- **Deep links:** `PilotPreviewBoundary` + `isPilotPreviewDeepLinkPath()` — nie usuwać tras.
- **Always hidden:** auto_apply, revoke_delete, recruiter_calendar, operational_work_queue, ATS import, company_billing (`ALWAYS_HIDDEN_MODULE_IDS`).
- **Investor:** pełna siatka OK dla due diligence; board routes INTERNAL.

Dla zaproszonych pilotów: deep linki demo + roadmap w hubie wystarczą; **nie** wymagać live na wszystkich 57 trasach.

---

## 7. Logo disclaimer — trzy opcje

**Kontekst:** `site-top-marquee.tsx` renderuje `CompanyLogoMarquee` + `t("site.marqueeLogoDisclaimer")` na stronach marketingowych (nie na light chrome / workspace). Copy EN: *"Representative company logos shown for market context / target ecosystem. Not all are TWIN customers."* PL: *"Logotypy firm pokazane orientacyjnie — kontekst rynku i docelowy ekosystem. Nie wszyscy są klientami TWIN."* Dodatkowo `site.partnersNote` na `/partners`.

### Opcja 1 — Zostawić pod marquee (stan po P0) ✅ rekomendowane

| Wymiar | Ocena |
|--------|-------|
| **Ryzyko prawne / overclaim** | Niskie — disclaimer adjacent do logotypów, język „representative / orientacyjnie” |
| **UX** | Mały footprint (`text-[10px]`), czytelny na desktop; na mobile może wymagać visual QA |
| **Legal** | Spójne z `partnersNote`; zmniejsza ryzyko sugerowania endorsementu |
| **Effort** | **XS** — już wdrożone |

### Opcja 2 — Przenieść do footera lub tooltip przy marquee

| Wymiar | Ocena |
|--------|-------|
| **Ryzyko prawne** | Średnie — mniejsza widoczność = słabsza obrona „reasonable consumer” |
| **UX** | Czystszy hero; użytkownik może nie scrollować do footera |
| **Legal** | Wymaga review czy disclaimer „nearby” wystarczy przy 80+ logo |
| **Effort** | **XS** (1–2d) + founder/legal OK |

### Opcja 3 — Usunąć disclaimer

| Wymiar | Ocena |
|--------|-------|
| **Ryzyko prawne** | **Wysokie** — marquee Fortune 500 bez adjacent disclaimer; audit UX #5 High |
| **UX** | Czystszy wizualnie |
| **Legal** | Niezalecane przy obecnym marquee; tylko jeśli **usunąć lub drastycznie zmniejszyć** logo wall |
| **Effort** | **XS** kod, **XL** ryzyko reputacji |

**Rekomendacja foundera:** **Opcja 1** (zostawić). Ewentualnie wzmocnić widoczność na mobile (font/contrast), nie usuwać.

---

## 8. Concrete founder decisions needed

1. **Public launch scope** — potwierdzić wąski rdzeń (sekcja 5) vs rozszerzenie o którykolwiek moduł pilot (który?).
2. **Pilot cohort** — kto dostaje deep linki demo / roadmap (founder-led vs waitlist batch).
3. **Logo disclaimer** — opcja 1 / 2 / 3 (rekomendacja: 1).
4. **Auto-apply** — pozostaje **paused** na launch? (rekomendacja: tak, XXL).
5. **Billing** — Premium Preview tylko vs target date Stripe (**L**).
6. **Microsoft calendar** — coming soon do kiedy; czy blokować copy obietnice na `/dashboard/calendar`.
7. **Trust center** — overview pilot wystarczy vs który subflow priorytetyzować (XL).
8. **Gate F** — osobna decyzja; **nie równa się Launch GO** (patrz stance poniżej).
9. **Investor data room** — placeholder pilot OK dla fundraise vs wymóg signed URLs (**M**).
10. **Demo journeys** — traktować jako sales proof only (rekomendacja: tak) vs roadmap public live.

---

## Stance footer

**P0 CLOSED** | **Gate E PASS** | **Gate F PENDING** | **Launch NO-GO**

- **NOT** Launch GO
- **NOT** Gate F YES
- Gate F YES ≠ Launch GO (osobna decyzja foundera)
- Phase 3B: poza scope tego review; nie zmienia stance

---

## Metryki podsumowujące (guard / automation)

```
MODULE_EFFORT_COUNTS: XS=6, S=9, M=14, L=8, XL=5, XXL=6, TOTAL=48
ROADMAP_GROUPS: Quick_wins, Medium, Major_bets, Strategic_not_for_launch
SOR_PILOT_COUNT: 57
SOR_NOT_LIVE_COUNT: 2
TIMELINE_ALL_PILOT_TO_LIVE: 18-30_months
TIMELINE_CONTROLLED_PUBLIC_LAUNCH: 2-4_weeks
LOGO_DISCLAIMER_RECOMMENDATION: Option_1_keep
PUBLIC_LAUNCH_MODULES: candidate_8_recruiter_5_company_4
```
