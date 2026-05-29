# Pilot traction dashboard (founder weekly)

**Purpose:** One place to update **pilot-shaped** traction for investors and deck refreshes — without inventing numbers in the product UI. Copy rows into slides or `/for-investors` talking points when thresholds move.

**North star (pilot):** **Accepted interviews per active candidate per month**

\[
\text{North star} = \frac{\text{Zaproszenia na rozmowę (zaakceptowane / zaplanowane w kalendarzu)}}{\text{Aktywni kandydaci w pilocie (≥1 sesja w ostatnich 30 dniach)}}
\]

*Aktywny* = zalogowany lub meaningful action (profil, match, aplikacja) w oknie 30 dni — ustal jedną definicję i trzymaj ją co tydzień.

---

## Live baseline (prod MVP)

Pobierz świeże agregaty przed aktualizacją tabeli:

```bash
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats" | jq .
```

| Okres | Kandydaci founding / pilocie | Profile uzupełnione | CV przeanalizowane | Wygenerowane matche | Zaakceptowane aplikacje | Wysłane aplikacje | Zaproszenia na rozmowę | Aktywni po 7 dniach | Płatni subskrybenci (opcj.) | Przychód subskrypcji (USD) | Verified placements | North star |
|-------|--------------------:|--------------------:|-------------------:|--------------------:|------------------------:|------------------:|-----------------------:|--------------------:|-------------------:|----------------------------:|--------------------:|-----------:|
| **Baseline** (2026-05-24, prod) | 3 | — | 2 | — | — | 16 | 3 | — | 0 | 0 | 0 | — |
| Tydzień 1 | | | | | | | | | | | | |
| Tydzień 2 | | | | | | | | | | | | |
| Tydzień 3 | | | | | | | | | | | | |
| Tydzień 4 | | | | | | | | | | | | |

**Mapowanie baseline → `mvp-stats` (2026-05-24):**

| Kolumna | Źródło |
|---------|--------|
| Kandydaci founding / pilocie | `registered_users` (3) — founding free (limit 1000), nie MAU |
| CV przeanalizowane | `profiles_with_cv` (2) |
| Wysłane aplikacje | `total_applications` (16) |
| Zaproszenia na rozmowę | `interviews_scheduled` (3) |
| Płatni subskrybenci (opcj.) | `paid_subscribers` (0) — founding wchodzi **za darmo**; subskrypcja opcjonalna później |
| Przychód subskrypcji (USD) | `subscription_mrr_usd` (0) — **nie** licz przychodu z opłaty founding (brak); placement revenue osobno, gdy będzie |
| Verified placements | `verified_placements` (0) |

**Do uzupełnienia ręcznie (brak w public JSON):** Profile uzupełnione (np. % pól profilu / gotowość do matchowania), wygenerowane matche, zaakceptowane aplikacje (batch accept), aktywni po 7 dniach. Eksport z workspace / SQL / admin — nie zgaduj.

**North star baseline (przykład):** jeśli „aktywni” = 3 pilotowcy w miesiącu i 3 rozmowy → **1,0** rozmowy / aktywny / miesiąc. Po zmianie definicji „aktywny” przelicz wiersz baseline.

---

## Jak founder aktualizuje co tydzień (~15 min)

1. **Poniedziałek:** `curl` powyżej → wpisz nowy wiersz „Tydzień N” (przesuń stare tygodnie w dół lub duplikuj tabelę w Notion).
2. **Ręczne kolumny:** z dashboardu kandydata / support — matche, zaakceptowane aplikacje, 7-dniowa aktywność.
3. **North star:** policz z tego samego wiersza; zanotuj definicję „aktywny” w komórce, jeśli się zmieniła.
4. **Slajd / inbox:** 1 liczba north star + 2 liczby jakości (np. aplikacje → rozmowy, % profil z CV) — patrz [INVESTOR_DEMO_TALKING_POINTS.md](./INVESTOR_DEMO_TALKING_POINTS.md).
5. **Nie w UI produktu:** marketing i `/investor/metrics` zostają przy `mvp-stats` — bez dopisywania fikcyjnych liczb w kodzie.

---

## Cytaty użytkowników (3–5)

*Prawdziwe cytaty tylko — za zgodą, imię/rola opcjonalnie zanonimizowane.*

| # | Data | Segment (np. senior backend EU) | Cytat (dosłownie) | Zgoda na użycie (TAK/NIE) | Użycie (deck / strona / case study) |
|---|------|----------------------------------|-------------------|---------------------------|--------------------------------------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

**Zasady:** brak placeholderów w materiałach zewnętrznych; puste wiersze OK w tym dokumencie wewnętrznym.

---

## Case study — szablony (2–3)

### Case study A — [Tytuł roboczy: np. „Senior dev, remote EU”]

| Pole | Notatki |
|------|---------|
| **Kontekst** | Rola, lokalizacja, czas na rynku przed TWIN |
| **Problem** | Szum ofert, brak kalendarza rozmów, zmęczenie aplikowaniem |
| **Co zrobił TWIN** | CV → shortlist → aplikacje / batch accept → zaproszenia |
| **Wynik (metryki)** | # aplikacji, # rozmów, czas do pierwszej rozmowy, north star |
| **Cytat** | Link do wiersza w tabeli cytatów |
| **Status** | Szkic / do zgody / opublikowany |

### Case study B — [Tytuł roboczy]

| Pole | Notatki |
|------|---------|
| **Kontekst** | |
| **Problem** | |
| **Co zrobił TWIN** | |
| **Wynik (metryki)** | |
| **Cytat** | |
| **Status** | |

### Case study C — [opcjonalnie]

| Pole | Notatki |
|------|---------|
| **Kontekst** | |
| **Problem** | |
| **Co zrobił TWIN** | |
| **Wynik (metryki)** | |
| **Cytat** | |
| **Status** | |

---

## Powiązane

- [INVESTOR_DEMO_TALKING_POINTS.md](./INVESTOR_DEMO_TALKING_POINTS.md) — odpowiedzi na „3 userów”, „$0 MRR”, „0 placementów”
- [PILOT_OFFER_COPY_PL.md](./PILOT_OFFER_COPY_PL.md) — copy founding member (PL/EN), CTA, billing opcjonalny później
- [INVESTOR_FUNDRAISING_PAGE_AUDIT.md](./INVESTOR_FUNDRAISING_PAGE_AUDIT.md) — co jest live na `/for-investors`
- Public metrics UI: `/investor/metrics` → `GET /api/v1/public/mvp-stats`
