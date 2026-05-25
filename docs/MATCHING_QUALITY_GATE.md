# Matching Quality Gate (P0)

Dokument opisuje, jak TWIN dobiera krótką shortlistę ofert po CV, czego **nie** obiecujemy, oraz kiedy można zaprosić 10–20 founding members.

## Jak działa dopasowanie (bez ML)

1. Profil kandydata: umiejętności, tytuły ról, lokalizacja, doświadczenie, widełki (z formularza + sygnały z CV).
2. Dla zweryfikowanych ofert (`is_validated`) liczony jest **score 0–100** (matcher v1 lub v2 — reguły + overlap tekstu, bez trenowania modelu na użytkownikach).
3. Dashboard pobiera **limit=50**, **min_score=45** — nie pokazujemy setek słabych trafień.
4. Sekcja głównych rekomendacji na UI filtruje wyniki **score ≥ 40** (etykiety jakości poniżej).

## Progi jakości (etykiety)

| Etykieta | Score | PL (UI) |
|----------|-------|---------|
| Excellent | ≥ 80 | Doskonałe dopasowanie |
| Good | ≥ 60 | Dobre dopasowanie |
| Possible | ≥ 40 | Możliwe dopasowanie |
| Weak | &lt; 40 | Słabe (nie w głównej shortliście) |

Copy przy score 40–59 jest stonowane („Możliwe dopasowanie — …”), żeby nie brzmieć jak pewnik.

## Feedback per oferta

Osobna tabela `job_match_feedback` (nie `product_feedback`):

- `apply_intent` — „Chcę aplikować”
- `relevant` — trafne
- `not_relevant` — nietrafne
- `not_now` — nie teraz

**Wpływ na ranking (prosty, bez ML):**

- `not_relevant` → oferta **wykluczona** z `find_top_matches`.
- `apply_intent` → **+3 pkt** do score (cap 100) przy kolejnym rankingu.

API: `GET/POST /api/v1/candidates/me/match-feedback`.

## Metryki dla founderów

`GET /api/v1/admin/matching-quality` (Bearer: `OPS_ADMIN_TOKEN` / `BETA_ADMIN_TOKEN`):

- `apply_intent_count`, `relevant_count`, `not_relevant_count`, `not_now_count`
- `relevant_rate_pct`, `apply_intent_rate_pct`
- `median_top_10_score`, `empty_match_results_count`
- `dashboard_min_score` (45)

## Brama skali (founding 10–20)

Przed zaproszeniem kolejnych użytkownów (cel: **nie** 100 na ślepo):

- Ręczna próbka: **≥ 3/10** ofert z top shortlisty oznaczone `apply_intent` lub `relevant` (feedback od realnych profili).
- Mediana score top-10 persystowanych matchy **≥ 55** (orientacyjnie).
- `empty_match_results_count` nisko względem profili z CV + tytułami.

## Obietnice bezpieczne (PL / EN)

| Bezpieczne | Nie obiecujemy |
|------------|----------------|
| Rekomendowane dopasowania / shortlista | „Idealne” / „perfect” oferty |
| Pomóż ocenić trafność | „AI wie, co jest dla Ciebie najlepsze” |
| Score i krótki powód | Gwarancja rozmowy / oferty |
| Uczymy się z Twojego feedbacku (wykluczenia, lekki boost) | Trening modelu ML na Twoich danych |

**EN:** Recommended matches, shortlist, help us rate fit — not “perfect jobs” or “the AI knows you best.”

## Pliki implementacji

- `backend/app/matching/quality_gate.py` — progi
- `backend/app/services/matching_service.py` — ranking + feedback
- `backend/app/services/match_reason.py` — ton copy
- `frontend/src/lib/matching-quality.ts` — zapytania dashboardu
- Migracja: `049_job_match_feedback.py` (nie dotyka `048` submission truth)

## Auto-apply

Nightly auto-apply i progi zgody (`min_score_threshold` ≥ 75) **nie zmieniane** w tym sprincie — osobna ścieżka od dashboard shortlist.
