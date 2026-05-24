# GlobJob / Glimmer / Nexus → TWIN — synteza strategiczna (maj 2026)

**Dla:** założyciel  
**Marka produktowa:** **TWIN** (GlobJob, Glimmer, Nexus = ewolucja wizji, bez rebrandu UI)  
**North star TWIN:** krótki **kalendarz momentów akceptacji** — nie zalew CV ani spam rozmów.

**Źródła (Downloads, maj 2026):** biznesplany Glimmer/Nexus, opisówki GlobJob (2 wersje), User Experience, Open Questions, arkusz **B2B flat rate**, lista **YC AI Company List**, memo „globalny rynek pracy”. Plik `GlobJob (1).docx` był pusty technicznie (brak akapitów).

Powiązane: [`GLIMMER_GLOBJOB_GAP_ANALYSIS.md`](./GLIMMER_GLOBJOB_GAP_ANALYSIS.md), [`FOUNDER_OPEN_QUESTIONS.md`](./FOUNDER_OPEN_QUESTIONS.md), [`COMPETITIVE_LANDSCAPE_YC_AI.md`](./COMPETITIVE_LANDSCAPE_YC_AI.md).

---

## 1. Streszczenie wykonawcze

Materiały założyciela opisują **ten sam rdzeń**, który TWIN już realizuje w Phase 1: odwrócenie rynku pracy (oferty „szukają” kandydata), globalny korpus ofert (scraping → umowy/API), **trzy pasma dopasowania** (idealne / blisko / aspiracyjne), warstwy B2C (freemium → premium) i B2B (success fee + programy enterprise + **flat rate** na budżet wakatów).

**Różnica strategiczna TWIN vs dokumenty:** zamiast „marketplace ogólny” z agresywnym GTM 10M ofert, TWIN koncentruje demo inwestorskie na **kalendarzu akceptacji** — ranking + zgoda + async apply + sloty warte przyjścia. Ekonomia B2B jest **podwójna** (success fee od pensji *oraz* flat rate od kosztu publikacji wakatów); oba modele są w kalkulatorze — w kontrakcie trzeba wybrać domyślny (decyzja założyciela).

**YC AI (149 firm):** tylko **3** bezpośrednio w HR/hiring (Apriora, Parasale, DianaHR). **Glimmer z YC** to wyszukiwarka PDF — **nie** nasza wizja HR; unikać kolizji nazw w decku.

**Flat rate (arkusz):** 1 000 FTE × 15% rotacja → 150 wakatów × 500 PLN floor = **75 000 PLN** tradycyjnie → **7 500 PLN** przy opłacie **10%** tego budżetu (nie % pensji). Wdrożone w `/calculator/b2b#flat-rate` i tierze **Vacancy flat rate** na `/for-companies`.

**Demo inwestorskie P0 (mówić + pokazać):** north star + feed z pasami match + kalendarz + flat rate B2B + placement verification + data room (`TWIN_PITCH_ONE_PAGER`, `INVESTOR_QA_TOP10`).

---

## 2. Kluczowe koncepcje produktowe vs TWIN

