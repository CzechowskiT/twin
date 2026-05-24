# TWIN — 100 zadań do akceptacji founder (Phase 1 → skala)

**Data:** 2026-05-23  
**Gałąź:** `cursor/phase1-monorepo-scaffold`  
**North star:** krótki **kalendarz momentów gotowych do akceptacji** (kandydat + rekruter), nie szum w skrzynce.  
**Źródła:** `docs/FOUNDER_TASK_REPORT_2026-05-16_to_today.md`, `docs/NEXT_10_STEPS.md`, `docs/PRODUCT_ROADMAP.md`, `docs/PLACEMENT_VERIFICATION.md`, `.cursorrules`

**Postęp (sesja 2026-05-23, wieczór):** **17/19 P0** ✅ na prod; **⚠️ S3 live bucket** (founder `S3_*`); **❌ ATS OAuth** (credentials). Sekrety: `docs/FOUNDER_SECRETS_WHERE.md`. `validated_jobs` na `/status` + `health?ops=1`.

---

## 1. Produkcja, sekrety i niezawodność deploy

1. ✅ [Priorytet: P0] Stripe live na Railway — wklejenie `STRIPE_`* + webhooków, aby `stripe_checkout_ready: true` i płatność kartą na prod (wartość: kandydat kupuje Premium; inwestor widzi realny checkout). *Prod 2026-05-23: `stripe_checkout_ready: true`, checkout session OK*
2. ✅ [Priorytet: P0] LinkedIn OAuth na prod — `LINKEDIN_CLIENT_`* + redirect URI (wartość: szybsza rejestracja). *Prod 2026-05-23: `linkedin_oauth_configured: true`*
3. ✅ [Priorytet: P0] Microsoft 365 / Outlook Calendar — `MICROSOFT_CLIENT_`* na Railway (wartość: kandydaci korporacyjni widzą zajętość i propozycje slotów w Outlook). *Prod: `microsoft_oauth_configured` + `microsoft_calendar_configured: true`; zapis eventów: `POST /calendar/microsoft/interviews`*
4. ✅ [Priorytet: P0] Vercel Production branch — ustawienie `cursor/phase1-monorepo-scaffold` + redeploy po każdym krytycznym pushu (wartość: founder i inwestor widzą aktualny front, nie preview). *Dok: `1fbcb1c` · panel Vercel: founder*
5. ✅ [Priorytet: P0] Celery worker + beat poza API — prod: serwis `enthusiastic-encouragement` (`docs/RAILWAY_WORKER_PL.md`) (wartość: beat/scrape przy restarcie API).
6. ✅ [Priorytet: P1] Resend / mail na prod — `RESEND_API_KEY` + weryfikacja resetu hasła i maili transakcyjnych (wartość: samoobsługowe konto bez supportu). *Prod: `mail_configured: true`*
7. ✅ [Priorytet: P1] Health dashboard dla founder — jedna strona `/status` z flagami: mail, Stripe, Microsoft, LinkedIn, beat (wartość: 30 s audytu przed rozmową z inwestorem). *+ `validated_jobs`, `health?ops=1` curl*
8. ✅ [Priorytet: P2] GitHub Actions — automatyczny smoke po pushu (health + build front) (wartość: mniej regresji bez ręcznego sprawdzania). *`.github/workflows/smoke.yml`*

---

## 2. Kandydat — kalendarz akceptacji (north star)

1. ✅ [Priorytet: P0] Microsoft Graph — zapis propozycji spotkań po connect (wartość: sloty trafiają do kalendarza firmowego, nie tylko odczyt busy). *API: `POST /api/v1/calendar/microsoft/interviews`; founder: Azure `Calendars.ReadWrite`*
2. ✅ [Priorytet: P0] WebCal — regeneracja i kopiowanie URL z każdego paska kalendarza (wartość: Apple / Fastmail użytkownicy bez OAuth nie są gorszą klasą).
3. ✅ [Priorytet: P1] ICS download jednym kliknięciem — plik `.ics` dla potwierdzonych rozmów (wartość: uniwersalny fallback poza Google/Microsoft).
4. ✅ [Priorytet: P1] Metadane spotkań — Google Meet / Teams / Zoom na wydarzeniu (wartość: kandydat widzi link w kalendarzu, nie w mailu).
5. ✅ [Priorytet: P1] Widok „następna rozmowa” na mobile — pasek na małym ekranie (wartość: decyzja accept/decline w drodze).
6. [Priorytet: P1] Przypomnienia o rozmowie — beat + mail gdy `mail_configured` (wartość: mniej no-show, więcej slotów „wartych przyjścia”).
7. [Priorytet: P1] Propozycja slotów z busy time — UI „wybierz 3 terminy” dla rekrutera (wartość: mniej ping-pongu mailowego).
8. [Priorytet: P2] CalDAV iCloud (ograniczony scope) — tylko jeśli polityka produktu na to pozwala (wartość: użytkownicy wyłącznie Apple).
9. [Priorytet: P2] Strefy czasowe i DST — jawna strefa profilu przy propozycjach (wartość: globalni kandydaci bez pomyłek godzin).

