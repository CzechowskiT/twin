# Audyt demo inwestorskiego TWIN — 2026-05-24

**Audytor:** Cursor AI (autonomiczny)  
**Branch audytowany (lokalnie):** `cursor/vision-next-slice` @ `2815d83`  
**Produkcja API:** `https://twin-production-bcd9.up.railway.app` (`git_commit`: `8eab817`)  
**Produkcja WWW:** `https://twin-sooty.vercel.app`  
**Dokumenty porównawcze:** `docs/AUDIT_RESULTS_2026-05-23.md`, `docs/INVESTOR_DEMO_AUDIT_REPORT.md`, `docs/INVESTOR_DEMO_RUNBOOK.md`, `docs/INVESTOR_DEMO_SCRIPT.md`, `docs/FOUNDER_STATUS_LIVE.md`  
**Uwaga:** plik `docs/INVESTOR_DEMO_GAPS.md` **nie istnieje** w repo (szukano 2026-05-24).

**Screenshots:** `docs/investor-audit-screenshots/` (01–02 z MCP browser; pozostałe URL poniżej).

---

## Executive summary + Investor readiness score (0-10) with evidence

### Werdykt jednym zdaniem (dla Tomasza)

**Możecie pokazać live demo bez logowania już dziś** — produkcja jest zdrowa, `/demo` pokazuje **prawdziwe dopasowania z bazy** (`live_db`), a metryki inwestorskie są uczciwie opisane jako „pilot”. **Pełny scenariusz zalogowany** wymaga **hasła `demo@twin.career` w sejfie** + **jednej próby suchą** przed spotkaniem. **Nie udawajcie skali użytkowników ani przychodu** — w `mvp-stats` jest **3 konta**, **0 zweryfikowanych placementów**, **0 płacących**.

### Ocena gotowości inwestorskiej: **7 / 10**

| Wymiar | Ocena | Dowód |
|--------|------:|-------|
| Infrastruktura / API | **9/10** | `GET /api/v1/health` → 200 `status: ok`; Celery worker + beat aktywne; mail, Stripe checkout, Google + MS Calendar skonfigurowane (`health?ops=1`) |
| Demo publiczne (bez loginu) | **8.5/10** | `GET /api/v1/demo/snapshot` → `source: live_db`, `demo_user_configured: true`; `./scripts/verify-investor-demo-ready.sh` → exit 0 |
| Scenariusz zalogowany | **6.5/10** | Seed na prod OK (16 aplikacji, 3 rozmowy w metrykach); **brak audytu E2E loginu w tej sesji** — zależy od hasła founder |
| Traction / revenue story | **3.5/10** | `registered_users: 3`, `verified_placements: 0`, `paid_subscribers: 0`, MRR `$0` — uczciwe, ale słabe dla „traction” |
| Jakość brancha dev | **5.5/10** | `pytest`: **368 passed, 2 failed**; `npm run build` na branchu: **FAIL** (WIP i18n w `ApplyTrackingCounter.tsx`) |
| Spójność deploy | **7/10** | Prod API `8eab817` ≠ lokalny HEAD `2815d83` — na prod nie ma jeszcze niezmergowanego WIP competitive-job |

**Poprawa vs audyt 2026-05-23:** wtedy `/demo/snapshot` dawał **HTTP 500** i `static_fallback` — **dziś naprawione** (`live_db`).

---

### P0 BLOCKERS table (must fix before demo)

