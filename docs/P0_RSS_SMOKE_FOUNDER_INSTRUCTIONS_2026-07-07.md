# P0 RSS Smoke — Founder Instructions — 2026-07-07

**Status:** **READY FOR FOUNDER EXECUTION** — not yet run  
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**  
**Related:** [RSS smoke runbook](./P0_MULTITAB_RSS_SMOKE_RUNBOOK_2026-07-07.md) · [Evidence template](./P0_RSS_SMOKE_EVIDENCE_TEMPLATE_2026-07-07.md) · [Closure decision template](./P0_CLOSURE_DECISION_TEMPLATE_2026-07-07.md)

---

## A. Co ten test sprawdza / What this test proves

Ten test sprawdza, czy **TWIN na produkcji** (`https://twin-sooty.vercel.app`) pozostaje **responsywny i stabilny**, gdy masz otwarte **8–12 kart Google Chrome** na typowych trasach workspace — tak jak w codziennym użyciu.

Mierzysz **pamięć RSS** (Activity Monitor), **CPU**, **responsywność** przełączania kart i ewentualne **crashe**. To jest **ręczny smoke na prawdziwym Chrome** — nie Playwright, nie Gate E.

---

## B. Czego ten test NIE oznacza / What this test does NOT mean

| To **nie** jest | Wyjaśnienie |
|-----------------|-------------|
| **Launch GO** | Ten test **nie** daje zgody na publiczny launch. |
| **Gate F YES** | Gate F pozostaje **osobną decyzją** — ten test go nie zamyka. |
| **Automatyczne zamknięcie P0** | Nawet przy PASS **nie** oznaczaj P0 jako CLOSED bez osobnej decyzji foundera. |

**Ten test nie jest Launch GO. Ten test nie jest Gate F YES. Ten test nie zamyka P0 automatycznie.**

---

## C. Zanim zaczniesz / Before starting

1. **Zasilacz (AC)** — laptop podłączony do prądu, nie na samym akumulatorze.
2. **Zamknij ciężkie aplikacje** — wideo, inne Chrome z dziesiątkami kart, IDE z dużym zużyciem RAM.
3. **Google Chrome** (stabilny kanał) — zalecane okno Incognito lub osobny profil testowy.
4. **Activity Monitor** (Monitor aktywności) — otwórz i zostaw widoczny (kolumna Memory dla procesów Chrome).
5. Otwórz **`https://twin-sooty.vercel.app`** i **zaloguj się** (jeśli wymagane na trasach workspace).
6. **Opcjonalnie, jeśli praktyczne:** sprawdź `https://twin-sooty.vercel.app/api/public-health` — powinno być `status=ok`. Jeśli nie — patrz sekcja H (ABORT).

**Zakaz:** nie używaj Playwright, nie uruchamiaj Gate E, nie zmieniaj produkcji (tylko przeglądanie).

---

## D. Dokładny plan 10 kart / Exact 10-tab plan

Otwórz karty **po kolei** (odstęp ok. 0,5–1 s między kartami). Bazowy URL: `https://twin-sooty.vercel.app`.

| Tab # | Trasa | Pełny URL |
|-------|-------|-----------|
| 1 | `/` | `https://twin-sooty.vercel.app/` |
| 2 | `/demo` | `https://twin-sooty.vercel.app/demo` |
| 3 | `/for-companies` | `https://twin-sooty.vercel.app/for-companies` |
| 4 | `/dashboard` | `https://twin-sooty.vercel.app/dashboard` |
| 5 | `/dashboard/jobs` | `https://twin-sooty.vercel.app/dashboard/jobs` |
| 6 | `/dashboard/matches` | `https://twin-sooty.vercel.app/dashboard/matches` |
| 7 | `/profile` | `https://twin-sooty.vercel.app/profile` |
| 8 | `/recruiter` | `https://twin-sooty.vercel.app/recruiter` |
| 9 | `/company/dashboard` | `https://twin-sooty.vercel.app/company/dashboard` |
| 10 | `/company/candidates/demo-candidate-001` | `https://twin-sooty.vercel.app/company/candidates/demo-candidate-001` |

Po otwarciu wszystkich kart: **poczekaj 4–6 minut** (zostaw karty w tle, przełączaj się między nimi co kilka sekund jak w normalnej pracy).

---

## E. Na co patrzeć / What to observe

