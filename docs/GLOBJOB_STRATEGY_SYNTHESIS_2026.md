# GlobJob / Glimmer → TWIN — synteza strategiczna (2026)

Dokument dla założyciela. Źródła: materiały z folderu Downloads (maj 2026): biznesplany Glimmer/Nexus, opisówka GlobJob, User Experience, Open Questions, arkusz **B2B flat rate**, lista **YC AI Company List**. Marka produktowa w repo pozostaje **TWIN** — poniższe nazwy robocze (GlobJob, Glimmer, Nexus) opisują ewolucję wizji, nie rebrand UI.

---

## 1. Wizja i dopasowanie do TWIN

### 1.1 Wspólny rdzeń (co się nie zmienia)

| Idea z dokumentów | Jak TWIN to realizuje / realizować |
|-------------------|-----------------------------------|
| **Odwrócenie rynku** — oferty „szukają” kandydata, nie odwrotnie | North star w `.cursorrules`: krótki **kalendarz momentów akceptacji**, nie zalew aplikacji. Feed + scoring + auto-apply (tam gdzie legalne). |
| **Globalny zasięg ofert** (scraping + później ATS) | Phase 1: pracuj.pl, rocketjobs.pl; architektura pod więcej źródeł. |
| **Trzy kategorie dopasowania** (idealne / blisko / aspiracyjne) | Zgodne z opisówką MVP; w produkcie — ranking + copy (persona kandydata). |
| **Warstwy B2C** (freemium → standby → standard → premium) | Stripe: Free / Premium (~4,99 USD) / Pro; freemium z licznikiem ofert — częściowo (podgląd feedu). |
| **B2B: success fee + subskrypcja workspace** | `b2b-roi-calculator`, programy Growth/Scale/Enterprise na `/for-companies`, placement verification (`docs/PLACEMENT_VERIFICATION.md`). |
| **Brak „agencji rekrutacyjnej”** — marketplace, nie CS ping-pong | Placement: maszynowo + self-serve; wyjątki w kolejce sporów. |
| **Gen Z: personalizacja, kanały powiadomień, autentyczność** | i18n, kalendarz (Google + ICS + Microsoft w roadmapie), batch acceptance UI (roadmap). |

### 1.2 Nazwy robocze → TWIN

- **GlobJob** — opis funkcjonalny (global job board + AI).
- **Glimmer** — emocjonalna marka z biznesplanu (migotanie szansy); w YC lista to inna firma (PDF search) — **nie mylić w pitchu**.
- **Nexus** — wariant biznesplanu; ta sama teza co Glimmer.
- **TWIN** — aktualna marka shipped: „bliźniak kariery”, kalendarz akceptacji, autonomous apply.

**Decyzja produktowa:** strategię GlobJob/Glimmer **wchłaniamy w narrację TWIN**, bez rebrandu UI.

---

## 2. Model biznesowy

### 2.1 Kandydat (B2C) — z dokumentów vs repo

| Plan (dokumenty) | Cena docelowa | TWIN dziś |
|------------------|---------------|-----------|
| Freemium | 0 USD — liczba ofert, bez aplikowania / bez nazw firm | Free tier; ograniczony tracking aplikacji |
| Standby / Basic | 0,99 USD — profil zamrożony | **Backlog** — brak dedykowanego SKU |
| Standard | 1,99 USD — aplikacje, ~80% dopasowania | Częściowo Premium (auto-apply, CV AI) |
| Premium | 4,99 USD — pełne AI, kalendarz, gamifikacja | Premium/Pro (~4,99 / ~9,99 USD MSRP) |
| Kosmos / virtual being | 9,99 USD (Virbe) | **Backlog** / partner |

**Success fee kandydata po zatrudnieniu:** 5 USD/mies. za „career network” — **backlog** (retencja po hire).

### 2.2 Pracodawca (B2B)

**Success fee (opisówka):**

- Należne za kandydatów „przedstawionych” w 12 miesięcy.
- Płatność po 14 dniach od startu.
- **10%** miesięcznego wynagrodzenia (do Manager) lub **50%** (Manager+).
- Jednorazowo za zatrudnienie.

