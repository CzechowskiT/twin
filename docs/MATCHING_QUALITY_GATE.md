# Matching Quality Gate (P0)

Dokument opisuje ranking feedu na dashboardzie, feedback per oferta, metryki founderów i bezpieczne obietnice.

## Jak działa dopasowanie (bez ML)

1. Profil kandydata: umiejętności, tytuły ról, lokalizacja, doświadczenie, widełki (z formularza + sygnały z CV).
2. Dla zweryfikowanych ofert (`is_validated`) liczony jest **candidate_fit** (matcher v1 lub v2).
3. **final_score** łączy fit + jakość źródła + świeżość + kompletność + priorytet PL + feedback (szczegóły: `docs/MARKET_COVERAGE_AND_TOP_200_RANKING.md`).
4. Dashboard pobiera **`limit=200`**, **`min_score=38`** — szeroki, posortowany feed; **top 20** wyróżnione w UI.
5. Ten sam ranking co API — **bez** losowych 220 ofert spoza scoringu.

## Progi jakości (etykiety)

| Etykieta | Score | PL (UI) |
|----------|-------|---------|
| Excellent | ≥ 80 | Doskonałe dopasowanie |
| Good | ≥ 60 | Dobre dopasowanie |
| Possible | ≥ 40 | Możliwe dopasowanie |
| Weak | &lt; 40 | Słabe |

## Feedback per oferta

Osobna tabela `job_match_feedback` (nie `product_feedback`):

- `apply_intent` — „Chcę aplikować” (+3)
- `relevant` — trafne (+2)
- `not_relevant` — wykluczenie z feedu
- `not_now` — lekka kara (−2)

API: `GET/POST /api/v1/candidates/me/match-feedback`.

## Metryki dla founderów

`GET /api/v1/admin/matching-quality` (Bearer: `OPS_ADMIN_TOKEN` / `BETA_ADMIN_TOKEN`):

- Feedback: `apply_intent_count`, `relevant_count`, `not_relevant_count`, `not_now_count`, rates
- Ranking: `median_top_10_score`, `median_top_200_score`, `median_top_200_count`, `top_200_limit`
- Korpus: `total_jobs_by_source`, `fresh_jobs_24h`, `fresh_jobs_7d`, `duplicate_rate_pct`
- Intent: `apply_intent_in_top_20`, `apply_intent_in_top_200`
- `dashboard_min_score` (38)

## Brama skali (founding 10–20)

Przed zaproszeniem kolejnych użytkowników:

- Ręczna próbka: **≥ 3/10** z top-20 oznaczone `apply_intent` lub `relevant`.
- Mediana score top-10 persystowanych matchy **≥ 55** (orientacyjnie).
- `empty_match_results_count` nisko względem profili z CV + tytułami.

## Obietnice bezpieczne (PL / EN)

| Bezpieczne | Nie obiecujemy |
|------------|----------------|
| Do 200 posortowanych rekomendacji | „Idealne” / „perfect” oferty |
| Top 20 wyróżnione + szerszy feed | 50 portali = wszystkie live w produkcji |
| Pomóż ocenić trafność | LinkedIn bez limitów / omijanie CAPTCHA |
| Score, źródło, badge | Gwarancja rozmowy / oferty |

## Pliki

- `backend/app/matching/ranking.py` — final_score, dedupe feed, badges
- `backend/app/matching/quality_gate.py` — progi 200/38/20
- `backend/app/services/matching_service.py` — ranking + persist
- `frontend/src/lib/matching-quality.ts` — zapytania dashboardu
- Migracja feedback: `049_job_match_feedback.py` (nie dotyka `048`)

## Auto-apply

Nightly auto-apply i progi zgody (`min_score_threshold` ≥ 75) **nie zmieniane** w tym sprincie.