| Obszar | Co notować |
|--------|------------|
| **RSS (pamięć)** | Suma pamięci Chrome + najwyższy proces „Renderer” w Activity Monitor |
| **CPU** | Czy Chrome trzyma Mac w wysokim CPU bez powodu |
| **Responsywność** | Czy przełączenie karty daje interaktywną stronę w rozsądnym czasie (kilka sekund, nie „wisząca” karta) |
| **Crashe** | „Aw, snap!”, samoczynny reload karty, zabicie karty przez Chrome |
| **Użyteczność Maca** | Czy cały system (nie tylko Chrome) jest nadal używalny |
| **Błędy w UI** | Puste ekrany, brak treści, oczywiste błędy na stronie |
| **Konsola (opcjonalnie)** | DevTools → Console — czerwone błędy; nie jest wymagane do PASS, ale warto zanotować |

---

## F. Dowody / Evidence to collect

| # | Dowód | Kiedy |
|---|-------|-------|
| E1 | **Screenshot Activity Monitor — baseline** (przed lub tuż po otwarciu kart) | Start |
| E2 | **Screenshot Activity Monitor — po załadowaniu** wszystkich 10 kart | Po otwarciu |
| E3 | **Screenshot Activity Monitor — po 4–6 min** soak | Koniec testu |
| E4 | **Screenshot craszy** (jeśli wystąpiły) | W trakcie |
| E5 | **public-health** — JSON lub screenshot (`/api/public-health`) | Przed startem (jeśli możliwe) |
| E6 | **Wynik pisemny:** `PASS` / `FAIL` / `ABORT` + krótkie notatki | Na końcu |

Zapisz dowody lokalnie (np. `docs/evidence/p0-rss-smoke-YYYYMMDD/`) i wypełnij **[szablon dowodów](./P0_RSS_SMOKE_EVIDENCE_TEMPLATE_2026-07-07.md)**.

---

## G. Kryteria PASS / Pass criteria

Oznacz **PASS**, gdy **wszystkie** poniższe są spełnione:

| # | Kryterium |
|---|-----------|
| G1 | **Brak crashy** kart i brak OOM (Chrome nie zabija kart z powodu pamięci) |
| G2 | **Mac nadal używalny** — nie musisz force-quit Chrome ani restartować systemu |
| G3 | **Responsywność OK** — karty reagują na przełączenie bez długiego „wiszenia” |
| G4 | **Brak fatalnych błędów UI** — workspace nie zostaje na stałe pusty / zepsuty |

---

## H. Kryteria ABORT / Abort criteria

**Przerwij test (ABORT)** — nie wpisuj PASS ani FAIL — gdy:

| # | Warunek |
|---|---------|
| H1 | **Mac niestabilny** — system praktycznie nieużywalny |
| H2 | **Pamięć „runaway”** — RSS Chrome rośnie bez kontroli, swap, masowe spowolnienie |
| H3 | **Wysoki CPU** utrzymany — Mac się grzeje, wentylatory na max, normalna praca niemożliwa |
| H4 | **Crashe kart** lub Chrome wymaga **force quit** |
| H5 | **public-health** nie OK (jeśli sprawdzałeś) — problem infrastruktury, nie sygnał P0 |

Przy ABORT: zanotuj powód, zrób screenshoty jeśli możesz, **nie zamykaj P0**.

---

## I. Po teście / After the test

1. Wypełnij **[P0 RSS Smoke Evidence Template](./P0_RSS_SMOKE_EVIDENCE_TEMPLATE_2026-07-07.md)** — metryki, trasy, wynik PASS/FAIL/ABORT, załączniki.
2. Przejrzyj dowody i wypełnij **[P0 Closure Decision Template](./P0_CLOSURE_DECISION_TEMPLATE_2026-07-07.md)** — osobna decyzja foundera.
3. **Nie oznaczaj P0 jako CLOSED** bez świadomej decyzji foundera w szablonie closure — nawet przy PASS smoke.

Szczegóły techniczne (progi RSS, fazy T1–T5): [runbook](./P0_MULTITAB_RSS_SMOKE_RUNBOOK_2026-07-07.md).

---

## Launch stance footer

**Launch: NO-GO** · **P0: OPEN** · **Gate F: PENDING**

No Launch GO. No Gate F YES. No automatic P0 closure.
