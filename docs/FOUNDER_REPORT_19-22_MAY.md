# Raport founder — TWIN (19–23.05.2026)

**Okres:** poniedziałek 19.05.2026 → sobota 23.05.2026 (dziś)  
**Gałąź robocza:** `cursor/phase1-monorepo-scaffold`  
**HEAD repo (23.05 ~10:41):** `f6960e6` — pełne FAQ na home, bez teasera  
**Scaffold merge (FAQ persona + i18n):** `4273e5f`  
**Produkcja API:** https://twin-production-bcd9.up.railway.app  
**Produkcja WWW:** https://twin-sooty.vercel.app  
**Źródła:** `git log origin/cursor/phase1-monorepo-scaffold --since=2026-05-19` (~119 commitów), audyty w `docs/`, rozmowa z agentem ([investor demo / deploy / FAQ](b8ccc04a-e443-4fc4-b0d9-7466dba5722c))

**Stan prod na moment raportu (agent, curl + skrypty):**

| Sygnał | Wartość |
|--------|---------|
| `GET /api/v1/health` | 200, `git_commit=f6960e6…` |
| `GET /api/v1/demo/snapshot` | 200, `source=live_db`, `demo_user_configured=true` |
| `mvp-stats` | 637 ofert, 3 użytkowników, 1 aplikacja, **1** zaplanowana rozmowa |
| `./scripts/verify-prod-health.sh` | wszystkie flagi krytyczne OK |
| `./scripts/verify-investor-demo-ready.sh` | **READY** (live_db + metryki seed) |

---

## A. Wdrożone i działa (lub działa po deploy scaffold `4273e5f` → `f6960e6`)

Każda pozycja: **co** + **dowód** + **uwaga deploy/sekret**.

### Platforma i deploy

| Co | Dowód | Uwaga |
|----|--------|--------|
| API FastAPI na Railway, DB, Redis, Celery worker + beat | `verify-prod-health.sh` OK; `health?ops=1`: mail ✅, Google Calendar ✅, scrape worker ✅ | Microsoft Calendar i Stripe checkout **wyłączone** (brak sekretów — zamierzone na demo) |
| Śledzenie wersji na prod (`git_commit` w health) | `bc5f2bd`, prod: `f6960e6` | Widać, **który** commit jest na API — rozwiązuje frustrację „nie widać zmian” po merge |
| Proxy Vercel → Railway + logowanie bez natychmiastowego wylogowania | Commity w wątku deploy; `api.ts` → bezpośredni Railway przy tokenie | Wymaga **redeploy Vercel** po pushu frontu; API już na `f6960e6` |
| Skrypty prod: `verify-prod-health.sh`, `verify-investor-demo-ready.sh`, `railway-apply-production-env.sh` | `f9ec08d`, `2336df8`, `03ffae0`, `c7cb92f` | Agent może odpalać lokalnie; **seed na prod DB** wymaga Railway CLI + `DATABASE_URL` (nie w repo) |

### Investor demo i dane demo

| Co | Dowód | Uwaga |
|----|--------|--------|
| Pakiet demo: seed, `/api/v1/demo/snapshot`, runbook | `0fd0fd4`, `fab9767`, `3567a53`, `docs/INVESTOR_DEMO_RUNBOOK.md` | Prod: **live_db** (nie `static_fallback`) |
| Naprawa snapshotu (szybkość, partial rows) | `0e6b214`, `196b6b1`, `da713ba` | Rano 23.05 audyt widział HTTP 500 — **naprawione** przed `f6960e6` |
| Instrukcja logowania bez terminala dla founderów | `docs/DEMO_LOGIN_FOR_FOUNDER.md`, `a45fe4e` | Hasło **poza** gitem; reset przez agenta/Railway, nie founder terminal |
| Metryki publiczne inwestora | `/investor/metrics`, `mvp-stats` 200 | 637 ofert walidowanych — realny korpus |

### AI Career Assistant (US-C051–057)

