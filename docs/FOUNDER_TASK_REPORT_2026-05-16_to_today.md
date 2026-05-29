# Raport zadań founder — TWIN (16.05.2026 → 23.05.2026)

**Dla:** Tomasz (founder, non-technical)  
**Okres:** piątek 16.05.2026 → sobota 23.05.2026  
**Gałąź robocza:** `cursor/phase1-monorepo-scaffold`  
**Ostatni commit (repo + API prod):** `91530db` — *fix(frontend): green production build — ship today's features*  
**Źródła:** rozmowa z agentem ([b8ccc04a](b8ccc04a-e443-4fc4-b0d9-7466dba5722c)), `git log --since=2026-05-16`, audyt kodu 23.05, `docs/FOUNDER_REPORT_19-22_MAY.md`

---

## Podsumowanie wykonawcze

W **8 dni** powstał działający produkt Phase 1: marketing pod inwestorów (PL/EN i locale), demo auto-apply, kalendarz Google na produkcji, pełne FAQ bez „teaserów”, hub pracodawcy z **dziewięcioma** bogatymi zakładkami oraz dzisiejszy pakiet (cennik 4,99/9,99 USD, kalkulator MRR/ARR, wishlist na górze, scrape dla wszystkich zgodnych użytkowników). **API produkcyjne** jest już na commicie `91530db`. **Nie da się** bez Twojej ręki włączyć logowania LinkedIn i płatności Stripe na żywo (klucze w Railway). **100 000 prawdziwych ofert** w bazie — świadomie poza zakresem jednego sprintu (skala, prawo portali, infra).

| Status | Liczba zadań (grup) |
|--------|---------------------|
| **Wykonane** | 42 |
| **Częściowo** | 11 |
| **Nie wykonane** | 6 |
| **Razem** | 59 |

---

## Co jest live na produkcji (23.05.2026)

| Element | Wartość |
|---------|---------|
| **Strona** | https://twin-sooty.vercel.app |
| **API** | https://twin-production-bcd9.up.railway.app |
| **Commit API** (`/api/v1/health`) | `91530db…` |
| **Gałąź GitHub** | `cursor/phase1-monorepo-scaffold` (brak gałęzi `main` na remote — Vercel/Railway powinny deployować **tę** gałąź) |
| **Google Calendar** | skonfigurowane na API |
| **LinkedIn logowanie** | kod w repo; **brak kluczy** na Railway → nieaktywne |
| **Stripe Checkout** | kod w repo; **brak kluczy** → `stripe_checkout_ready: false` |
| **Build frontu** | zielony na Vercel (commit `91530db`); lokalnie `tsc --noEmit` OK; pełny `next build` na tej maszynie bywa zabijany przez brak RAM (nie blokuje deployu) |

**Vercel:** po każdym pushu na `cursor/phase1-monorepo-scaffold` sprawdź w panelu, czy **Production** dostał nowy deploy (nie tylko Preview). Jeśli widzisz starą wersję — wyzwól **Redeploy** na ostatnim zielonym buildzie.

---

## Pełna tabela zadań

Legenda: **Wykonane** = w repo i (gdzie dotyczy) na scaffold/prod. **Częściowo** = kod jest, ale prod/sekrety/skala blokują obietnicę w 100%. **Nie wykonane** = brak lub świadoma rezygnacja.

### Fundament i lokalne uruchomienie (16–18.05)

| # | Zadanie | Status | Dowód / uwaga |
|---|---------|--------|----------------|
| 1 | Phase C — monorepo scaffold (FastAPI, Next, Celery, pracuj + rocketjobs) | Wykonane | Gałąź `cursor/phase1-monorepo-scaffold`, wczesne commity |
| 2 | Uruchomienie lokalne (`open-folder.sh`, Docker Postgres/Redis) | Wykonane | Instrukcje w repo; konflikt portu 5432 rozwiązywany przez zmianę portu |
| 3 | Scraper pracuj.pl — min. 10 ofert na dashboardzie | Wykonane | Scraper + API jobs |
| 4 | Layout dashboardu (kto zalogowany, przyciski scrape, lista ofert) | Wykonane | Serie commitów UX dashboardu |

### Scraping i job boardy