---

## 3. Kandydat — auto-apply, matching, pipeline

1. ✅ [Priorytet: P0] Nocny auto-apply — weryfikacja po 02:00 UTC: wiersz w `auto_apply_runs` + mail podsumowania (`docs/NIGHTLY_AUTO_APPLY_DEPLOY.md`) (wartość: obietnica „agent pracuje, gdy śpisz” jest prawdziwa na prod). *Prod: run id=2 @ 2026-05-23 00:00 UTC; beat + worker active*
2. ✅ [Priorytet: P0] Pasek „ostatni sweep” na dashboardzie — podpięty do `GET /auto-apply/last-sweep` (wartość: zaufanie bez logowania do ops). *+ nudge zgody: `201d0f6`*
3. [Priorytet: P1] Bramka Premium przed masowym auto-apply — jasny upsell gdy brak subskrypcji (wartość: monetyzacja bez fałszywego „applied 200”).
4. [Priorytet: P1] Ranking ofert pod profil — waga skills, pensja, lokalizacja, zgody (wartość: mniej szumu, więcej sensownych aplikacji).
5. ✅ [Priorytet: P1] Wyjaśnienie dopasowania — „dlaczego ta oferta” w UI (wartość: kandydat akceptuje pipeline świadomie).
6. [Priorytet: P1] Filtr „tylko remote / hybryda / onsite” — trwały w profilu (wartość: mniej odrzuceń po stronie rekrutera).
7. [Priorytet: P1] Limit dzienny aplikacji — konfigurowalny per plan (wartość: jakość > wolumen, zgodne z north star).
8. [Priorytet: P1] Podgląd treści aplikacji przed wysłaniem — pierwsza paczka przez użytkownika (wartość: zaufanie i RODO).
9. [Priorytet: P2] A/B copy auto-apply — test komunikatów na waitliście (wartość: lepsza konwersja beta bez zmiany core).
10. [Priorytet: P2] Wstrzymanie auto-apply na urlop — data od–do w profilu (wartość: kandydat nie aplikuje w trakcie urlopu).

---

## 4. Kandydat — profil, CV, career assistant

1. ✅ [Priorytet: P0] Stripe E2E w staging — scenariusz z `docs/STRIPE_E2E.md` przed flip live (wartość: brak niespodzianek przy pierwszej płatności). *Prod checkout live; test card 4242…*
2. [Priorytet: P1] Upload CV — walidacja typu/rozmiaru + komunikat PL (wartość: mniej 500 przy demo inwestora).
3. [Priorytet: P1] Tailoring CV pod ofertę — podgląd diff przed zapisem (wartość: wyższa jakość aplikacji).
4. ✅ [Priorytet: P1] Career assistant — puste stany PL we wszystkich zakładkach (wartość: spójność z resztą produktu).
5. [Priorytet: P1] Import profilu z LinkedIn OAuth — tylko dane z zgody OAuth, bez scrapingu (wartość: szybszy onboarding legalny).
6. ✅ [Priorytet: P1] Onboarding krok po kroku — % ukończenia profilu (wartość: wyższa gotowość do auto-apply).
7. [Priorytet: P2] Authologic KYC live — po koncie producenta (wartość: wyższe zaufanie przy wypłacie nagrody 25%).
8. [Priorytet: P2] Wersjonowanie CV — historia 3 ostatnich wersji (wartość: rollback po złym tailoringu).

---

## 5. Marketing, waitlist, founding offer

