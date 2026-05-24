# Pilot tracker — instrukcja (Google Sheets / Excel)

**Plik danych:** [PILOT_TRACKER.csv](./PILOT_TRACKER.csv) — jeden wiersz na kandydata founding / pilota.

**Powiązane:** [PILOT_CANDIDATE_INTAKE.md](./PILOT_CANDIDATE_INTAKE.md) (intake, founding slot, checklist founder) · [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md) (metryki tygodniowe, north star).

---

## Jak używać

1. **Google Sheets:** Plik → Importuj → Prześlij → wybierz `PILOT_TRACKER.csv` → separator: przecinek → Importuj dane.
2. **Excel:** Dane → Pobierz dane → Z pliku tekstowego/CSV → wybierz `PILOT_TRACKER.csv` → kodowanie UTF-8, separator przecinek.
3. **Aktualizacja:** po każdym etapie (rejestracja, onboarding, shortlist, rozmowa) uzupełnij wiersz kandydata; nie duplikuj wierszy — jeden email = jeden wiersz.
4. **Eksport:** co tydzień skopiuj agregaty do [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md) (nie zgaduj liczb z pamięci).

---

## Definicje kolumn (1 linia)

| Kolumna | Znaczenie |
|---------|-----------|
| **Name** | Imię i nazwisko (jak w profilu / intake). |
| **Email** | Email konta TWIN — klucz wiersza. |
| **LinkedIn** | Pełny URL profilu LinkedIn. |
| **Segment** | Beachhead, np. `senior backend EU`, `product mid PL`, `tech sales remote`. |
| **Source** | Skąd przyszedł: `utm_campaign=founding1000`, waitlist, founder, referral, inne. |
| **Invitation status** | Etap zaproszenia do programu (patrz wartości poniżej). |
| **Qualification status** | Czy spełnia kryteria founding (patrz wartości poniżej). |
| **Payment status** | Etap dostępu / lejek (patrz wartości poniżej). Dla **founding free** nie oznacza opłaty kartą — używaj tej samej skali statusów co pozostałe kolumny lejka. |
| **Payment amount** | **Founding = `0`** (darmowy dostęp). Wpisz kwotę > 0 **tylko** gdy kandydat **później** wykupi opcjonalną subskrypcję (PLN). |
| **Pilot start date** | D0 pilota / founding (YYYY-MM-DD). |
| **Pilot end date** | D+7 (YYYY-MM-DD). |
| **Registered** | Konto utworzone w TWIN. |
| **CV uploaded** | CV wgrane i przetwarzane. |
| **Profile completed** | Pola profilu wystarczające do matchingu (founder ocena). |
| **Career Compass completed** | Wypełniony `/dashboard/career` (ideal job). |
| **Shortlist delivered** | Founder dostarczył / kandydat widzi shortlist w produkcie. |
| **Applications accepted** | Liczba zaakceptowanych matchy / aplikacji w pipeline. |
| **Applications sent** | Liczba faktycznie wysłanych aplikacji. |
| **Recruiter responses** | Liczba odpowiedzi od rekruterów (email / ATS). |
| **Interviews scheduled** | Zaplanowane rozmowy w systemie lub kalendarzu. |
| **Interviews accepted** | Kandydat potwierdził slot (nie anulował). |
| **Feedback collected** | Zebrana retrospekcja po D+7. |
| **Case study consent** | Zgoda na anonimowy case study (osobno od talent pool). |
| **Notes** | Dowolne notatki founder (founding slot N/1000, wyjątki, linki). |

**Kolumny logiczne (Registered … Case study consent):** wpisuj **`TAK`** / **`NIE`** albo **`TRUE`** / **`FALSE`** — wybierz jedną konwencję na cały arkusz i trzymaj ją konsekwentnie.

---

## Dozwolone wartości statusów

Używaj **małymi literami**, dokładnie jak poniżej (bez wariantów ortograficznych).

### Invitation status

`invited` · `replied` · `qualified` · `not qualified` · `paid` · `registered` · `onboarded` · `shortlist delivered` · `applications active` · `interview scheduled` · `completed` · `dropped`

### Qualification status

`invited` · `replied` · `qualified` · `not qualified` · `paid` · `registered` · `onboarded` · `shortlist delivered` · `applications active` · `interview scheduled` · `completed` · `dropped`

### Payment status

`invited` · `replied` · `qualified` · `not qualified` · `paid` · `registered` · `onboarded` · `shortlist delivered` · `applications active` · `interview scheduled` · `completed` · `dropped`

**Praktyka:** dla **Invitation** trzymaj wczesny lejek (`invited` → `replied` → `qualified` / `not qualified`); dla **Payment** przy founding free typowo `registered` → `onboarded` (bez opłaty — `Payment amount = 0`); status `paid` zarezerwuj dla kogoś, kto **później** wykupi subskrypcję. Dla **Qualification** — `qualified` / `not qualified` po review intake. Późniejsze etapy (`onboarded`, `shortlist delivered`, …) mogą być zsynchronizowane we wszystkich trzech kolumnach, gdy kandydat przechodzi ten sam etap produktu.

---

## Przykładowy wiersz (fikcyjny)

| Name | Email | LinkedIn | Segment | Source | Invitation status | Qualification status | Payment status | Payment amount | Pilot start date | Pilot end date | Registered | CV uploaded | Profile completed | Career Compass completed | Shortlist delivered | Applications accepted | Applications sent | Recruiter responses | Interviews scheduled | Interviews accepted | Feedback collected | Case study consent | Notes |
|------|-------|----------|---------|--------|-------------------|----------------------|----------------|----------------|------------------|----------------|------------|-------------|-------------------|---------------------------|---------------------|-----------------------|---------------------|---------------------|----------------------|---------------------|--------------------|--------------------|-------|
| Jan K. — przykład | jan.k.przyklad@example.com | https://linkedin.com/in/jan-k-przyklad | senior backend EU | utm_campaign=founding1000 | onboarded | qualified | onboarded | 0 | 2026-05-24 | 2026-05-31 | TAK | TAK | TAK | TAK | TAK | 3 | 2 | 1 | 1 | 1 | NIE | TAK | founding slot 42/1000; free access |

*Wiersz tylko demonstracyjny — usuń lub oznacz wyraźnie przed udostępnieniem arkusza na zewnątrz.*
