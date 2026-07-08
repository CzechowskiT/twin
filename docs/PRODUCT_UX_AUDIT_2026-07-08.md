# Product UX Audit — 2026-07-08

**Metoda:** mapowanie `frontend/src/app/` (230× `page.tsx`), rejestry `*-workspace-modules.ts`, `system-of-record-routes.ts` (83 wpisy), grep placeholder/pilot/TODO, audyty `PRODUCT_SURFACE_VISIBILITY_AUDIT_2026-07-07`, `UI_PRODUCT_SURFACE_QA_2026-07-07`, prod browser MCP (homepage desktop + 375px).

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Executive summary

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 14 |
| Medium | 12 |
| Low | 8 |
| **Razem** | **41** |

Produkt jest **szczerze oznakowany jako pilot** w wielu miejscach, ale **gęstość powierzchni**, **promo-karty pilotów w hubach live** i **marketing founding economics** nadal dają wrażenie niedokończonego MVP, nie limited-launch polish. Slice #403 poprawia huby, ale **nie dotyka dashboardu kandydata, promo rekrutera ani głębokich linków demo**.

### Top 5 (Critical / High)

1. **Critical** — Dashboard kandydata przeładowany (10+ sekcji na jednym ekranie) mimo slice #403 „controlled pilot ≤8 primary”.
2. **Critical** — Hub rekrutera promuje Daily Cockpit i Trust Review Queue **nad** primary grid — sprzeczność z `PRODUCT_SURFACE_VISIBILITY_AUDIT_2026-07-07`.
3. **Critical** — `NightlyAutoApplyStrip` nadal renderuje się na `/dashboard` (consent nudge, sweep stats) mimo statusu **PAUSED** / ukrycia z huba.
4. **High** — 83 wpisy SoR + ~230 `page.tsx` — deep linki otwierają demo/pilot bez bramki (collaboration, decision-memory, ATS readiness).
5. **High** — Marketing: founding rewards + Fortune-500 marquee + illustrative testimonials — ryzyko wrażenia „production launch” przy **Launch NO-GO**.

---

## Marketing

| Obszar | Ocena | Issues |
|--------|-------|--------|
| Homepage `/` | MVP+ | **High:** scroll ~15 sekcji, 4× „Join founding wishlist”, 4× „Create free account” — CTA fatigue. **High:** `FoundingCounterStrip` / stats pokazują „Loading live count…”, „…” na prod. **Medium:** demo sample „Fictional companies”. **Low:** sticky CTA + hero overlap. |
| `/for-candidates`, `/for-recruiters`, `/for-companies` | OK (honest) | Copy wspomina paused auto-apply, NOT LIVE calendar — **Low** |
| `/testimonials`, `/case-studies` | Placeholder feel | **High:** `testimonialsDisclaimer`: „Illustrative quotes — not verified”. Case studies = anonymized scenarios. Footer linkuje jak pełne social proof. |
| `/partners` | Empty sections | **High:** 3 bloki z `partners*Placeholder` — puste karty. |
| `/careers` | Coming soon | **Medium:** „Public listings will appear here”. |
| `/media` | Partial | **Medium:** coverage „will be listed here”. |
| Logo marquee | Visual risk | **High:** 80+ Fortune 500 logos; disclaimer tylko na `/partners` (`partnersNote`), nie przy marquee na home. |
| `/demo`, `/how-it-works` | OK | Honest phased automation copy. |
| `/waitlist`, `/first-1000`, `/register` | Funnel confusion | **Medium:** 3 ścieżki wejścia bez jednego primary CTA hierarchy. |
| `/pricing`, `/calculator` | Illustrative | **Medium:** ROI/B2B calculators = illustrative only (OK jeśli badge widoczny). |
| `/status` | Live | OK |
| `/for-investors`, `/investor` (public) | Honest NO-GO | OK — launch stance visible |

---

## Candidate