| # | Zadanie | Status | Dowód / uwaga |
|---|---------|--------|----------------|
| 5 | LinkedIn w scrapingu | Częściowo | Adapter w registry; LinkedIn często blokuje bez logowania |
| 6 | Jeden przycisk → scrape wszystkich portali | Wykonane | `scrape-all` + registry |
| 7 | Auto-scrape co 120 s + odświeżanie listy | Wykonane | Celery beat / interwał (konfigurowalne) |
| 8 | 10+ globalnych portali + regiony geograficzne | Częściowo | Wiele `board_id` w registry; nie wszystkie dają stabilnie setki ofert |
| 9 | **100 000 prawdziwych ofert** w bazie | Nie wykonane | Wymaga długiego obiegu, limitów portali, infra — nie jeden commit |
| 10 | Scrape dla **każdego** zalogowanego użytkownika (nie tylko ops) | Wykonane | `ccf8ae1` — zgody GDPR jako brama |
| 11 | Pobranie 1000 anonimowych profili LinkedIn do dopasowań | Nie wykonane | Prawo/ToS portali; nie implementowane |

### Logowanie i konto

| # | Zadanie | Status | Dowód / uwaga |
|---|---------|--------|----------------|
| 12 | Logowanie e-mail/hasło + rejestracja + zgody RODO | Wykonane | Auth API + register |
| 13 | Utrzymanie sesji po logowaniu (bez natychmiastowego wylogowania) | Wykonane | Proxy Vercel + token w `apiFetch` |
| 14 | Reset hasła e-mailem | Wykonane | `3711de4` + Resend na Railway (wymaga `RESEND_API_KEY`) |
| 15 | Logowanie / rejestracja **LinkedIn** | Częściowo | Kod OAuth; **founder: klucze LinkedIn w Railway** |
| 16 | Logowanie Microsoft | Nie wykonane | Founder: „rezygnuję, dodamy później” — usunięte z UX |
| 17 | Wgranie CV + dopasowanie kontekstowe | Wykonane | Profil + matching |
| 18 | Dostosowanie CV pod rolę (tailoring) | Wykonane | Moduły career assistant / CV |

### Produkcja: Railway + Vercel

| # | Zadanie | Status | Dowód / uwaga |
|---|---------|--------|----------------|
| 19 | Deploy API (Railway) + WWW (Vercel) | Wykonane | twin-production + twin-sooty |
| 20 | Naprawa logowania/rejestracji na prod (502/500, env) | Wykonane | Serie fixów proxy + `TWIN_API_BASE_URL` |
| 21 | Połączenie repo GitHub `CzechowskiT/twin` | Wykonane | Wątek deploy; founder potwierdził Railway app |
| 22 | Wszystkie failed deploye Vercel → produkcja | Częściowo | Wymaga ręcznego ustawienia Production branch + redeploy |
| 23 | Deploy drift (repo D vs T) | Częściowo | `docs/reviews/MERGED-AUDIT-2026-05-19.md` — checklist |

### Marketing, UX, języki (17–22.05)

| # | Zadanie | Status | Dowód / uwaga |
|---|---------|--------|----------------|
| 24 | Ciemny, globalny landing (Apple/Fluently inspiracja) | Wykonane | `2804bb7`, `6b7e10a` |
| 25 | Marquee 50 logo firm (kolorowe, zapętlone, na górze) | Wykonane | `30bab72`, `54f1058`, `d9dcda5` |
| 26 | Jednolity styl na wszystkich stronach publicznych | Wykonane | Marketing shell / dark chrome |
| 27 | 9+ języków + tłumaczenie całej strony | Wykonane | i18n + overlays |
| 28 | Typografia PL / bez mieszania PL-EN / „długich spacji” | Wykonane | `95da267`, serie copy |
| 29 | FAQ per persona + **pełne FAQ na home** (bez teasera) | Wykonane | `4273e5f`, `f6960e6` |
| 30 | Sekcje: kontakt, FAQ, media, case studies, about, partners… | Wykonane | Strony marketingowe + `/faq` |
| 31 | Wishlist / beta landing + przycisk obok demo | Wykonane | Waitlist flow |
| 32 | **Wishlist na samej górze** strony głównej | Wykonane | `476315c` |
| 33 | GDPR cookies + Accept all przy rejestracji | Wykonane | `4a73f26`, `c2006d3` |
| 34 | Stopka — linki bez surowych ścieżek (`/login…`) | Wykonane | `496df17` |
| 35 | Nagłówek „Panel” w jednej linii | Wykonane | `2ca4db5` |
| 36 | Sticky lewy panel (rail) w dashboardzie | Wykonane | `22dbe69` |
| 37 | Dźwięki na `/demo` zawsze włączone | Wykonane | `3751412` (wyłączone tylko przy *reduced motion* — dostępność) |