| # | Blocker | Impact | Fix Estimate | Owner |
|---|---------|--------|--------------|-------|
| 1 | **Brak potwierdzonej próby suchą scenariusza zalogowanego** (`demo@twin.career`) | Ryzyko pustego dashboardu / złego hasła na żywo przed inwestorem | 30–45 min | **Tomasz** — hasło w sejfie; `scripts/seed-investor-demo.py --reset-password` na Railway jeśli trzeba; przejście `INVESTOR_DEMO_SCRIPT.md` kroki 1–9 |
| 2 | **Metryki traction = pilot, nie scale** (`mvp-stats`: 3 users, 0 placements, $0 MRR) | Inwestor zapyta „ile macie użytkowników?” — odpowiedź musi być przygotowana, nie zaskoczenie | 15 min przygotowania talking points | **Tomasz** — pokazać `/investor/metrics` z disclaimerem „early stage / not audited MAU” |
| 3 | **`verified_placements: 0` na prod** | Nie można obiecywać działającego modelu success fee na żywo | 1–2 h (seed placement event + pokaz steppera) **lub** świadomie **pominąć** placement w demo | **Eng** (seed) / **Tomasz** (narracja: „mechanizm zbudowany, zero prod placements”) — `backend/app/api/placement.py`, dashboard `PlacementStateStepper` |
| 4 | **Branch `cursor/vision-next-slice`: `npm run build` FAIL** (niezacommitowane komponenty job board) | Blokuje merge/deploy nowych UI competitive features przed kolejnym demo | 1–2 h | **Eng** — dodać klucze `jobBoard.applyCount*` do `frontend/src/i18n.ts` lub wycofać WIP z buildu; plik: `frontend/src/components/job/ApplyTrackingCounter.tsx` |
| 5 | **2 failing pytest na branchu** | Słaba historia „368 testów zielonych” jeśli inwestor techniczny zapyta o CI | 1–3 h | **Eng** — `tests/test_auto_apply_investor_demo.py` (mock Playwright nie trzyma); ewent. flaki `test_job_competitive_api.py` w pełnym suite |

---

### P1 ISSUES table

| # | Issue | Impact | Fix Estimate |
|---|-------|--------|--------------|
| 1 | **`apple_oauth_configured: false`** na prod (`health?ops=1`) | iOS-first użytkownicy bez Apple Sign-In; UI już ukrywa przycisk — OK jeśli nie pokazujecie Apple | 2–4 h (Apple Developer + Railway env) — `backend/app/services/apple_oauth.py` |
| 2 | **`data_room_s3_enabled: false`** (`mvp-stats`) — upload lokalny/demo | Due diligence „prawdziwy S3” nie na prod | Founder env `S3_*` + `scripts/railway-apply-production-env.sh` — 30 min founder + redeploy |
| 3 | **Prod commit ≠ lokalny HEAD** (`8eab817` vs `2815d83`) | Competitive-job WIP (~59 commitów na `origin/cursor/competitive-job-features` względem `main`) nie na Vercel/Railway | Merge + deploy po zielonym buildzie — 2–4 h |
| 4 | **Nightly sweep: `total_applications_submitted: 0`** w ostatnim biegu (snapshot) | Słabszy dowód „agent pracował w nocy” | Sprawdzić consent/threshold; opcjonalnie `scripts/trigger-founder-auto-apply.sh` | 1 h |
| 5 | **Recruiter inbox** — token może być zużyty po testach accept | Krok demo recruiter może być pusty | Re-seed `--print-credentials` — `scripts/seed-investor-demo.py` | 20 min |
| 6 | **Dokumentacja founder nieaktualna** — `FOUNDER_STATUS_LIVE.md` wskazuje branch `phase1-monorepo-scaffold` | Mylące dla zespołu | 15 min aktualizacji docs | 15 min |

---

### P2 NICE-TO-HAVES table

| # | Enhancement | Impact | Effort |
|---|-------------|--------|--------|
| 1 | 1 płatny subskrybent testowy na Stripe (prod test mode) | Wzmocnienie „billing works” poza `stripe_checkout_ready: true` | 2 h |
| 2 | Screenshoty `/status`, `/dashboard`, `/dashboard/calendar` po loginie demo | Backup deck | 30 min |
| 3 | Merge `fix-company-login-route`, `fix-logo-brand-colors` (~67 commitów każdy vs `main`) | UX polish | 1 dzień review |
| 4 | Migracja modelu Claude przed 2026-06-15 (deprecation warning w testach) | Uniknięcie przestoju AI modali | 2 h |
| 5 | Nagranie wideo 5 min „vision slice” (unified feed, gamification) po deploy | Backup gdy sieć padnie | 1 h |

---

### INVESTOR READINESS CHECKLIST (checkboxes with ✅/❌/🟡 and notes)

