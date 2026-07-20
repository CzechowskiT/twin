# Raport końcowy Wave 1 — lukę PARTIAL (auth smoke)

**Data:** 2026-07-20  
**Gałąź:** `cursor/phase1-monorepo-scaffold`  
**Werdykt:** **DONE** dla wycinka trust LIVE · Wave 1 **nadal PARTIAL** (pozostałe PENDING_SMOKE / PARTIAL)

## Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy zamknięto lukę JWT / auth smoke? | **TAK** — smoke **PASS 4/4** |
| Czy fake’owano LIVE? | **NIE** — tylko 6 modułów z Hard LIVE + smoke |
| Gate F / Launch / Phase 3B / Pilot / zaproszenia | **bez zmian** (PENDING / NO-GO / BLOCKED / OFF) |
| Wave 2 / Founder Command | **nie ruszane** |

## Prod (re-weryfikacja)

| Check | Wartość |
|-------|---------|
| FE+API SHA | `9a889a8e9d685c1270e64b2954913c9b37e4357b` |
| Alembic current | `088_candidate_wave1_hard_live` |
| Enrollment | OFF · Pilot **BLOCKED_BY_FOUNDER** |
| Public-health | ALIGNED |

## Smoke

- Skrypt: `npm run test:wave1-candidate-trust-prod-smoke` + `TWIN_PROD_SMOKE_WRITE=1`
- Konto: rejestracja smoke (`smoke-*@twin.internal`, UTM smoke) + profil kandydata
- JWT: tylko ephemeral w shellu agenta — **nie w raporcie, nie w repo**
- Wynik: **4 pass / 0 fail / 0 skip**

## LIVE (capability map + evidence)

**6 LIVE:** `candidate_consent_receipt`, `candidate_control_center`, `candidate_correction_request`, `candidate_data_portability`, `candidate_trust_audit_export`, `candidate_trust_overview`

**2 PARTIAL (nie LIVE):** `candidate_export_preview`, `candidate_identity_verification`

**6 PENDING_SMOKE:** `cand_notifications`, `cand_preferences`, `cand_cv_import`, `cand_cv_parsing`, `cand_feedback`, `cand_match_explanation`

**7 HELD_POLICY:** bez zmian (auto-apply, MS write, Stripe, KYC, delete, …)

## Stance (bez zmian)

Pilot **BLOCKED_BY_FOUNDER** · Gate F **PENDING** · Launch **NO-GO** · enrollment **OFF** · brak zaproszeń

## Następny krok

1. Dociągnąć PENDING_SMOKE dla `cand_*` osobnymi smoke’ami modułowymi (nie Wave 2).
2. Domknąć PARTIAL: kolejka export fulfillment + Authologic (#15) albo świadomie zostawić PARTIAL.
3. Dopiero po pełnym Hard LIVE barze — decyzja Foundera o Pilot (poza tym batch’em).

Dowód: [`WAVE1_CANDIDATE_TRUST_PROD_SMOKE_EVIDENCE_2026-07-20.md`](./WAVE1_CANDIDATE_TRUST_PROD_SMOKE_EVIDENCE_2026-07-20.md)