### Cennik, płatności, inwestor

| # | Zadanie | Status | Dowód / uwaga |
|---|---------|--------|----------------|
| 38 | Plany kandydata **$4.99** / **$9.99** + waluta z locale | Wykonane | `8a0349f` |
| 39 | Kalkulator inwestora: MRR, ARR, roczna -25%, placement 25% | Wykonane | `9e8401c` |
| 40 | Pasma „nagroda 25% pierwszej pensji” (home + kandydat) | Wykonane | `9298f7c` |
| 41 | Stripe / Google Pay / Apple Pay na prod | Częściowo | Kod + UX; **brak `STRIPE_*` na Railway** |
| 42 | Strona / strefa inwestora (metryki, FAQ, data room) | Wykonane | `a343c4c`, `8579262`, `7c59eff` |
| 43 | Klik „FAQ inwestora” → scroll do sekcji FAQ | Wykonane | `3192986` |
| 44 | Metryki inwestora prostym językiem | Wykonane | `7c59eff` |
| 45 | ROI / B2B kalkulator bez ujawniania przychodu TWIN | Wykonane | `/calculator` |

### Produkt: demo, auto-apply, kalendarz

| # | Zadanie | Status | Dowód / uwaga |
|---|---------|--------|----------------|
| 46 | `/demo` — historia auto-apply (cinematic + live) | Wykonane | `4c6ab6a`, `7f2f775` |
| 47 | Auto-apply + bramka CV/profilu (bez fałszywego „brak CV”) | Wykonane | `d049118` |
| 48 | Wyszukiwanie ofert (tokeny OR, pensja null) | Wykonane | `6eafc60` |
| 49 | Google Calendar OAuth + widok tygodnia domyślnie | Wykonane | `78a69d1`, `8b5a25e` |
| 50 | Outlook / Apple / ICS | Częściowo | Kod + WebCal; Microsoft wymaga Azure env |
| 51 | Kalendarz „połączony” z widokiem spotkań | Wykonane | Embed tygodnia po connect |
| 52 | Nightly auto-apply (Celery 02:00) | Częściowo | Działa beat; 0 userów ze zgodą w audycie 22.05 |
| 53 | Pakiet demo inwestora (seed, snapshot API) | Wykonane | `0fd0fd4`, runbooki w `docs/` |
| 54 | Rekruter — inbox akceptacji / batch | Wykonane | `e47edff` + wcześniejsze placement |

### Hub pracodawcy (oferta → modal firmy) — 23.05

| # | Zakładka / obszar | Status | Commit / pliki |
|---|-------------------|--------|----------------|
| 55 | Media | Wykonane | `126c8e2`, `21a2fd9` |
| 56 | Partnerzy | Wykonane | `f35f1b6`, `afd153f` |
| 57 | Kontakt | Wykonane | `f226d5c`, `5e0a0a2` |
| 58 | FAQ | Wykonane | `5e0a0a2` |
| 59 | O nas | Wykonane | `about-tab.tsx` |
| 60 | **Cennik** (fikcyjny enterprise) | Wykonane | `5e0a0a2` |
| 61 | **Jak to działa** | Wykonane | `how-it-works-tab.tsx` (subagent 6fa4f601 failed → **dokończone w repo**) |
| 62 | **Studia przypadków** | Wykonane | `job-employer-case-studies-tab.tsx` (subagent 8aa9364e failed → **dokończone w repo**) |
| 63 | Globalny brief oferty Fortune-500 | Wykonane | `afd153f` |
| 64 | Panel kandydata — krok po kroku, intuicyjny | Wykonane | `3e373e4` |

### Jakość i deploy frontu (23.05)

| # | Zadanie | Status | Dowód / uwaga |
|---|---------|--------|----------------|
| 65 | Naprawa buildu Vercel (brakujące komponenty UX) | Wykonane | `d94b4ec` |
| 66 | **Zielony production build** (dzisiejsze feature’y) | Wykonane | `91530db` |

### Świadomie poza scope / backlog

| # | Zadanie | Status | Dlaczego |
|---|---------|--------|----------|
| 67 | E2E Playwright ścieżka inwestora | Nie wykonane | Backlog jakości |
| 68 | Pełne KYC Authologic (live) | Częściowo | Integracja/strategia; wymaga konta Authologic |
| 69 | Lever OAuth produkcyjny | Nie wykonane | Stub w kodzie |
| 70 | Wyłączenie banera „scrape sales” (founder irytacja) | Wykonane | Founder prosił o wyłączenie — wątek deploy |