| Obszar | Status | Notatka |
|--------|--------|---------|
| API health | ✅ | `GET /api/v1/health` → 200 |
| Ops health (integracje) | ✅ | `GET /api/v1/health?ops=1` — mail, Google/GitHub OAuth, MS calendar, Stripe, scrape worker, beat |
| Celery worker + nightly beat | ✅ | `GET /api/v1/health/celery-status` → `worker_active: true` |
| Public MVP metrics | ✅ | `GET /api/v1/public/mvp-stats` — 637 jobs, DB reachable |
| Demo snapshot live | ✅ | `GET /api/v1/demo/snapshot` → `live_db`, top matches 92–100% |
| Verify script | ✅ | `./scripts/verify-investor-demo-ready.sh` exit 0 |
| Frontend `/demo` | ✅ | HTTP 200; ranked roles z prod (browser audit) |
| Frontend `/investor/metrics` | ✅ | HTTP 200; liczby zgodne z API |
| Frontend `/status` | 🟡 | HTTP 200 (SSR); **nie parsowano JSON** w tej sesji — sprawdź `git_commit` vs `8eab817` |
| Logged-in demo user | 🟡 | Skonfigurowany na API (`demo_user_configured: true`); **hasło tylko u founder** |
| Verified placements story | ❌ | `verified_placements: 0` |
| Paying subscribers / MRR | ❌ | `paid_subscribers: 0`, MRR `0` — uczciwie opisane na stronie |
| Apple Sign-In prod | ❌ | `apple_oauth_configured: false` |
| Data room S3 prod | ❌ | `data_room_s3_enabled: false` |
| Local `npm run build` (branch) | ❌ | TypeScript i18n w job components WIP |
| Full pytest green (branch) | 🟡 | 368/371 pass (99.5%); 2 fail |
| Competitive-job branch merged to prod | ❌ | WIP na `cursor/vision-next-slice`; ~59 commits ahead of `main` on remote branch |
| Screenshots w repo | 🟡 | `01-demo-live-preview.png`, `02-demo-ranked-roles.png`; reszta URL poniżej |

---

### RECOMMENDED NEXT 7 DAYS (Day 1-2 through Day 7)

**Day 1–2 (przed spotkaniem — founder + 1h eng)**  
- Uruchom `./scripts/verify-investor-demo-ready.sh`.  
- Suchy przebieg `docs/INVESTOR_DEMO_SCRIPT.md` na `demo@twin.career`.  
- Przygotuj 3 zdania: *pre-revenue*, *pilot 3 kont*, *637 ofert z registry*.  
- Opcjonalnie: re-seed recruiter token (`seed-investor-demo.py --print-credentials`).

**Day 3–4 (jakość brancha)**  
- Napraw i18n → `npm run build` green.  
- Napraw 2 pytest (auto-apply mock / isolation).  
- Merge `cursor/vision-next-slice` → deploy Railway + Vercel.

**Day 5 (placement lub honest skip)**  
- Albo 1 zweryfikowany placement na demo DB (stepper + `placement.py`), albo oficjalnie pominąć w decku.

**Day 6 (due diligence)**  
- S3 data room na Railway **lub** zostać przy „demo upload” z transparentnym copy.

**Day 7 (materiały zapasowe)**  
- Nagranie 5 min: `/demo` → metrics → calculator → 2 min logged-in dashboard/calendar.  
- Zaktualizuj `FOUNDER_STATUS_LIVE.md`.

---

### BACKUP PLAN (localhost, video, screenshots, vision focus)

1. **Bez sieci / awaria API:** nagranie z `docs/investor-audit-screenshots/` + JSON z `GET /api/v1/demo/snapshot` (zapisany curl).  
2. **localhost:** `docker compose up` + seed lokalny — tylko jeśli prod padnie; **nie** zastępuje „live prod” bez wyjaśnienia.  
3. **Vision / strategic narrative** (bez obietnicy że na prod): unified feed, opportunity forecast, gamification — branch `cursor/strategic-vision-features` (**zmergowany do prod w `8eab817`** częściowo); competitive UI — dopiero po merge WIP.  
4. **URLs do ręcznego screenshotu:**  
   - https://twin-sooty.vercel.app/demo  
   - https://twin-sooty.vercel.app/investor/metrics  
   - https://twin-sooty.vercel.app/status  
   - https://twin-sooty.vercel.app/investor/calculator  
   - https://twin-sooty.vercel.app/workspace/investor  
   - https://twin-sooty.vercel.app/login/candidate  
   - https://twin-production-bcd9.up.railway.app/api/v1/demo/snapshot  

