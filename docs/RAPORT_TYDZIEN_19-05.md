# Raport tygodnia TWIN (19–23.05.2026)

**Okres:** poniedziałek 19.05 → sobota 23.05.2026  
**Gałąź:** `cursor/phase1-monorepo-scaffold` (~120 commitów)  
**Produkcja (sprawdzone 23.05.2026):** API https://twin-production-bcd9.up.railway.app · strona https://twin-sooty.vercel.app · wersja na serwerze: `4dcfb1d` · silnik OK · demo na żywych danych OK (`live_db`, 637 ofert, konto demo z 1 aplikacją i 1 rozmową w kalendarzu)

---

## LIST A — Wdrożone i działa

- **Silnik produkcyjny** — API, baza, maile, worker w tle i nocny harmonogram auto-apply są włączone i zdrowe (skrypt `verify-prod-health.sh` przechodzi).
- **Asystent kariery AI (US-C051–057)** — badanie firmy, optymalizacja CV, przygotowanie do rozmowy, negocjacje, follow-up, insighty rekrutacyjne, LinkedIn — w produkcie i na dashboardzie / kalendarzu.
- **Nocne auto-apply** — zadanie o 02:00 działa (22.05 wykonano przebieg; brak aplikacji, bo nikt nie włączył zgody — to oczekiwane, nie awaria).
- **Pakiet demo inwestorskiego** — skrypt seed, strona `/demo`, instrukcja logowania dla founderów, metryki publiczne (637 ofert), snapshot API na żywych danych (`verify-investor-demo-ready.sh` = READY).
- **Demo po zalogowaniu** — historia auto-apply na `/demo` (w tym tryb „na żywo” dla zalogowanego użytkownika).
- **Strona główna i marketing** — nowy wygląd, osobne strefy logowania (kandydat / inwestor / rekruter), nagłówek marketingowy bez przełącznika persony, CTA na demo, pasek logo firm (naprawione ładowanie i ucięcie).
- **FAQ** — pełna treść na stronie głównej i `/faq` (bez skrótu „3 pytania + zobacz więcej”); wersje EN/PL i zakładki per persona (`f6960e6`, `33c7cf8`).
- **Tłumaczenia EN/PL** — nowy marketing, rejestracja, dashboard i FAQ przez system i18n (bez „gołych” stringów w kodzie).
- **Cookies RODO** — baner, zgody, ślad audytowy, analityka dopiero po zgodzie.
- **Rejestracja** — wyraźne „Zaakceptuj wszystkie” dla wymaganych zgód GDPR.
- **Hasło** — reset przez e-mail (`/forgot-password`) oraz zmiana hasła po zalogowaniu (konta e-mail).
- **Kalendarz Google** — podłączony na produkcji.
- **Program poleceń (cash-out)** — formularz wniosku i historia statusów (bez wypłat Stripe — świadomie poza demo).
- **Data room (NDA / upload)** — szkielet uploadu i metadanych (pliki w chmurze S3 jeszcze nie — tryb demo lokalny).
- **ATS** — Greenhouse OAuth w kodzie, webhooki Lever/Ashby, inbox rekrutera.
- **Persony i ścieżki** — rozdzielone strefy kandydata, firmy, inwestora; placement, spory, partner API, kolejka akceptacji.
- **Jakość kodu** — 288 testów backendu przechodzi; frontend się buduje.
- **Dokumentacja tygodnia** — audyty demo, runbook, log shippingu agenta, plan kolejnych kroków.
- **Scalenie pracy w jedną gałąź** — `cursor/phase1-monorepo-scaffold` jako miejsce, skąd Railway już serwuje aktualny commit (`git_commit` w health).

---

## LIST B — Nie zrobione (i dlaczego)

- **Pełna automatyzacja deploy bez Ciebie** — agent nie może sam kliknąć „podłącz repo” w Railway/Vercel ani wkleić sekretów z Twojego sejfu; część tygodnia to rozjazd „kod jest, strona jeszcze stara” (naprawione na API; front wymaga deploy z gałęzi scaffold).
- **GitHub PR / push z agenta** — przy braku uprawnień (403) merge na GitHubie i widoczność w UI GitHub nie zawsze szły równo z lokalnym scaffoldem.
- **Stripe na produkcji** — celowo pominięte na demo; checkout wyłączony (`stripe_checkout_ready: false`) — wymaga kluczy w Railway (dashboard, nie terminal).
- **Microsoft 365 / kalendarz Outlook** — kod jest, na prod brak `MICROSOFT_CLIENT_*` — zgodnie z decyzją „później / poza krótkim demo”.
- **Logowanie przez Microsoft przy rejestracji** — wycofane z UX na Twoją prośbę.
- **LinkedIn OAuth na prod** — nie skonfigurowane (`linkedin_oauth_configured: false`).
- **Nocne auto-apply z realną aplikacją** — mechanizm działa, ale **0 użytkowników ze zgodą** na prod (22.05); pierwszy sensowny dowód dopiero po włączeniu zgody + najbliższej nocy 02:00.
- **Wypłaty poleceń przez Stripe Connect** — tylko wniosek i ops; brak płatności.
- **Data room z plikami w S3** — metadane tak, bloby w chmurze nie (`data_room_s3_enabled: false`).
- **Lever OAuth „na żywo”** — stub; Greenhouse wymaga credentiali w Railway.
- **Pełny „filmowy” seed (5 ofert + bogaty CV w metrykach)** — demo przechodzi minimum (1 aplikacja, 1 rozmowa); runbook opisuje bogatszy scenariusz niż to, co jest dziś w licznikach publicznych.
- **Hasło demo w repo / bez deva** — nigdy w git; reset tylko przez Railway / agenta z tokenem.
- **Token rekrutera do inboxu** — powstaje przy seedzie (`--print-credentials`), nie trafia do dokumentacji publicznej.
- **E2E Playwright ścieżki inwestora** — nie uruchomione w audycie.
- **Osobny serwis worker (beat poza API)** — plan w dokumentacji, nie wdrożony.
- **Backlog bezpieczeństwa z audytu 19.05** (np. IDOR, eksport CSV) — świadomie po demo.
- **Dowód auto-apply z logów Railway CLI** — agent nie miał CLI; tylko API i curl.

---

*Źródła: `git log` od 2026-05-19, `docs/INVESTOR_DEMO_AUDIT_REPORT.md`, `docs/AUDIT_RESULTS_2026-05-23.md`, `docs/NEXT_10_STEPS.md`, `docs/AGENT_SHIPPING_LOG.md`, `docs/ops/nightly-verify-2026-05-22.md`, curl prod 23.05.2026.*