| Koncepcja (GlobJob/Glimmer) | TWIN dziś | Luka / backlog |
|-----------------------------|-----------|----------------|
| Odwrócony rynek — AI monitoruje oferty | Feed, scoring, nightly auto-apply (allowlist) | Pełny auto-apply bez ATS — redirect + webhooks |
| Trzy kategorie dopasowania | Etykiety w feedzie (`match-lane.ts`, dashboard) | Freemium bez nazw firm — copy marketing, API counter backlog |
| Per-oferta CV jednym „tak” | CV intelligence, optimize modal | Pełna automatyzacja per JD — częściowo |
| Powiadomienia kanał + cadence (Gen Z) | Email; kalendarz Google + ICS | SMS/push, Microsoft Graph (next w `.cursorrules`) |
| Freemium: licznik ofert bez nazw firm | Tier Free w `/for-candidates` | Egzekucja produktowa (maskowanie firm) |
| Standby 0,99 USD | Tier roadmap na stronie | Stripe SKU |
| Standard 1,99 USD (~80% match) | Skondensowane w Premium | Osobny entitlement |
| Premium 4,99 USD | Stripe Premium ~4,99 | Shipped |
| Post-hire coach / sieć 5 USD/mies. | `growthLane` w marketingu | Produkt po verified placement |
| B2B success fee 10%/50% pensji | Kalkulator ilustracyjny 50% mies. | Kontrakt + presety 10/50% |
| B2B flat rate 10% budżetu wakatów | Kalkulator + tier procurement | **Shipped** |
| Partner marketplace (Staffly 50%) | Docs | P3 |
| Nie agencja — marketplace | `PLACEMENT_VERIFICATION.md` | Shipped (machine-assisted) |
| MVP: umowy pracodawców przed scrape | `SCRAPING_COMPLIANCE.md` | Phase 1: scrape PL boards + roadmap umów |

---

## 3. Co zawierały poszczególne dokumenty

| Plik | Treść (skrót) |
|------|----------------|
| **Glimmer biznesplan (1)(2)** | Pełny plan: TAM HR Tech ~32B USD, Gen Z 27% workforce, UVP „praca szuka człowieka”, persony (David 500 FTE, Kamil freelancer…), MVP 2.0 (Lens extension), GTM 10M ofert, finansowanie pre-seed/seed 350k–1,5M USD, ryzyka regulacyjne |
| **Nexus / globalny rynek pracy** | Wariant tego samego planu (Nexus zamiast Glimmer); identyczna struktura sekcji |
| **GlobJob opisówka (2)(3)** | PL: problemy HR i kandydatów, MVP (OChK, umowy z pracodawcami), 3 kategorie match, upskilling, partnerzy (DevSkiller, Staffly, Heroify…), success fee, roadmap ATS |
| **User Experience** | EN+PL: reversed market, journey kandydata (profil → AI → CV → 3 typy ofert → apply), tiery B2C 0 / 0,99 / 1,99 / 4,99 / 9,99 USD, post-apply upskill/mock interview |
| **Open Questions** | Checklist dla founderów: model biznesowy, ops, kapitał, ryzyka, produkt — zindeksowane w `FOUNDER_OPEN_QUESTIONS.md` |
| **B2B flat rate xlsx** | 1000 pracowników, 15% rotacja, 150 wakatów, 75k PLN tradycyjnie, 7,5k PLN GlobJob (10%) |
| **YC AI Company List** | 149 firm YC AI; HR-adjacent: Apriora, Parasale, DianaHR |
| **GlobJob (1).docx** | Pusty (0 akapitów) |

---

## 4. YC AI — wzorce i konkurencja

### 4.1 Bezpośrednio rekrutacja / HR

| Firma | Teza | TWIN |
|-------|------|------|
| **Apriora** | AI interviewer | Cała ścieżka kandydata + kalendarz, nie tylko bot rozmowy |
| **Parasale** | AI recruiter outbound | Consent-first, ranked pipeline — nie cold spam |
| **DianaHR** | People ops automation | Talent marketplace + placement economics |

### 4.2 Wzorce poziome (149 firm)

Dominacja **B2B vertical/horizontal AI** (automation, dokumenty, sales). TWIN wpisuje się w trend **agentów autonomicznych**, ale z **wąskim focus** na karierę i **kalendarz akceptacji** — nie generic workflow (AgentHub, Basepilot).

### 4.3 Pułapka nazw

**Glimmer (YC)** = PDF search. **Nie** mylić z wizją HR założyciela w pitchu.

Szczegóły: [`COMPETITIVE_LANDSCAPE_YC_AI.md`](./COMPETITIVE_LANDSCAPE_YC_AI.md).

---

## 5. Model B2B flat rate — implikacje