1. ✅ [Priorytet: P0] Waitlist funnel — polish CTA u góry + tracking konwersji (wartość: lista beta pod kolejną rundę). *home ↔ waitlist: wcześniejsze commity + `aa7884f`*
2. [Priorytet: P1] Founding offer — licznik miejsc + preview oferty na home (wartość: pilność bez fałszywego scarcity w backendzie).
3. [Priorytet: P1] Batch waitlist #3–#4 — eksport CSV + szablon maila (`docs/WAITLIST_BATCH_*.md`) (wartość: founder wysyła zaproszenia bez ops).
4. ✅ [Priorytet: P1] Demo `/demo` — skrypt inwestora zsynchronizowany z seed prod (`INVESTOR_DEMO_RUNBOOK.md`, `RAILWAY_DEMO_ENV_CHECKLIST.md`) (wartość: powtarzalna rozmowa fundraising). *`demo_snapshot: live_db`*
5. [Priorytet: P1] Cennik 4,99 / 9,99 — A/B nagłówka na locale EN vs PL (wartość: lepsza konwersja międzynarodowa).
6. [Priorytet: P2] Case studies kandydata — 3 historie z metrykami (czas do rozmowy) (wartość: social proof na landing).
7. [Priorytet: P2] Partnerzy — formularz zgłoszenia partnera B2B (wartość: kanał dystrybucji bez cold mail).
8. [Priorytet: P2] Blog / changelog publiczny — automatyczny z `RELEASE_NOTES` (wartość: SEO i transparentność dla inwestora).

---

## 6. Rekruter — inbox akceptacji i batch

1. ✅ [Priorytet: P0] Inbox rekrutera — batch accept/decline na liście pre-qualified (`docs/RECRUITER_INBOX.md`) na prod z seed demo (wartość: north star po stronie B2B). *Prod: `recruiter_inbox_configured: true`; refresh: `POST /ops/demo/recruiter-inbox-refresh`*
2. ✅ [Priorytet: P1] Filtr inbox — status + wyszukiwanie (wartość: rekruter widzi najpierw najlepszych).
3. [Priorytet: P1] Akcja „zaproponuj 3 sloty” z inbox — wysyłka propozycji do kandydata (wartość: ścieżka do kalendarza bez maila).
4. [Priorytet: P1] Powiadomienie e-mail — tylko transakcyjne przy nowym batchu (wartość: brak spamu, jeden mail = jedna decyzja).
5. [Priorytet: P1] SLA widok — ile profili czeka >48h (wartość: firma widzi wąskie gardło procesu).
6. ✅ [Priorytet: P1] Notatka wewnętrzna przy decline — powód dla audytu (wartość: uczenie modelu dopasowania).
7. [Priorytet: P2] Delegacja inbox — drugi rekruter w zespole (wartość: większe firmy bez współdzielenia hasła).
8. [Priorytet: P2] Eksport zaakceptowanych do CSV — pod ATS bez integracji (wartość: szybki pilotaż enterprise).

---

## 7. Pracodawca — ATS, webhooks, OAuth

1. [Priorytet: P0] ATS OAuth live — Greenhouse / Lever redirect gdy credentials w Railway (wartość: sync stanów hire bez ręcznego CS).
2. [Priorytet: P1] Ashby webhook — ten sam wzorzec co Lever (`docs/ATS_WEBHOOKS.md`) (wartość: pokrycie kolejnego ATS popularnego w SaaS).
3. [Priorytet: P1] Job sync z ATS — import otwartych ról do dopasowania (wartość: oferty w TWIN = oferty firmy, nie tylko scrape).
4. [Priorytet: P1] UI „Połącz ATS” — status connected / error / last sync (wartość: self-serve B2B bez maila do supportu).
5. [Priorytet: P1] Mapowanie etapów ATS → placement state machine (wartość: automatyczna weryfikacja hire bez „CS tennis”).
6. [Priorytet: P2] Workday / SAP — tylko dokumentacja + stub API (wartość: rozmowy enterprise bez obietnicy live).
7. [Priorytet: P2] Partner API keys — rotacja i scope read-only dla integratorów (`docs/PARTNER_API.md`) (wartość: dystrybucja przez software house’y).

---

## 8. Pracodawca — hub, ROI, talent pool