| Co | Dowód | Uwaga |
|----|--------|--------|
| Company intelligence (C051) | `03db768` | Live AI wymaga `ANTHROPIC_API_KEY` na Railway |
| Moduły C052–057 (CV, prep, salary, follow-up, hiring insights, LinkedIn) | `3aedc98`, `87a97e1`, `18a12e7`, migracja `040` | 25+ testów `career_assistant`; modale na dashboardzie i kalendarzu |
| **174** endpointów API | `scripts/audit-list-api-routes.py` | — |

### Autonomia: nightly auto-apply

| Co | Dowód | Uwaga |
|----|--------|--------|
| Celery beat 02:00, consent, UI ustawień, pasek na dashboardzie | `98affb6`, `9933fd3`, `e9ea7cc` | `nightly_auto_apply_beat_enabled: true` na prod |
| Ops: last-run, dokumentacja nocnej weryfikacji | `820a43f`, `docs/ops/nightly-verify-2026-05-22.md` | 22.05 beat **zadziałał**, `total_users_processed: 0` (brak zgód) — **dowód „jutro 02:00”** przy pierwszym userze ze zgodą |

### Persony, marketing, homepage

| Co | Dowód | Uwaga |
|----|--------|--------|
| Rozdzielenie marketing header vs persona switcher | `332a026`, `ac07643` | `/login/candidate`, `/login/investor`, `/login/recruiter` |
| Redesign homepage, hero CTA na `/demo` | `2804bb7`, `ad8abb5` | — |
| Historia auto-apply na `/demo` (cinematic + live dla zalogowanych) | `aa3f9a1`, `4c6ab6a`, `7f2f775` | — |
| FAQ per persona + dedykowane i18n (`/faq`) | **`4273e5f`** | Wcześniejsza wersja home miała **teaser** — founder odrzucił |
| **Pełne FAQ na stronie głównej** (jak `/faq`, bez skrótu) | **`f6960e6`** | Na API prod **wdrożone**; front: redeploy Vercel z gałęzi scaffold |
| Marquee 50 logo firm, kolorowe marki, fix ucięcia Apple | `30bab72`, `d9dcda5`, wątek [logo](b8ccc04a-e443-4fc4-b0d9-7466dba5722c) | — |
| ROI `/calculator` bez ujawniania przychodu TWIN | `8ea5338` (w historii brancha) | — |
| Waitlist, 9 locale overlay, sweep i18n | `84c7bd9`…`9056abd`, `f8bd3d5` | Brak stringów poza `t()` w nowym kodzie marketingu |

### Zgodność, konto, rejestracja

| Co | Dowód | Uwaga |
|----|--------|--------|
| GDPR cookies + audit trail, gated analytics | `4a73f26` | — |
| „Accept all” przy wymaganych zgodach na rejestracji | `c2006d3` | — |
| Zmiana hasła (konta e-mail) | `3711de4` | `docs/AUTH_PASSWORD.md` |
| Weryfikacja e-mail, geolokacja UX | `9056abd`, `f8fd65e` | — |

### B2B / growth slice (MVP)

| Co | Dowód | Uwaga |
|----|--------|--------|
| Greenhouse OAuth MVP, data room presign, RocketJobs parsing | `1b5079b`, `dbeb737` | GH wymaga credentiali w Railway |
| Referral cash-out request | `16ff417`, `69337fa` | Bez Stripe Connect — tylko UI/ops |
| Recruiter inbox, batch acceptance | wcześniejsze commity + `4f7d341` merge | Token rekrutera z `--print-credentials` po seed |
| Placement verification, dispute queue, developer docs | `e8f7756`…`ee1cfe9` | — |

### Jakość

| Co | Dowód | Uwaga |
|----|--------|--------|
| Backend pytest | **288 passed**, 1 skipped (`AUDIT_RESULTS_2026-05-23.md`) | ~5 min pełna suita |
| Frontend build | `npm run build` OK (audyt 23.05) | — |
| Dokumentacja audytu i planu demo | `INVESTOR_DEMO_AUDIT_REPORT.md`, `AUDIT_RESULTS_2026-05-23.md`, `DEMO_PREP_ACTION_PLAN.md`, `NEXT_10_STEPS.md` | Score rano 68/100 → po seed+snapshot **~92** |

