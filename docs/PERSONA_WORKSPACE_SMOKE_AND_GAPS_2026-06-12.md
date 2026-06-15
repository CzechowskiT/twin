# Persona workspace smoke & gaps — 2026-06-12

**Owner:** TWIN Persona Workspace Smoke and Gap Owner  
**Closure branch:** `fix/persona-audit-p0-p1-closure-2026-06-12`  
**Navigation UX branch:** `fix/persona-workspace-navigation-premium-ux-2026-06-12` — see `docs/PERSONA_WORKSPACE_NAVIGATION_PREMIUM_UX_2026-06-12.md`
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
| `/recruiter` | 200 | **PASS** — module hub (2026-06-12 nav UX) |
| `/workspace/recruiter/integrations` | redirect | **PASS** — → `/recruiter/integrations` |

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

---

**Audit branch:** `audit/persona-workspace-smoke-and-gaps-2026-06-12`  
**Base:** `cursor/phase1-monorepo-scaffold` @ `51fa345` (P0 calendar week events #124)  
**Production FE:** https://twin-sooty.vercel.app  
**Production API:** https://twin-production-bcd9.up.railway.app  
**API `git_commit` (audyt):** `51fa34532801b758d851528512c406c6170341ea` — **zgodny ze scaffold**  
**Metoda:** `curl` health + HTTP smoke (31 tras) · browser MCP (nieauth) · `find frontend/src/app` · grep kodu · skrypty `npm run test:*` na scaffold  
**Zakres:** Candidate · Recruiter · Company · Investor — **tylko audyt docs, zero feature'ów**

**Hard bans (zachowane):** Public launch **NO-GO** · auto-apply **PAUSED** · delegated apply **NOT LIVE** · recruiter calendar sync **NOT LIVE** · brak fake traction · external invites **0** · H5c/H5d **HOLD**

---

## 1 — Health check produkcji

```bash
curl -s --max-time 15 https://twin-sooty.vercel.app/api/public-health
```

| Pole | Wartość | Werdykt |
| ---- | ------- | ------- |
| `status` | `ok` | **PASS** |
| `db_ok` | `true` | **PASS** |
| `git_commit` | `51fa345…` | **PASS** — zgodność ze scaffold |
| `mail_configured` | `true` | PASS |
| `google_oauth_configured` | `true` | PASS |
| `microsoft_oauth_configured` | `true` | PASS |
| `apple_oauth_configured` | `false` | znane — Apple/ICS częściowe |
| `google_calendar_configured` | `true` | PASS |
| `microsoft_calendar_configured` | `true` | PASS |
| `stripe_checkout_ready` | `true` | PASS |
| `recruiter_inbox_configured` | `true` | PASS |
| `scrape_worker_ready` / beat | `true` | PASS |
| `validated_jobs` | 652 | LIVE — coverage 6% (poniżej celu długoterminowego) |

**Werdykt Step 1:** **KONTYNUUJ** — API i DB zdrowe. Audyt tras dozwolony.

---

## 2 — Podsumowanie wykonawcze (per persona)

| Persona | Werdykt | Produkcja (smoke) | Scaffold | Demo kontrolowane? |
| ------- | ------- | ----------------- | -------- | ------------------ |
| **Candidate** | **PARTIAL+** | Wszystkie trasy workspace **HTTP 200**; login publiczny **PASS**; gated routes — pusta powłoka bez sesji | Dashboard, calendar, applications, evidence, interview-prep, profile — **MERGED** | **PARTIAL** — wymaga **founder manual smoke** na OAuth + kalendarz + timeline |
| **Recruiter** | **PARTIAL+** | Inbox, pipeline, search, analytics, integrations, jobs, calendar — **HTTP 200**; scorecard/scheduling **brak osobnych tras** (panel w inbox) | Pełny zestaw MVP + testy PASS | **PARTIAL** — inbox + pipeline demo po zalogowaniu; calendar sync **NOT LIVE** |
| **Company** | **PARTIAL** | Dashboard, roles, team, pipeline, billing — **HTTP 200**; `/company/integrations` **404** | Company workspace **MERGED** + backend pytest | **PARTIAL** — demo B2B po sesji company/recruiter; brak integrations lane |
| **Investor** | **PARTIAL+** | `/investor` publiczny **PASS** (uczciwy executive view); metrics/roadmap/data-room **gated** | Investor room + testy PASS | **YES** dla narracji inwestorskiej (public room); gated tools — founder smoke |

### Postęp vs audyt 2026-06-11

Od `PERSONA_COMPLETENESS_VERIFICATION_2026-06-11`: trasy które wtedy zwracały **404** (`/dashboard/applications`, `/dashboard/evidence`, `/recruiter/pipeline`, `/company/*` itd.) są dziś **200 na produkcji**. Deploy parity naprawiony (`git_commit` = scaffold).

### Najważniejsze luki (skrót)

1. **UX gate nieauth** — `PersonaWorkspaceGate` zwraca `null` → pusta strona zamiast natychmiastowego `/login/*` (PARTIAL we wszystkich personach).
2. **`test:i18n-coverage`** — **FAIL**, **848** brakujących kluczy overlay (regresja vs 120 w czerwcu).
3. **Recruiter calendar sync** — placeholder **NOT LIVE** (zgodnie z hard ban).
4. **`/company/integrations`** — **NOT FOUND** (404).
5. **Scorecard / scheduling** — brak `/recruiter/scorecard`, `/recruiter/scheduling`; funkcja w **inbox** (wymaga founder smoke).

---

## 3 — Smoke: Kandydat

| Trasa | HTTP | Browser (nieauth) | Status | Uwagi |
| ----- | ---- | ----------------- | ------ | ----- |
| `/login/candidate` | 200 | Formularz email+hasło, OAuth loading | **PASS** | Publiczny login OK |
| `/dashboard` | 200 | Pusta powłoka (nav+footer), URL pozostaje `/dashboard` | **PARTIAL** | Gate redirect wolny/niewidoczny; **founder manual smoke** |
| `/dashboard/calendar` | 200 | Pusta powłoka | **PARTIAL** | Kod: pełny week view + Google/MS OAuth — wymaga sesji |
| `/dashboard/applications` | 200 | Pusta powłoka | **PARTIAL** | Route istnieje; `test:candidate-application-timeline-crm` PASS |
| `/dashboard/interview-prep` | 200 | Pusta powłoka | **PARTIAL** | `test:candidate-interview-prep-mvp` PASS |
| `/dashboard/evidence` | 200 | Pusta powłoka | **PARTIAL** | `test:candidate-profile-evidence-vault` PASS |
| `/profile` | 200 | Pusta powłoka | **PARTIAL** | Profil kandydata — auth required |

**Dodatkowe trasy (inwentarz):** `/dashboard/acceptance`, `/dashboard/career`, `/dashboard/billing`, `/dashboard/settings/auto-apply` (PAUSED copy), `/workspace/candidate`, `/workspace/candidate/jobs` — wszystkie **200**, gated.

**Brak wycieku PII / unsafe copy** na nieauth (zgodnie z `e2e/smoke.spec.ts`).

---

## 4 — Smoke: Rekruter

| Trasa | HTTP | Browser (nieauth) | Status | Uwagi |
| ----- | ---- | ----------------- | ------ | ----- |
| `/login/recruiter` | 200 | „Signing in…” / ładowanie | **PARTIAL** | Sprawdzić OAuth bootstrap; forma może być opóźniona |
| `/recruiter/inbox` | 200 | Pusta powłoka | **PARTIAL** | Decision console — **founder manual smoke** (H5b PASS historycznie) |
| `/recruiter/pipeline` | 200 | Pusta powłoka | **PARTIAL** | `test:recruiter-pipeline-mvp` PASS |
| `/recruiter/search` | 200 | Pusta powłoka | **PARTIAL** | `test:recruiter-candidate-search-mvp` PASS |
| `/recruiter/talent-radar` | 200 | Pusta powłoka | **PARTIAL** | `test:recruiter-talent-radar-mvp` PASS |
| `/recruiter/analytics` | 200 | Pusta powłoka | **PARTIAL** | `test:recruiter-analytics-mvp` PASS |
| `/recruiter/integrations` | 200 | Pusta powłoka | **PARTIAL** | Readiness panel |
| `/recruiter/integrations/ats` | 200 | — | **PARTIAL** | ATS stub |
| `/recruiter/calendar` | 200 | Tytuł „Recruiter calendar”, treść gated | **PARTIAL** | **NOT LIVE** — roadmap placeholder (zgodnie z ban) |
| `/recruiter/jobs` | 200 | Pusta powłoka | **PARTIAL** | Lista ofert |
| `/recruiter/scorecard` | **404** | — | **NOT FOUND** | Scorecard = panel w inbox (`RecruiterScorecardPanel`) |
| `/recruiter/scheduling` | **404** | — | **NOT FOUND** | Scheduling = panel w inbox (`RecruiterSchedulingPanel`); `test:recruiter-scheduling-mvp` PASS |

**Funkcje osadzone w inbox (nie osobne trasy):** message drafts, manual scheduling, scorecards, notes — `test:recruiter-notes-scorecards-mvp`, `test:recruiter-candidate-message-drafts` PASS.

---

## 5 — Smoke: Firma (Company)

| Trasa | HTTP | Browser (nieauth) | Status | Uwagi |
| ----- | ---- | ----------------- | ------ | ----- |
| `/login/company` | 200 | — | **PASS** | Marketing login |
| `/company/dashboard` | 200 | Pusta powłoka | **PARTIAL** | `test:company-hiring-dashboard-mvp` PASS |
| `/company/roles` | 200 | Pusta powłoka | **PARTIAL** | `test:company-jobs-roles-management-mvp` PASS |
| `/company/roles/new` | 200 | — | **PARTIAL** | Nowa rola |
| `/company/team` | 200 | Pusta powłoka | **PARTIAL** | `test:company-team-permissions-mvp` PASS |
| `/company/pipeline` | 200 | Pusta powłoka | **PARTIAL** | `test:company-pipeline-quality-metrics` PASS |
| `/company/billing` | 200 | Pusta powłoka | **PARTIAL** | `test:company-billing-readiness-mvp` PASS |
| `/company/integrations` | **404** | — | **NOT FOUND** | Brak trasy w `frontend/src/app` |

**Layout:** `PersonaWorkspaceGate` — `allowed: ["company", "recruiter"]`.

---

## 6 — Smoke: Inwestor

| Trasa | HTTP | Browser (nieauth) | Status | Uwagi |
| ----- | ---- | ----------------- | ------ | ----- |
| `/investor` | 200 | Pełna treść publiczna — honest executive view, NO-GO copy | **PASS** | Najlepszy smoke nieauth |
| `/investor/metrics` | 200 | Pusta powłoka (gated) | **PARTIAL** | `test:investor-metrics-reality-dashboard` PASS; **founder manual smoke** |
| `/investor/roadmap` | 200 | Gated | **PARTIAL** | `test:investor-roadmap-founder-updates` PASS |
| `/investor/data-room` | 200 | Gated | **PARTIAL** | `test:investor-data-room-request-access` PASS |
| `/investor/calculator` | 200 | — | **PARTIAL** | Ilustracyjny kalkulator |
| `/investor/placement` | 200 | — | **PARTIAL** | Placement economics |
| `/login/investor` | 200 | — | **PASS** | Login publiczny |
| `/workspace/investor` | 200 | Gated hub | **PARTIAL** | Workspace tools |

**Uwaga:** Tylko `/investor` (root) jest celowo publiczny (`investor/layout.tsx`).

---

## 7 — Inwentaryzacja tras (source)

**Polecenie:** `find frontend/src/app -maxdepth 5 -type f | sort` — **156 plików** w drzewie `app/`.

### Podsumowanie `page.tsx` per persona (97 stron)

| Persona | Trasy workspace |
| ------- | --------------- |
| **Candidate** | `/dashboard/*` (10+), `/profile`, `/workspace/candidate`, `/login/candidate`, `/register/candidate` |
| **Recruiter** | `/recruiter/inbox`, `pipeline`, `search`, `analytics`, `integrations`, `integrations/ats`, `calendar`, `jobs`, `/workspace/recruiter` |
| **Company** | `/company/dashboard`, `roles`, `roles/new`, `roles/[roleId]`, `team`, `pipeline`, `billing` |
| **Investor** | `/investor`, `metrics`, `roadmap`, `data-room`, `calculator`, `placement`, `/workspace/investor` |

### BFF API (`frontend/src/app/api`)

| Prefix | Trasy |
| ------ | ----- |
| `/api/public-health` | Health proxy |
| `/api/recruiter/*` | inbox, respond-batch, pipeline, search, analytics, jobs |
| `/api/company/*` | dashboard, pipeline, roles, team, billing |
| `/api/v1/[[...path]]` | Proxy do Railway API |

### Trasy oczekiwane w briefie, ale **NOT FOUND**

| Trasa | Status |
| ----- | ------ |
| `/recruiter/scorecard` | **404** — funkcja w inbox |
| `/recruiter/scheduling` | **404** — funkcja w inbox |
| `/company/integrations` | **404** — brak implementacji |

---

## 8 — Inwentaryzacja testów

### Skrypty persona MVP w `frontend/package.json` (wybrane)

| Skrypt | Wynik (scaffold) |
| ------ | ---------------- |
| `test:candidate-application-timeline-crm` | **PASS** |
| `test:candidate-profile-evidence-vault` | **PASS** |
| `test:candidate-interview-prep-mvp` | **PASS** |
| `test:candidate-calendar-routing` | (w CI smoke) |
| `test:candidate-calendar-week-events-loading` | (P0 #124) |
| `test:recruiter-pipeline-mvp` | **PASS** |
| `test:recruiter-candidate-search-mvp` | **PASS** |
| `test:recruiter-analytics-mvp` | **PASS** |
| `test:recruiter-scheduling-mvp` | **PASS** |
| `test:recruiter-notes-scorecards-mvp` | **PASS** |
| `test:recruiter-integrations-readiness-mvp` | **PASS** |
| `test:company-hiring-dashboard-mvp` | **PASS** |
| `test:company-jobs-roles-management-mvp` | **PASS** |
| `test:company-pipeline-quality-metrics` | **PASS** |
| `test:company-billing-readiness-mvp` | **PASS** |
| `test:company-team-permissions-mvp` | **PASS** |
| `test:investor-metrics-reality-dashboard` | **PASS** |
| `test:investor-data-room-request-access` | **PASS** |
| `test:investor-roadmap-founder-updates` | **PASS** |
| `test:i18n-coverage` | **FAIL** — **848** missing keys |
| `test:e2e` | Playwright `e2e/smoke.spec.ts` — public + nieauth leak guards |

### Backend pytest (moduły persona — istnieją na scaffold)

`test_company_roles.py`, `test_company_pipeline_quality.py`, `test_company_hiring_dashboard.py`, `test_company_team.py`, `test_company_billing_readiness.py`, `test_recruiter_pipeline.py`, `test_recruiter_scheduling.py`, `test_recruiter_analytics.py`, `test_recruiter_candidate_search.py`, `test_recruiter_scorecards.py`, `test_recruiter_audit_trail.py`, `test_recruiter_inbox.py`

### Luka testowa

- Brak **E2E z auth** dla żadnej persony w CI (celowo — brak creds w pipeline).
- **Founder manual smoke** obowiązkowy przed external demo.

---

## 9 — Macierz luk (persona × feature × route × smoke × testy × status × gap × priorytet)

Legenda smoke: **P**=PASS · **Pa**=PARTIAL · **F**=FAIL · **NF**=NOT FOUND  
Legenda status: **L**=LIVE · **Pl**=placeholder/partial · **NL**=NOT LIVE · **G**=gated

| Persona | Feature | Route | Smoke | Test | Status | Gap | P |
| ------- | ------- | ----- | ----- | ---- | ------ | --- | - |
| Candidate | Login | `/login/candidate` | P | auth tests | L | — | — |
| Candidate | Dashboard / NBA | `/dashboard` | Pa | `dashboard-next-best-action` | G | Nieauth blank shell | P2 |
| Candidate | Calendar OAuth | `/dashboard/calendar` | Pa | calendar-* suite | G | Week events P0 fixed #124; founder verify OAuth | P1 |
| Candidate | Application timeline | `/dashboard/applications` | Pa | timeline-crm PASS | G | Manual smoke | P1 |
| Candidate | Evidence vault | `/dashboard/evidence` | Pa | evidence-vault PASS | G | Manual smoke | P2 |
| Candidate | Interview prep | `/dashboard/interview-prep` | Pa | interview-prep PASS | G | Manual smoke | P2 |
| Candidate | Profile | `/profile` | Pa | — | G | Manual smoke | P2 |
| Candidate | Auto-apply | `/dashboard/settings/auto-apply` | Pa | ux-safety PASS | NL | **PAUSED** — OK | — |
| Recruiter | Inbox console | `/recruiter/inbox` | Pa | inbox-decision PASS | G | Manual smoke H5b | P0 |
| Recruiter | Pipeline board | `/recruiter/pipeline` | Pa | pipeline-mvp PASS | G | Manual smoke | P1 |
| Recruiter | Candidate search | `/recruiter/search` | Pa | search-mvp PASS | G | Manual smoke | P2 |
| Recruiter | Talent Radar | `/recruiter/talent-radar` | Pa | talent-radar-mvp PASS | G | Manual smoke | P2 |
| Recruiter | Analytics | `/recruiter/analytics` | Pa | analytics-mvp PASS | G | Manual smoke | P2 |
| Recruiter | Integrations readiness | `/recruiter/integrations` | Pa | integrations-mvp PASS | Pl | ATS stub only | P2 |
| Recruiter | Calendar sync | `/recruiter/calendar` | Pa | persona-access | NL | **NOT LIVE** — OK per ban | P3 |
| Recruiter | Scorecard (route) | `/recruiter/scorecard` | NF | notes-scorecards PASS | Pl | Brak trasy — tylko inbox | P3 |
| Recruiter | Scheduling (route) | `/recruiter/scheduling` | NF | scheduling-mvp PASS | Pl | Brak trasy — tylko inbox | P3 |
| Recruiter | Manual scheduling panel | inbox embedded | — | scheduling-mvp PASS | L | Copy-to-clipboard; no email send | — |
| Company | Hiring dashboard | `/company/dashboard` | Pa | hiring-dashboard PASS | G | Manual smoke | P1 |
| Company | Roles CRUD | `/company/roles` | Pa | jobs-roles PASS | G | Manual smoke | P1 |
| Company | Pipeline metrics | `/company/pipeline` | Pa | pipeline-quality PASS | G | Manual smoke | P2 |
| Company | Team permissions | `/company/team` | Pa | team-permissions PASS | G | Manual smoke | P2 |
| Company | Billing / plan | `/company/billing` | Pa | billing-readiness PASS | G | Pre-revenue OK | P2 |
| Company | Integrations | `/company/integrations` | NF | — | NL | **Brak trasy** | P2 |
| Investor | Public room | `/investor` | P | investor-room-mvp | L | — | — |
| Investor | Metrics reality | `/investor/metrics` | Pa | metrics-reality PASS | G | Manual smoke | P1 |
| Investor | Roadmap | `/investor/roadmap` | Pa | roadmap-updates PASS | G | Manual smoke | P2 |
| Investor | Data room | `/investor/data-room` | Pa | data-room-access PASS | G | Manual smoke | P2 |
| Cross | i18n overlays | all | — | i18n-coverage **FAIL** | Pl | **848 missing keys** | **P0** |
| Cross | Auth gate UX | all gated | Pa | persona-access | Pl | Blank page vs redirect | P1 |
| Cross | Job corpus coverage | — | — | health 6% | Pl | 652 jobs, beat OK | P2 |

---

## 10 — Kategorie luk

### A — UX / auth (nieauth)

`PersonaWorkspaceGate` renderuje `null` przed `router.replace(LOGIN_PATH)` — użytkownik widzi pustą stronę (nav+footer) zamiast login form. Dotyczy **wszystkich** gated workspace'ów. Nie jest to wyciek danych, ale **PARTIAL** UX.

### B — Trasy oczekiwane vs rzeczywiste

- `/recruiter/scorecard`, `/recruiter/scheduling` — **NOT FOUND**; funkcjonalność w inbox.
- `/company/integrations` — **NOT FOUND**; brak odpowiednika recruiter integrations.

### C — NOT LIVE (zamierzone, hard ban)

- Nightly auto-apply **PAUSED**
- Delegated apply **NOT LIVE**
- Recruiter calendar OAuth sync **NOT LIVE**
- Recruiter external integrations (LinkedIn, email send) **NOT LIVE**

### D — i18n / CI debt

`test:i18n-coverage` — **848** brakujących kluczy. Blokuje pewne rollouty locale na nowych powierzchniach.

### E — Manual smoke gap

Żadna persona nie ma **authenticated E2E** w CI. Wszystkie **LIVE** features wymagają **founder manual smoke** przed external touch.

### F — Market / corpus

`market_coverage_progress_pct: 6` — scraping LIVE ale poniżej narracji „pełnego rynku”.

### G — Apple calendar

`apple_oauth_configured: false` — ICS/WebCal fallback częściowy (znane z `.cursorrules`).

---

## 11 — Top 10 następnych PR-ów (bez nowych feature'ów poza uzgodnionymi slice'ami)

| # | Priorytet | PR / slice | Dlaczego |
| - | --------- | ---------- | -------- |
| 1 | **P0** | Naprawa `test:i18n-coverage` (regeneracja premium overlays) | 848 missing keys — blokuje CI confidence |
| 2 | **P0** | Founder manual smoke checklist (auth) — dokument/runbook only | Jedyna ścieżka weryfikacji LIVE inbox/calendar |
| 3 | **P1** | Auth gate UX — loading shell lub synchroniczny redirect zamiast blank | Wszystkie persony PARTIAL na nieauth |
| 4 | **P1** | Candidate calendar — potwierdzenie P0 #124 na prod po founder OAuth | Week events loading fix merged |
| 5 | **P1** | Company integrations route stub (readiness only, jak recruiter) | `/company/integrations` 404 |
| 6 | **P1** | E2E smoke rozszerzenie — HTTP 200 assert dla nowych tras company/recruiter | CI nie widzi regresji 404 |
| 7 | **P2** | Deep link docs: scorecard/scheduling → inbox anchors | Oczekiwanie `/recruiter/scorecard` myli audyt |
| 8 | **P2** | Company workspace — founder QA na roles→pipeline flow | B2B demo path |
| 9 | **P2** | Market coverage ops — monitoring beat + alert przy stale feed | 6% coverage |
| 10 | **P2** | Investor gated pages — opcjonalny public teaser vs full gate | Metrics/roadmap tylko po login |

**Nie włączać bez explicit founder GO:** auto-apply, delegated apply, recruiter calendar sync, public launch, external recruiter invites.

---

## 12 — Gotowość do kontrolowanego demo

| Scenariusz | Werdykt | Warunki |
| ---------- | ------- | ------- |
| **Investor public room** (`/investor`) | **YES** | Uczciwy copy, NO-GO visible, bez fake traction |
| **Interactive demo** (`/demo`) | **YES** | Symulacja, nie production data |
| **Recruiter inbox pilot (Slot-1)** | **PARTIAL** | Wymaga zalogowanego rekruitera + founder QA; H5c **HOLD** |
| **Candidate warm outreach (5–10)** | **PARTIAL** | Po founder OAuth calendar + dashboard QA |
| **Company B2B workspace** | **PARTIAL** | Trasy LIVE; brak integrations; manual smoke |
| **Full four-persona guided tour** | **PARTIAL** | Możliwy z founder creds; nieauth UX słaby |
| **Public launch / mass GTM** | **NO** | — |

**Ogólny werdykt controlled demo:** **PARTIAL** — technicznie możliwy pilot 1:1 z founderem; nie gotowy na self-serve ani masowy ruch.

---

## 13 — Public launch NO-GO + weryfikacja hard bans

### Public launch

| Gate | Status |
| ---- | ------ |
| **Public launch announcement** | **NO-GO** |
| **Mass candidate GTM** | **NO-GO** |
| **External recruiter cohort (H5c/H5d)** | **HOLD** — invites **0** |

### Hard bans — weryfikacja

| Ban | Zweryfikowano | Dowód |
| --- | ------------- | ----- |
| Brak public launch GO | **TAK** | `/investor` copy, docs matrices |
| Auto-apply PAUSED | **TAK** | Health + dashboard settings copy |
| Delegated apply NOT LIVE | **TAK** | Investor room + trust-language guards |
| Recruiter calendar sync NOT LIVE | **TAK** | `/recruiter/calendar` placeholder |
| Brak fake traction | **TAK** | `test:trust-language-guard`, metrics reality tests |
| Brak external invites | **TAK** | H5c HOLD |
| Brak osłabiania auth | **TAK** | `PersonaWorkspaceGate` aktywny na wszystkich workspace |
| Brak ukrywania broken routes | **TAK** | 404 jawne dla `/company/integrations`, scorecard/scheduling routes |

---

## Załącznik — Production smoke plan (founder, 7 dni)

```bash
# Health — musi być ok + db_ok true
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{status,git_commit,db_ok}'

# Core public
for r in / /demo /login/candidate /investor; do
  echo -n "$r "; curl -sS -o /dev/null -w "%{http_code}\n" "https://twin-sooty.vercel.app$r"
done

# Workspace routes (expect 200; treść wymaga sesji)
for r in /dashboard /dashboard/calendar /dashboard/applications \
  /recruiter/inbox /recruiter/pipeline /company/dashboard /company/roles \
  /investor/metrics; do
  echo -n "$r "; curl -sS -o /dev/null -w "%{http_code}\n" "https://twin-sooty.vercel.app$r"
done

# Expected 404 until implemented
for r in /company/integrations /recruiter/scorecard /recruiter/scheduling; do
  echo -n "$r "; curl -sS -o /dev/null -w "%{http_code}\n" "https://twin-sooty.vercel.app$r"
done
```

| # | Check | Pass criteria |
| - | ----- | ------------- |
| PS1 | `db_ok: true` × 3 | Stabilne 5 min apart |
| PS2 | Zalogowany `/recruiter/inbox` | Queue + segments + accept/decline |
| PS3 | Zalogowany `/dashboard/calendar` | Week events ładują się (post-#124) |
| PS4 | Hard bans | Brak auto-apply live, brak GO copy |
| PS5 | `/recruiter/calendar` | Tylko NOT LIVE copy |
| PS6 | Company roles → pipeline | End-to-end z company token |
| PS7 | `npm run test:trust-language-guard` | Green na release commit |
| PS8 | `git_commit` prod = scaffold HEAD | Deploy parity |

**Jeśli PS1 lub PS2 fail:** STOP — brak external invites.

---

*Wygenerowano przez Persona Workspace Smoke and Gap Owner — audyt docs-only, bez zmian produktowych.*