1. [Priorytet: P1] Employer hub — spójne slug URL firmy we wszystkich zakładkach (wartość: linkowalne oferty w kampaniach).
2. [Priorytet: P1] Attestation link — `placement-employer-attest` z UI w hubie (wartość: jeden klik pracodawcy zamiast wątku mailowego).
3. [Priorytet: P1] Kalkulator ROI B2B — scenariusze bez ujawniania przychodu TWIN (wartość: champion wewnątrz firmy ma liczby).
4. [Priorytet: P1] Talent pool — zapis kandydata po accept do puli firmy (wartość: rekruter buduje pipeline na przyszłość).
5. [Priorytet: P1] Brief oferty Fortune-500 — edycja przez ops z podglądem live (wartość: demo enterprise bez fałszywego ATS).
6. [Priorytet: P2] White-label hub — logo i kolory klienta (wartość: wyższy ARPU w kontrakcie rocznym).
7. [Priorytet: P2] SSO SAML dla pracodawcy — backlog po stabilnym OAuth kandydata (wartość: duże korporacje).

---

## 9. Placement, monetyzacja, nagroda 25%

1. ✅ [Priorytet: P0] Work-email magic link — pełny flow UI + status w dashboardzie (`docs/PLACEMENT_VERIFICATION.md`) (wartość: weryfikacja hire bez dzwonienia do kandydata). *`PlacementStateStepper` + mail na prod*
2. ✅ [Priorytet: P0] Placement state machine — widoczne stany: pipeline → offer → verified (wartość: przejrzystość opłaty success fee). *Stepper w applications panel*
3. [Priorytet: P1] Dispute queue — ops UI resolve + API zamknięcia sporu (wartość: wyjątki bez domyślnego ping-pongu).
4. [Priorytet: P1] Celery retention check — start date + N miesięcy bez maila „czy nadal pracujesz?” (wartość: zgodność z polityką anti-CS-tennis).
5. [Priorytet: P1] Stripe invoice po `placement_verified` — reguły engine przed wysłaniem faktury (wartość: firma nie dostaje niespodziewanego rachunku).
6. [Priorytet: P1] Referral cash-out — ops „mark paid” + historia statusów (wartość: wypłata 25% bez ręcznego Excela).
7. [Priorytet: P1] Nagroda 25% — kalkulator netto brutto w profilu kandydata (wartość: zrozumienie skąd bierze się kwota). *(dashboard poleceń — copy model 25%: ✅ `9188289`)*
8. [Priorytet: P2] Upload listu ofertowego — OCR z consent, tylko fakty (wartość: alternatywa gdy brak work email).
9. [Priorytet: P2] Ubezpieczenie sporu — playbook prawny w `docs/legal/` (wartość: inwestor widzi dojrzałość ryzyka).
10. [Priorytet: P2] Program poleceń B2B — prowizja za polecenie pracodawcy (wartość: niski CAC enterprise).

---

## 10. Scraping, job boardy, jakość danych

1. ✅ [Priorytet: P0] RocketJobs — stabilizacja selektorów + test fixture (wartość: drugi polski portal działa tak jak pracuj.pl). *`pytest tests/test_rocketjobs_parser.py`*
2. ✅ [Priorytet: P0] Scrape corpus growth — ops allowlist + dzienny beat + metryka `validated_jobs` na `/status` (wartość: rosnąca baza bez obietnicy 100k w jedną noc). *Prod: 637 jobs; `GET /health?ops=1` → `validated_jobs`*
3. [Priorytet: P1] Kolejne boardy Tier-1 — Indeed / NoFluffJobs / JustJoin gdy zgodne z `docs/SCRAPING_COMPLIANCE.md` (wartość: szerszy rynek PL/EU).
4. [Priorytet: P1] Walidacja oferty przed zapisem — salary, location, deduplikacja (wartość: matching nie śmieci na nullach).
5. [Priorytet: P1] LinkedIn adapter — tylko oferty publiczne / zgodne; bez masowego scrape profili (wartość: legalność; **wykluczone:** masowy scrape profili — P2 tylko jako „nie robimy”).
6. [Priorytet: P1] Monitor jakości scrape — alert gdy board zwraca 0 ofert 24h (wartość: szybka reakcja ops).
7. [Priorytet: P2] Geolokalizacja regionów — filtr kraju w registry (wartość: ekspansja DE/UK bez przebudowy core).
8. [Priorytet: P2] Archiwizacja starych ofert — soft-delete po 90 dniach (wartość: mniejsza baza, szybsze zapytania).

---