### Kalendarz (zakres demo)

| Co | Dowód | Uwaga |
|----|--------|--------|
| Google Calendar OAuth na prod | `health?ops=1`: `google_calendar_configured: true` | — |
| Microsoft 365 — **kod** + WebCal/ICS | `0ee81ff`, `afacae9` | **Nie** na prod bez `MICROSOFT_CLIENT_*` (founder: opcjonalne, później) |
| Stripe — **kod** + UX gdy checkout off | `aaf8430`, checklist Railway | `stripe_checkout_ready: false` — **świadomie** poza runbookiem demo |

---

## B. Nie zrobione / częściowe — dlaczego

Szczere: co blokowało, czego agent **nie** zautomatyzuje (sekrety, GitHub, decyzje founderów).

### Odrzucone przez founderów lub poprawione dopiero 23.05

| Temat | Status | Dlaczego |
|-------|--------|----------|
| **FAQ-teaser na home** (3 pyt. + link „zobacz wszystkie”) | **Poprawione** `f6960e6` | `4273e5f` wprowadził zakładki persona, ale home zostawił skrót — sprzeczne z oczekiwaniem „pełne FAQ” |
| Festynowy marketing (baner „100 kont”, fałszywe social proof) | Wycięte wcześniej | Founder: neutralny, globalny ton |
| Logowanie Microsoft przy rejestracji | **Rezygnacja** founder | „Dodamy później” — usunięte z UX |
| Ujawnianie przychodu TWIN na kalkulatorze ROI | Nie robimy | Zgodnie z prośbą |

### Widoczność produkcji (główna frustracja tygodnia)

| Temat | Status | Dlaczego |
|-------|--------|----------|
| „Na stronie nie widać nowego kodu” | **Częściowo rozwiązane** | Kod żył na `cursor/phase1-monorepo-scaffold`; Vercel/Railway deployowały **inną** gałąź/commit albo bez auto-deploy z GitHub (`gh` **403** bez PAT founder — agent nie może pushować bez uprawnień) |
| Puste zakładki Deployments / connect repo | **Operacyjne** | Wymaga połączenia `CzechowskiT/twin` w Railway/Vercel UI — agent nie klika dashboardów za founderów |
| Rozjazd repo Vercel (`CzechowskiD` vs `CzechowskiT`) | Ryzyko w audycie 19.05 | `docs/reviews/MERGED-AUDIT-2026-05-19.md` — blocker deploy drift |

### Dane demo i pełny skrypt inwestorski

| Temat | Status | Dlaczego |
|-------|--------|----------|
| Pełny seed „5 ofert + applied + calendar” jak w runbooku | **Częściowy** | `verify-investor-demo-ready` przechodzi (1 app, 1 interview); `profiles_with_cv: 0` — metryka / definicja vs seed |
| Hasło `demo@twin.career` w repo | **Nigdy** | Bezpieczeństwo; tylko kanał prywatny + Railway reset |
| Recruiter inbox URL z tokenem | Po seed `--print-credentials` | Token nie jest w git; agent może wygenerować przy dostępie Railway |

### Integracje opcjonalne (świadomie puste na prod)

| Integracja | `health?ops=1` | Bloker |
|------------|----------------|--------|
| Microsoft Calendar | `false` | Brak `MICROSOFT_CLIENT_ID/SECRET` w Railway — **tylko** wpis w dashboardzie Railway (nie terminal founder) |
| Stripe Checkout | `false` | Brak `STRIPE_*` — poza demo; UX kieruje na pricing |
| LinkedIn OAuth login | `linkedin_oauth_configured: false` | Prośba founder o LinkedIn — **kod częściowy**, prod nie skonfigurowany |
| Lever OAuth live | stub | `NotImplementedError` w kodzie |
| Data room S3 | `data_room_local_demo: true` | Brak `S3_BUCKET_NAME` |

### Autonomia — dowód nocny