| Parametr | Wartość (arkusz) | Interpretacja TWIN |
|----------|------------------|-------------------|
| Headcount | 1 000 | Wejście kalkulatora (domyślne) |
| Rotacja | 15% | → 150 wakatów/rok |
| Floor koszt/wakat | 500 PLN | Tradycyjny spend publikacji |
| Tradycyjnie | 75 000 PLN | Benchmark procurement |
| Flat program (10%) | 7 500 PLN | **Opcja ryczałtu** obok success fee od pensji |

**Implikacje:**

1. **Dwa języki sprzedaży B2B:** CFO/procurement (flat rate na wakat) vs HR (success fee od hire).
2. **Programy roczne** (Growth / Scale / Enterprise) pozostają osobną ścieżką SaaS workspace.
3. **Demo:** `/for-companies` → tier Vacancy flat rate → `/calculator/b2b#flat-rate`.
4. **Kontrakt:** founder musi wybrać domyślny model (patrz Open Questions).

---

## 6. Luki priorytetyzowane (demo inwestorskie)

### P0 — pokaż lub powiedz w sali

| # | Element | Status w repo |
|---|---------|---------------|
| 1 | North star + kalendarz + ranked feed | Demo script, Google + ICS |
| 2 | Trzy pasma match w UI | `job-list.tsx`, i18n PL/EN |
| 3 | B2B flat rate + ROI | `b2b-roi-calculator-model`, `/for-companies` |
| 4 | Placement verification (nie email ping-pong) | `PLACEMENT_VERIFICATION.md`, `/investor/placement` |
| 5 | Data room + pitch one-pager + Q&A top 10 | `TWIN_PITCH_ONE_PAGER`, `INVESTOR_QA_TOP10` |
| 6 | Krajobraz YC | `COMPETITIVE_LANDSCAPE_YC_AI.md` |

### P1 — wiarygodność / roadmap slide

| # | Element |
|---|---------|
| 1 | Freemium: licznik ofert bez nazw firm (produkt) |
| 2 | Standby 0,99 USD — Stripe SKU |
| 3 | Success fee 10% vs 50% wg poziomu (kontrakt) |
| 4 | Microsoft Calendar OAuth |
| 5 | GTM „wasze oferty już są w indeksie” |

### P2+

Mock interview po apply, partner marketplace, native app, Glimmer Lens, post-hire 5 USD/mo network.

---

## 7. Decyzje wymagające człowieka (założyciel)

Pełna lista: [`FOUNDER_OPEN_QUESTIONS.md`](./FOUNDER_OPEN_QUESTIONS.md).

1. **Domyślny kontrakt B2B:** % pensji vs flat rate vs hybryda.
2. **Drabinka B2C:** ship Standby/Standard osobno vs Free + Premium/Pro na MVP.
3. **Success fee:** opisówka 10/50% vs kalkulator 50% — br brzmienie prawne.
4. **Kapitał i entity:** Delaware + PL sp. z o.o., kwota raise — poza repo.
5. **Agresywność scrapingu** vs umowy pracodawców.
6. **Marka zewnętrzna:** TWIN vs GlobJob/Glimmer.

---

## 8. Ślad implementacji (branch `cursor/strategy-globjob-glimmer-synthesis`)

| Dostarczone | Typ |
|-------------|-----|
| Ten dokument | Docs PL |
| `FOUNDER_OPEN_QUESTIONS.md` | Index decyzji |
| Istniejące: gap analysis, YC landscape, pitch, Q&A | Docs |
| Match lanes w feedzie | Frontend |
| Flat rate B2B | Kalkulator + persona companies |
| Copy trzech pasów + tiery B2C (Standby roadmap) | `/for-candidates` |
| Competitive moat line | `/investor/metrics` |

---

*Synteza maj 2026 — bez dosłownych cytatów poufnych; liczby ilustracyjne z materiałów założyciela.*