---

### 15-min demo script walkthrough

**North star (powiedz raz):** *TWIN zamiast tysięcy CV i spamu rozmów — krótki kalendarz momentów gotowych do akceptacji.*

| Min | Pokaż | Powiedz (PL) |
|-----|-------|----------------|
| 0–2 | `/` → **See demo** | Autonomiczny agent kariery: znajdź, dopasuj, aplikuj, umów rozmowę. |
| 2–5 | `/demo` — lista 100%, 94%… | To **live z bazy demo** (`live_db`), ten sam matcher co dashboard — nie mock HTML. |
| 5–7 | `/investor/metrics` | Uczciwy pilot: 637 ofert, 16 aplikacji śledzonych, **pre-revenue**, integracje live. |
| 7–9 | `/investor/calculator` | Scenariusz 5-letni — **ilustracja**, nie audyt finansowy. |
| 9–12 | `/login/candidate` → `/dashboard` | Konto demo: ranking ofert, **Company intel** / **Optimize CV** (1–2 modale max). |
| 12–14 | `/dashboard/calendar` | Jedna **umówiona rozmowa** (seed) + eksport ICS — kalendarz akceptacji. |
| 14–15 | `/workspace/investor` lub recruiter inbox (token) | Dwustronny marketplace: kandydat + rekruter batch accept. |

**Nie pokazuj:** Apple login, płatny checkout jako „mamy przychód”, placement verified jako „już zarabiamy”.

---

### Answers to investor 4 questions with evidence

#### 1. Does it work? (Technical)

**Tak — warstwa platformy działa na produkcji.**

- API: `GET /api/v1/health` → `status: ok`, commit `8eab817` (`backend/app/main.py`).  
- Worker: `GET /api/v1/health/celery-status` → `worker_active: true`, `nightly_auto_apply_beat_enabled: true`.  
- Demo pipeline: `GET /api/v1/demo/snapshot` → `demo_mode: true`, `source: live_db`, 5 `top_matches`, `scheduled_interview` z Meet link (`backend/app/api/demo.py`, `backend/app/services/demo_snapshot.py`).  
- Scraping registry: 637 validated jobs, 30 boards (`mvp-stats`).  
- Testy: **368 passed** / 371 collected (~99.5%) na branchu audytowanym.  
- Ścieżki kodu: auth `backend/app/api/auth.py`, auto-apply `backend/app/services/auto_apply_service.py`, career AI `backend/app/api/router.py` → `/career-assistant/*`, ~**191** unikalnych tras API (`scripts/audit-list-api-routes.py`).

**Słabości techniczne do przyznania:** 2 failing tests na branchu; lokalny build czerwony przez WIP; Playwright auto-apply zależy od boardów (demo: symulacja na `/demo` + opcjonalnie real apply po zalogowaniu).

#### 2. Is the market real? (Business)

**Rynek jest realny; wasza skala na prod to jeszcze pilot.**

- **637** zwalidowanych ofert, **30** job boards w rejestrze — dowód że agregacja działa (`GET /api/v1/public/mvp-stats`).  
- Boards w runbooku: pracuj.pl, rocketjobs.pl (`.cursorrules` Phase 1).  
- Polska + remote/hybrid w seed demo (Warsaw, Kraków, Gdańsk).  
- Konkurencja: strony `/compare/*` w frontend (LinkedIn, agencies, Dover, Moonhub).  
- **Nie twierdźcie** że macie udział rynku — `registered_users: 3`.

#### 3. Can you execute? (Traction)

**Wykonanie inżynierskie: silne. Wykonanie go-to-market: wczesne.**

- Dowód shippingu: naprawa `/demo/snapshot` z 500 → `live_db` w 48h; strategic vision merge (`8eab817`); 82 strony `page.tsx`, rozbudowany investor lane.  
- Operacje: `mail_configured`, `stripe_checkout_ready`, oba kalendarze — gotowe do E2E.  
- Traction liczby: **16** applications, **3** interviews scheduled, **2** profiles with CV, **0** verified placements, **0** paid — wszystko spójne między API a `/investor/metrics`.  
- Nightly: ostatni run w snapshot (`nightly_last_run` 2026-05-24) — pokazuje automatyzację, ale `total_applications_submitted: 0` w tym biegu.