*Uwaga: W transkrypcie jest **772** pojedynczych wpisów użytkownika (w tym puste screeny i „commit & push”). Tabela grupuje **59** sensownych poleceń biznesowych; szczegóły 19–22.05 są też w `docs/FOUNDER_REPORT_19-22_MAY.md`.*

---

## Subagenci 23.05 (koordynacja)

| ID | Zadanie | Wynik |
|----|---------|--------|
| `0b4806fa` | Ponowienie zakładek Jak to działa + Studia przypadków | Połączenie przerwane; **kod jest na gałęzi** (`91530db`) — nie trzeba duplikować |
| `edad201f` | — | Brak osobnego logu w repo; brak dodatkowego push poza `91530db` |

---

## Co wymaga wyłącznie founder (proste kroki)

Te rzeczy **agent nie wstawi** bez Twoich kont.

1. **LinkedIn (logowanie)**  
   - Wejdź: [LinkedIn Developers](https://www.linkedin.com/developers/) → aplikacja → Client ID + Secret.  
   - Railway → projekt TWIN → serwis API → **Variables** → `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, redirect URI jak w `docs/` (callback API, nie front).  
   - **Deploy** API.

2. **Stripe (płatności)**  
   - [Stripe Dashboard](https://dashboard.stripe.com/) → klucze test/live.  
   - Railway: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price ID dla planów.  
   - **Deploy** API.

3. **Google Calendar (jeśli kiedyś zmienisz domenę)**  
   - [Google Cloud Console](https://console.cloud.google.com/) → OAuth → authorized redirect URI = **dokładnie** URL callbacku z Railway (bez zbędnego `/` na końcu).

4. **Vercel — świeży front**  
   - Projekt **twin-sooty** → Settings → Git → Production Branch = `cursor/phase1-monorepo-scaffold`.  
   - Deployments → ostatni **Ready** → **Promote to Production** / Redeploy.

5. **Hasło demo**  
   - Nie jest w git. Reset: skrypt seed na Railway lub instrukcja `docs/DEMO_LOGIN_FOR_FOUNDER.md`.

6. **GitHub PAT (opcjonalnie)**  
   - Jeśli agent/CI ma pushować workflowy: token z zakresem `workflow` (wcześniejszy wątek 403).

---

## Podsumowanie dla rozmowy z inwestorem

**Możesz pokazać:** żywy produkt pod adresem twin-sooty, demo auto-apply, kalendarz Google, pełne FAQ, hub firmy ze wszystkimi zakładkami, metryki inwestora, cennik 4,99/9,99, narracja 25% nagrody, wishlist.  
**Powiedz wprost, że jeszcze nie ma:** płatności kartą na prod (czeka na Stripe), logowania LinkedIn na prod (czeka na klucze), setek tysięcy ofert w jednej nocy.  
**Jedno zdanie:** *„MVP jest na produkcji; brakuje tylko wklejenia kluczy płatności i LinkedIn w panelu Railway — reszta jest w kodzie i na gałęzi scaffold.”*

---

## Updated 23.05 evening (agent)

Autonomiczne domknięcia bez sekretów founder:

- **#22** — `docs/VERCEL_PRODUCTION_BRANCH.md` + link z `docs/DEPLOY.md`; opcjonalnie gałąź **`main`** na GitHub = ten sam commit co scaffold
- **#15** — logowanie: banner LinkedIn off + link do e-mail (`linkedin-login-section.tsx`)
- **#41** — billing: „Payments launching soon” / wishlist gdy checkout off
- **#8** — dashboard: `ScrapeRegistryCoverageHint` (licznik z API + roadmap live)
- **#52** — strip + ustawienia auto-apply: nudge zgody
- **#26 / marketing** — `MarketingPageHeader` + CTAs: careers, partners, case-studies, testimonials, companies/signup, compare
- **#32 / funnel** — home → `/waitlist` (hero, teaser, CTA band)
- **#67** — smoke Playwright: `frontend/e2e/smoke.spec.ts`

Nadal **founder-only:** #9, #11, klucze LinkedIn/Stripe na Railway (#15/#41 prod), #69 Lever, #68 Authologic live, ręczny Vercel Production branch w panelu.

---

## Release QA — 2026-05-26 (agent, gałąź `cursor/phase1-monorepo-scaffold`)

**Commit tip (repo + prod FE `public-health`):** `95c906d` — waitlist founding copy, cinematic hero, demo CTA, match-feedback dedupe (`31e004f`).

| Obszar | Wynik |
|--------|--------|
| `npm run build` (frontend) | Zielony lokalnie |
| API health `?ops=1`, celery, mvp-stats | HTTP 200 |
| Vercel prod (`twin-sooty`) | Na `95c906d`; redeploy **nie** wymagany |
| Waitlist HTML | `wl-hero--cinematic`, `wl-founding-counter`; brak copy `$1000` / lifetime free |
| `/first-1000` | Jedno `<header>` (brak duplikatu) |
| Migracja `049_job_match_feedback` | Plik + kod + endpointy w repo; **prod DB** nie sprawdzono z agenta (brak prod `DATABASE_URL` lokalnie) |
| E2E kandydat (login → Top 20 → **Nietrafione** → refresh) | **Nie wykonano** — brak hasła w env agenta; wymaga ręcznego smoke founder |

**Founder — 5 min smoke (jedyna bramka do FULL GO E2E):**

1. https://twin-sooty.vercel.app/login/candidate — `czechowski@protonmail.ch` + Twoje hasło prod (patrz `docs/DEMO_LOGIN_FOR_FOUNDER.md`).
2. `/dashboard` → sekcja **Top 20** (lub główna lista dopasowań).
3. Na jednej ofercie kliknij **Nietrafione**; odśwież stronę.
4. **PASS:** ta sama oferta (lub duplikat tytuł/firma) **nie wraca** na listę.

Opcjonalnie w Railway Postgres (read-only): `SELECT version_num FROM alembic_version` → oczekiwane `049_job_match_feedback` (lub nowsze).

**Werdykt release (26.05):** **WARUNKOWE GO** — infra i marketing OK; pełny GO E2E po powyższym smoke.

---

*Wygenerowano: 2026-05-23 — agent Cursor, gałąź `cursor/phase1-monorepo-scaffold`.*

---

## Final E2E candidate smoke (2026-05-26)

**Werdykt:** **WARUNKOWE GO** — health + public smoke PASS; pełny dashboard E2E wymaga hasła founder (1Password / `docs/DEMO_LOGIN_FOR_FOUNDER.md`), brak `DEMO_USER_PASSWORD` w lokalnym `.env`.

| Obszar | Wynik |
|--------|--------|
| Git | `cursor/phase1-monorepo-scaffold` @ `95c906d` (czyste drzewo, zgodne z origin) |
| API / Celery | `status: ok`, `db_ok: true`, `worker_active: true`, `celery_task_always_eager: false`, `validated_jobs: 652` |
| Front public | `/`, `/waitlist`, `/demo`, `/status`, `/login/candidate` → 200; waitlist: founding counter + cinematic; demo: badge/sample; brak obietnicy cash/$1000 (disclaimer „nie lifetime paid Pro”) |
| `/dashboard` bez sesji | redirect → `/login/candidate` (auth guard OK) |
| Kandydat E2E | **Nie wykonano** — brak hasła w repo/agent env; founder: login → dashboard → Top 20 → **Nietrafione** → refresh (oferta nie wraca) |
| Zakazy smoke | Bez auto-apply, scrape, seed prod, migracji, zmian Railway/API |

**Founder (5 min):** https://twin-sooty.vercel.app/login/candidate → hasło z 1Password → `/dashboard` → jedna oferta Top 20 → **Nietrafione** / Not relevant → F5 → potwierdź brak tej samej roli/firmy/lokalizacji.

**Prod:** FE https://twin-sooty.vercel.app · API https://twin-production-bcd9.up.railway.app · commit `95c906d`.

---

## FULL GO E2E — candidate smoke passed

- **Data:** 2026-05-26
- **Środowisko:** https://twin-sooty.vercel.app
- **Health / API / Celery:** OK
- **Dashboard kandydata:** OK (ręczny smoke founder)
- **Logowanie kandydata:** OK
- **Top 20 / feed:** widoczny
- **Nietrafione (`not_relevant`) + odświeżenie:** OK — oferta i duplikaty **nie wróciły** na listę
- **Zakres smoke:** auto-apply **nie** kliknięte; zakazane akcje **nie** wykonane (brak scrape, brak live apply, brak migracji, brak prod seed, brak zmian Railway)

**Werdykt:** **FULL GO E2E** — bramka kandydata zamknięta; infra + ścieżka produktowa kandydata na prod potwierdzona ręcznie przez founder (26.05.2026).