**TWIN (kalkulator ilustracyjny):** model **50% × miesięczna pensja** na hire + pula bonusu kandydata — spójny kierunek, inne progi niż 10/50% z opisówki. Ujednolicić w kontrakcie komercyjnym przed live billing B2B.

**Flat rate (arkusz B2B flat rate):**

| Parametr | Wartość przykładowa |
|----------|---------------------|
| Liczba pracowników | 1 000 |
| Rotacja | 15% |
| Wakaty | 150 |
| Koszt rynkowy / wakat (najniższy) | 500 PLN |
| Koszt łączny tradycyjny | 75 000 PLN |
| **Koszt GlobJob (10% tej kwoty)** | **7 500 PLN** |

Interpretacja: **stała opłata = 10% od szacunkowego wydatku na publikację wakatów** (nie % pensji). TWIN integruje ten scenariusz w kalkulatorze B2B i tierze **Flat rate** na `/for-companies` (orientacyjnie).

**Programy roczne (repo):** Growth 2 900 PLN/mies., Scale 7 900 PLN/mies., Enterprise custom — procurement, DPA, SSO, ATS (osobna ścieżka niż success fee).

**Partnerzy (Staffly, DevSkiller, …):** reseller **50% flat fee** od transakcji klienta — **backlog** marketplace partnerów.

### 2.3 Inwestor

- Pre-seed/seed w dokumentach: **350k–1,5M USD**; MVP 6–9 mies.
- TWIN: `/investor`, kalkulator scenariusza, osobna ścieżka od `/for-companies`.

---

## 3. Podróże użytkownika (User Experience)

### 3.1 Kandydat — happy path z dokumentów

1. Profil + persona (preferencje, kultura, rola).
2. AI: luki w profilu, certyfikaty, sugestie ról.
3. CV z profilu / LinkedIn; **per-oferta** dopasowanie CV jednym „tak”.
4. Powiadomienia (push/SMS/mail) — **trzy typy ofert** + harmonogram (od razu / dzień / tydzień).
5. Zgody RODO + jednym „tak” start aplikacji.
6. **Największa luka:** auto-apply bez integracji z ATS pracodawcy — TWIN: redirect + auto-apply na allowlist portalach; długoterminowo ATS/webhooks.
7. Po aplikacji: upskilling, testy, mock interview, career coach — **roadmap** (częściowo copy w persona „growth lane”).

### 3.2 Pracodawca

- David (500 FTE): szum aplikacji, koszt, global talent.
- MVP opisówki: umowy z pracodawcami na scraping → później API ATS.
- TWIN: employer attest, webhooks ATS, B2B dashboard — **częściowo shipped** (zob. `docs/PRODUCT_ROADMAP.md`).

### 3.3 Persony dodatkowe (Glimmer)

- Freelancer (Kamil), zleceniodawca (Marta), korepetycje — **poza Phase 1**; architektura „unified talent marketplace” jako wizja V2+.

---

## 4. Open questions → decyzje i backlog

Szczegóły: `docs/GLOBJOB_OPEN_QUESTIONS_DECISIONS_PL.md`.

Skrót:

| Obszar | Decyzja TWIN (MVP) |
|--------|-------------------|
| Revenue core | Hybryda: B2C subskrypcja + B2B success/placement + programy roczne |
| Open IP | Nie — defensywnie: matching + dane zgody + placement events |
| GTM kandydat | Content/TikTok + wishlist founding + uniwersytety (pilot) |
| GTM B2B | „Wasze oferty już są” + flat rate / ROI calculator + contact |
| Kapitał | Pre-seed zgodnie z runway w investor calc; Delaware + PL sp. z o.o. — do potwierdzenia z prawnikiem |
| Ryzyko scraping | Compliance (`docs/SCRAPING_COMPLIANCE.md`), preferuj API/umowy |
| Etyka AI | Responsible AI, RODO, audyt bias — w politykach i docs |

---

## 5. Krajobraz konkurencyjny (YC AI + klasycy)

### 5.1 YC — bezpośrednio HR / hiring