#### 4. Why you? (Moat)

**Moat = pipeline „acceptance-ready calendar” + automatyzacja z consent, nie kolejna tablica ogłoszeń.**

- **Matching + ranked feed** zamiast volume (`job_matches`, dashboard cards).  
- **Auto-apply** z GDPR consent, limitem dziennym, Playwright (`demo/snapshot` → `auto_apply.consent_active`).  
- **Career assistant** (company intel, CV optimize, interview prep) — API `/api/v1/career-assistant/*`.  
- **Placement verification** state machine (`backend/app/api/placement.py`, `docs/PLACEMENT_VERIFICATION.md`) — produktowo gotowe, **metryki placement jeszcze 0**.  
- **Recruiter batch inbox** — akceptacja/odrzucenie zamiast ręcznego przesiewu CV.  
- **Uczciwość jako przewaga:** publiczne metryki i disclaimer „not audited MAU” budują zaufanie vs inflated KPIs.

---

## Wyniki checków (2026-05-24 ~15:00 UTC)

### curl produkcja

| Endpoint | HTTP | Kluczowe pola |
|----------|------|----------------|
| `https://twin-sooty.vercel.app/status` | 200 | SSR (sprawdź commit w UI) |
| `GET …/api/v1/health?ops=1` | 200 | mail ✅, stripe ✅, google/ms cal ✅, apple ❌, scrape ✅ |
| `GET …/api/v1/public/mvp-stats` | 200 | jobs 637, users 3, apps 16, interviews 3, placements 0, MRR 0 |
| `GET …/api/v1/demo/snapshot` | 200 | `live_db`, Alex Kowalski (demo), interview 2026-05-26 |
| `GET …/api/v1/health/celery-status` | 200 | worker ✅, beat ✅ |

### pytest

```text
368 passed, 2 failed, 1 skipped (~326s)
FAILED tests/test_auto_apply_investor_demo.py::test_auto_apply_investor_demo_skips_playwright
FAILED tests/test_job_competitive_api.py::test_job_match_score_endpoint  # flaki w full suite; solo PASS
```

### npm run build (branch `cursor/vision-next-slice`)

```text
FAIL — ApplyTrackingCounter.tsx: jobBoard.applyCount not in TranslationKey (frontend/src/i18n.ts)
```

### Przegląd ścieżek krytycznych (kod)

| Obszar | Pliki / endpointy | Ocena |
|--------|-------------------|-------|
| Auth | `backend/app/api/auth.py`, OAuth health flags | ✅ prod; 🟡 Apple off |
| Demo | `backend/app/api/demo.py`, `demo_snapshot.py` | ✅ live_db |
| Dashboard | `frontend/src/app/dashboard/page.tsx` | ✅ na prod deploy |
| Auto-apply | `auto_apply_service.py`, `POST …/applications/auto-apply` | ✅; test mock do poprawy |
| Placement | `placement.py`, dashboard stepper | 🟡 kod ✅, metryki 0 |
| Investor | `/investor/metrics`, `/investor/calculator`, `/workspace/investor` | ✅ |
| AI | `/api/v1/career-assistant/*`, `company_intelligence` | ✅ (wymaga klucza Anthropic live) |

### Luki branchy (vs `origin/main`)

| Branch | Commits ahead of main (approx.) | Uwagi |
|--------|--------------------------------:|-------|
| `cursor/strategic-vision-features` | ~65 | Część już w prod (`8eab817` merge PR #11) |
| `cursor/competitive-job-features` | ~59 | WIP zmergowany lokalnie na `vision-next-slice`; **nie na prod** |
| `cursor/fix-company-login-route` | ~67 | UX login company |
| `cursor/fix-logo-brand-colors` | (remote exists) | Branding |

---

## Metadane audytu

- **Poprzedni blocker P0 (snapshot 500):** **RESOLVED** na prod.  
- **Rekomendacja GO/NO-GO:** **GO WITH CONDITIONS** — demo bez loginu + metrics **tak**; pełny login **tylko po suchym przebiegu**; traction/revenue **szczerze jako pilot**.