## 11. Infra, i18n, wydajność, jakość kodu

1. ✅ [Priorytet: P0] E2E Playwright — home, waitlist, login, `/demo` snapshot (wartość: regresja przed demo fundraising).
2. [Priorytet: P1] i18n audit — brak literałów poza `t()` / backend locale (wartość: 9 języków bez regresji PL-EN).
3. [Priorytet: P1] OpenAPI export — wersjonowany artefakt dla partnerów (wartość: integracje B2B szybciej).
4. [Priorytet: P1] Rate limiting API — ochrona auth i scrape trigger (wartość: stabilność przy pierwszym traffic spike).
5. [Priorytet: P1] Indeksy DB — jobs, applications, placement_events (wartość: szybki inbox przy 10k+ rekordów).
6. [Priorytet: P2] CDN dla assetów marketingowych — Vercel + cache headers (wartość: LCP na mobile w UE).
7. [Priorytet: P2] Feature flags PostHog — rollout nowych powierzchni (wartość: bezpieczne testy na 5% waitlisty).

---

## 12. Inwestor, compliance, data room, metryki

1. ⚠️ [Priorytet: P0] Data room S3 — upload bajtów gdy `S3_BUCKET_NAME`; nie tylko metadata (`docs` upload stub) (wartość: inwestor pobiera deck i model bez maila). *Kod + presigned PUT ✅; prod flag off — founder: `docs/FOUNDER_SECRETS_WHERE.md` → `S3_*` + railway apply*
2. [Priorytet: P1] Metryki inwestora — MRR/ARR z prawdziwego Stripe gdy live (wartość: liczby z systemu, nie arkusza).
3. [Priorytet: P1] Admin metrics — DAU, auto-apply runs, placement verified (wartość: founder widzi traction w jednym miejscu).
4. [Priorytet: P1] Quantica compliance — domknięcie checklisty (`docs/QUANTICA_COMPLIANCE.md`) (wartość: due diligence bez ostatniej chwili).
5. [Priorytet: P1] RODO — eksport i usunięcie konta self-serve (wartość: zgodność UE bez ticketu).
6. [Priorytet: P1] Cookie consent — audyt zgodności z `docs/COOKIE_CONSENT.md` (wartość: mniejsze ryzyko prawne na PL rynku).
7. [Priorytet: P2] Raport tygodniowy founder — automatyczny PDF z metryk (wartość: 5 min przeglądu bez SQL).
8. [Priorytet: P2] Data room wersjonowanie — kto pobrał który plik (wartość: audyt dla VC).
9. [Priorytet: P2] SOC2-light checklist — dokumentacja procesów (wartość: enterprise pipeline za 12 miesięcy).
10. [Priorytet: P2] **Wykluczone świadomie:** masowy scrape 1000+ profili LinkedIn; obietnica 100k ofert overnight — nie planujemy (wartość: ochrona prawna i wiarygodność wobec inwestora).

---

## Jak akceptować

Founder odpowiada w wątku np.:

- `odrzuć: 12, 45, 88, 100` — te numery wypadają z backlogu implementacji, lub
- `akceptuję wszystko P0+P1` — P2 zostaje w dokumentacji jako backlog, lub
- `akceptuję wszystko` — pełna lista 1–99 (punkt 100 to wpis informacyjny o wykluczeniach).

Można też dopisać: `priorytetyzuj wyżej: 18, 44, 91`.

---

## Szacunek czasowy (orientacyjny)


| Priorytet | Horyzont                     | Liczba zadań (1–99)                           |
| --------- | ---------------------------- | --------------------------------------------- |
| **P0**    | następne **2 tygodnie**      | **19**                                        |
| **P1**    | **miesiąc 2** (tygodnie 3–6) | **54**                                        |
| **P2**    | **backlog**                  | **27** (w tym pkt 100 — wpis o wykluczeniach) |


**Balans obszarów (zadania 1–99):**


| Obszar                     | ~%  | Liczba |
| -------------------------- | --- | ------ |
| Kandydat B2C               | 35% | 35     |
| Rekruter / pracodawca B2B  | 25% | 25     |
| Placement i monetyzacja    | 15% | 15     |
| Skala (scrape, i18n, perf) | 15% | 15     |
| Inwestor / compliance      | 10% | 10     |


---

*Wygenerowano dla akceptacji founder — TWIN Phase 1, 2026-05-23.*