| Firma | Teza | TWIN differentiation |
|-------|------|----------------------|
| **Apriora** | AI interviewer | TWIN: cała ścieżka kandydata + kalendarz, nie tylko interview bot |
| **Parasale** | AI recruiter outbound | TWIN: consent-first, ranked pipeline, nie cold spam |
| **DianaHR** | People ops automation | TWIN: talent marketplace + placement economics |

### 5.2 Klasycy (z biznesplanów)

| Gracz | Słabość | TWIN |
|-------|---------|------|
| LinkedIn / Indeed | Szum, kandydat jako produkt | Kuracja + acceptance calendar |
| Hired / Vettery | Drogo, mała skala | AI kuracja w skali agregatora |
| Upwork / Fiverr | Race to bottom | Osobna wizja V2 (freelance) |
| Rezi / Kickresume | Punktowe CV AI | CV + apply + match + calendar w jednym |

### 5.3 Uwaga na kolizję nazw

**Glimmer (YC)** = AI search w PDF — nie competitor HR; unikać mylenia w decku inwestorskim.

---

## 6. Luki: dokumenty vs codebase TWIN

### 6.1 Już w repo (wysoki overlap)

- Scraping + walidacja, matching, dashboard kandydata
- Stripe Premium/Pro, billing
- Google Calendar + ICS/WebCal; Microsoft w toku
- Placement verification, employer attest, ATS webhooks (Greenhouse/Lever/Ashby)
- Persona pages: candidates, recruiters, companies, investors
- B2B ROI calculator, investor scenario calculator
- i18n PL/EN, RODO onboarding

### 6.2 Braki wysokiej wartości (priorytet backlog)

| # | Brak | Źródło | Priorytet |
|---|------|--------|-----------|
| 1 | Tier **Standby** (0,99 USD) | User Experience | P2 |
| 2 | Freemium: licznik ofert bez nazw firm + bez apply | User Experience | P1 marketing |
| 3 | Trzy kategorie match w UI (ideal / near / stretch) | Opisówka, UX doc | P1 |
| 4 | Flat rate B2B (10% kosztu wakatów) w kalkulatorze i cenniku firm | xlsx | **P0 — wdrożone w tej integracji** |
| 5 | Progi success fee 10% vs 50% wg poziomu stanowiska | Opisówka | P1 kontrakt |
| 6 | Marketplace partnerów (Staffly 50%) | Opisówka | P3 |
| 7 | Gamifikacja / mock interview / career coach po hire | Glimmer, UX | P2–P3 |
| 8 | Glimmer Lens (browser extension) | Glimmer MVP 2.0 | P3 |
| 9 | 10M ofert / agresywny scraping bez umów | Glimmer GTM | Ryzyko — etapami |
| 10 | Mobile app native | Docs | P3 |

### 6.3 Świadome różnice filozoficzne

- Dokumenty: często **redirect apply** na stronę pracodawcy; TWIN dodaje **auto-apply** gdzie zgodne z compliance.
- Dokumenty: **50% pensji** jako success fee; arkusz flat rate: **10% budżetu wakatów** — oba modele wyceniane osobno w UI TWIN.

---

## 7. Data room / pitch

- **Jedna historia:** TWIN = autonomous career agent → calendar of acceptance.
- **Metryki:** `/investor/metrics`, wishlist counter, `/status`.
- **Ekonomia:** investor calculator + B2B ROI + flat rate scenario.
- **Ryzyka:** sekcja 8 biznesplanu + `PLACEMENT_VERIFICATION.md` + scraping compliance.

---

## 8. Następne kroki (operacyjne)

1. Zatwierdzić który model B2B jest **domyślny w kontraktach**: % pensji vs flat rate vs hybryda.
2. Spisać SKU **Standby** i freemium „tylko licznik” w Stripe/product backlog.
3. UI: etykiety trzech kategorii dopasowania w feedzie.
4. Pitch: lista competitorów z sekcji 5 + fosa LinkedIn (model biznesowy).

---

*Wygenerowano w ramach integracji `cursor/globjob-strategy-integration`. Nie zawiera danych wrażliwych z plików założyciela.*