| Route / area | Tier (visibility) | Issues |
|--------------|-------------------|--------|
| `/dashboard` hub (SoR) | ≤8 primary (#403) | **OK** po #403 |
| `/dashboard` **page** | LIVE overload | **Critical:** CommandCenter + ProgressDashboard + OpportunityForecast + CalendarStrip + CareerCompassStrip + Matches + DevFocus + Jobs + Applications + NightlyAutoApplyStrip + tutorial/modals — **production feel = lab**, nie pilot. |
| `#auto-apply-readiness` | HIDDEN z huba, **visible on page** | **Critical:** strip + consent nudge mimo `status: "paused"`. |
| `/dashboard/matches`, `/jobs`, `/applications` | LIVE | **Medium:** dużo akcji per row (apply, auto-apply prep, research, intel). |
| `/profile` | LIVE | **Medium:** ~800+ linii, gęsty formularz; **Low:** hardcoded EN placeholders w `/dashboard/career` (``VP Engineering, …``). |
| `/dashboard/calendar` | LIVE (Google) | **High:** copy obiecuje Outlook/ICS — MS **not live** na prod. |
| Trust center `/profile/trust/*` | ROADMAP (10+ routes) | **High:** demo data, `pilotBadge` everywhere, `not_live` workflows (revoke/delete, portability download). |
| `/dashboard/billing`, `/referrals`, `/interview-prep`, `/career` | ROADMAP | **Medium:** pilot bez jasnego „preview only” na samym ekranie (tylko hub badge). |
| `/dashboard/evidence` | LIVE w registry | **Low:** thin surface vs label „live”. |

**Hide for limited launch:** auto-apply strip, CareerCompassStrip on home dashboard, trust subflows (deep links), evidence jeśli thin.

---

## Recruiter

| Route | Tier | Issues |
|-------|------|--------|
| `/recruiter` hub | ≤5 primary | **Critical:** promo cards Daily Cockpit (violet) + Trust Review Queue (emerald) **above** SoR grid — module są w `RECRUITER_ROADMAP_IDS`, nie primary. |
| `/recruiter/inbox`, `/pipeline`, `/jobs`, `/search` | LIVE | **OK** core pilot |
| `/recruiter/calendar` | HIDDEN / NOT LIVE | Route exists — **High** deep link leak |
| `/recruiter/integrations/*`, `/talent-pool`, `/analytics`, `/talent-radar` | PILOT | Demo/readiness data — **High** jeśli user trafi z bookmark |
| `/recruiter/jobs/[jobId]/*` | 10+ subpages | **High:** scorecards, decision-memory, communication — większość demo journey |
| `/recruiter/candidates/[candidateId]/*` | Same | **High:** collaboration, trust, notes — pilot/demo mix |
| Token + company slug | Friction | **Medium:** spójne z pilotem, ale onboarding employer/recruiter nieguided |

**Hide for limited launch:** hub promos, calendar route, operational work queue, ATS import readiness (już hidden), demo collaboration cards.

---

## Company

| Route | Tier | Issues |
|-------|------|--------|
| `/company/dashboard` | ≤4 primary | **High:** wymaga recruiter token + company slug (jak inbox) — employer first-run **confusing**. |
| `/company/roles`, `/pipeline` | LIVE | **OK** |
| `/company/talent-pool` | PILOT | `pilotBadge` on roles page |
| `/company/billing` | NOT LIVE hidden | **Medium:** route żyje |
| `/company/integrations` | PILOT | Honest status rows — **OK** |
| `/company/hiring-cockpit`, `/hiring-command-center` | PILOT | Promo potential jak u rekrutera |

---

## Investor

| Route | Tier | Issues |
|-------|------|--------|
| `/investor` public room | LIVE preview | Honest NO-GO — **OK** |
| `/investor/metrics`, `/calculator`, `/roadmap` | LIVE | **OK** |
| `/investor/data-room` | PILOT | **Medium:** confidential placeholders bez URL |
| `/investor/placement` | PILOT | **Low** |
| `/login/investor` | needs_setup | **Medium:** badge „needs setup” — friction |
| Board routes `/board/*` | INTERNAL | **High:** w investor SoR group „boardEvidence” — nie dla end user launch |

Investor **nie ma** primary/roadmap split (#403 skip) — **Medium:** pełna siatka modułów.

---

## Shared UI

- **Auth** `/login`, `/register`: `AuthZoneHub` — 4 strefy, spójny visual (**OK**). Brak post-auth onboarding wizard (**Medium**).
- **SoR cards**: `WorkspaceStatusBadge` + boundary tags — **dobry wzorzec** (#403).
- **Forms**: i18n placeholders OK; admin `/admin/*` ma raw EN (`"OPS admin token"`) — **High** jeśli route dostępny.
- **Empty states**: `GuidedEmptyState` na company dashboard — **OK**.
- **Modals/dynamic imports**: dashboard ładuje 6+ lazy chunks — **Medium** perceived perf.

---

## Mobile

- Header: Demo + Login + Register + Menu + 8 języków — **Medium:** zatłoczony rail.
- Homepage snapshot **906 lines** YAML — **High:** excessive scroll.
- `twin-touch-target` w globals.css — **OK** pattern.
- Marquee/logos: nie zweryfikowano clipping w MCP (QA 07-07: PARTIAL).

---

## Desktop

- Marketing grid `max-w-6xl` spójny — **OK**.
- Hub grids `sm:grid-cols-2 lg:grid-cols-3` — **OK**.
- Dashboard `dashboard-hero-grid` — **Medium:** dwie kolumny mogą konkurować wizualnie.

---

## Navigation

- **Explore mega panel** (`public-explore-mega-panel-routes.ts`): linki do `/dashboard`, `/recruiter`, `/company/dashboard` bez auth — **High:** redirect/empty shell confusion.
- **CandidateModuleNav** + **WorkspaceFlowSteps** + **Subnav** — **Medium:** triple navigation on dashboard.
- **Recruiter quick actions** — **OK** (4 live CTAs).
- **Footer**: Case studies + Testimonials linkują illustrative content — **Medium**.

---

## Branding

- TWIN accent green spójny w hub/auth — **OK**.
- Recruiter promo cards violet/emerald — **Medium:** inconsistent z design system.
- `marketing-gradient-heading` na hero — **OK** premium feel.
- Partner logos: optical styles w `partner-logo-styles.ts` — code PASS, visual PARTIAL.

---

## Visual consistency

| Element | Issue | Severity |
|---------|-------|----------|
| Pilot badges | `text-xs rounded-full` vs module card badges vs `data-launch-stance` | Medium |
| Eyebrow typography | `text-[10px] tracking-[0.28em]` repeated everywhere | Low |
| Demo journey cards | `demoJourneyTitle` copy pattern — 20+ surfaces | Medium |
| Loading skeletons | pulse blocks vs spinner on dashboard bootstrap | Low |

---

## UX consistency

- **Honest status language** — mocna strona produktu (pilot/not_live w i18n).
- **Hub vs page mismatch** — słaba strona (#403 nie propaguje się na page content).
- **Persona switching** `/workspace` link — **OK**.
- **CTA logic**: marketing pushes wishlist + register equally — **High** brak jednego primary dla limited launch.

---

## Roadmap recommendations (Product Polish 1.0 backlog)

### P0 — przed limited launch (hide/simplify)

1. Usuń/schowaj `NightlyAutoApplyStrip` i `#auto-apply-readiness` z dashboardu (paused).
2. Usuń promo cards Daily Cockpit + Trust Review z `/recruiter` hub (zostaw w collapsed roadmap).
3. Dashboard kandydata: **jeden** hero (CommandCenter) + jedna sekcja „next action”; reszta na subroutes (`/matches`, `/applications`).
4. Gate demo routes (`founder-led-demo-routes`) — 404 lub „pilot preview” banner + auth.
5. Marketing: jeden primary CTA (wishlist **lub** register); disclaimers przy marquee + rewards band above fold.

### P1 — polish

6. Partners/Careers/Media — hide z footer lub „coming soon” single page.
7. Company dashboard — guided onboarding bez token jargon (or dedicated employer invite).
8. Trust center — single overview + link „advanced (pilot)” zamiast 10 kart.
9. Mobile header — collapse language + DEMO do menu.
10. Founder visual QA: marquee, hub grids auth (z QA doc 07-07).

### P2 — roadmap (nie launch blocker)

11. Microsoft calendar, billing checkout, ATS writeback.
12. Verified testimonials + partner references.
13. Investor login `needs_setup` → invite-only flow.
14. Dashboard performance (reduce lazy island count).

---

**Canonical stance footer:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**