| Temat | Status | Dlaczego |
|-------|--------|----------|
| Nightly auto-apply z `total_users_processed ≥ 1` | **Nie** | Beat OK 22.05; **zero** userów ze zgodą auto-apply — pierwszy sensowny dowód po **najbliższej nocy 02:00** + zgoda na koncie |
| Railway worker logs z CLI | Nie w audycie | Brak Railway CLI w środowisku agenta — tylko API/curl |

### Jakość / bezpieczeństwo (nie blokuje krótkiego demo)

| Temat | Status |
|-------|--------|
| E2E Playwright ścieżki inwestora | Nie uruchomione w audycie |
| IDOR / CSV export (audyt 19.05) | Backlog post-demo |
| Dedykowany serwis `twin-worker` (beat off API) | `docs/RAILWAY_WORKER_PL.md` — plan |

### Czego agent **nie może** zrobić bez founder/Railway UI

- Wklejenie sekretów Stripe/Microsoft/LinkedIn do Railway (brak dostępu do vault founder).
- `git push` gdy GitHub zwraca **403** (brak PAT w środowisku agenta).
- Kliknięcie „Connect repository” w Vercel/Railway — tylko instrukcja lub CI po naprawie uprawnień.
- Gwarancja, że **frontend** Vercel jest na `f6960e6` bez sprawdzenia deploy logów Vercel (API już na tym commicie).

---

## Co zrobić automatycznie dalej (tylko agent / CI / dashboard Railway — **bez** terminala founder)

Kolejność sugerowana dla agenta na gałęzi `cursor/phase1-monorepo-scaffold`:

1. **Vercel:** wyzwolić deploy frontu z ostatniego pushu (`f6960e6`) — przez GitHub Action / hook repo albo API Vercel jeśli token w CI; founder tylko potwierdza w UI, że Production Branch = scaffold (jednorazowo).
2. **Railway (dashboard Variables):** checklist z `docs/RAILWAY_PROD_ENV_CHECKLIST.md` — agent przygotowuje listę brakujących kluczy; wpis wartości = founder w UI Railway (agent **nie** prosi o `railway run` u founder).
3. **Seed demo (agent):** jeśli w środowisku CI/agent jest `RAILWAY_TOKEN` + `DATABASE_URL` — `railway run python3 scripts/seed-investor-demo.py --reset-password` + zapis tokenu rekrutera do `docs/ops/` (redacted) lub secure note; potem `verify-investor-demo-ready.sh`.
4. **Po nocy 24–25.05 ~02:00 CET:** cron w CI lub agent loop — `GET /ops/auto-apply/last-run` + wpis do `docs/ops/nightly-verify-YYYY-MM-DD.md`.
5. **FAQ / marketing:** utrzymać `f6960e6` (pełne `FaqPageSections` na home); **nie** przywracać teasera; zsynchronizować niezacommitowane zmiany lokalne jeśli są sprzeczne z `f6960e6`.
6. **Aktualizacja audytu:** po deploy frontu — jeden curl pass + refresh `AUDIT_RESULTS` score; commit tylko docs.
7. **Backlog kod (bez sekretów):** LinkedIn OAuth env-gate, `profiles_with_cv` metric vs seed, Lever stub → feature flag.
8. **CI:** utrzymać pytest + `npm run build` na PR do scaffold; blok merge przy fail.

**Nie w scope agenta bez explicit PAT:** force-push, zmiana git config, amenda historii na remote.

---

## Podsumowanie jednym zdaniem

W **4 dni** (~119 commitów) powstał **działający monorepo Phase 1**: career assistant 051–057, nightly auto-apply, investor demo z **live_db** na API, marketing persona + pełne FAQ (`f6960e6`), cookies GDPR i prod health **zielony** — nadal **puste** Stripe/Microsoft/LinkedIn na prod, **częściowy** seed wizualny (`profiles_with_cv`), i **dowód nocnej auto-apply z realnym userem** dopiero po najbliższym 02:00 ze zgodą.

---

*Wygenerowano: 2026-05-23 — agent Cursor na `cursor/phase1-monorepo-scaffold`.*
