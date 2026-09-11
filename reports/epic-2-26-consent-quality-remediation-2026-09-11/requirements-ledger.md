# Epic 2.26 remediation — requirements-to-evidence ledger

Updated: 2026-09-11 (Milestone 1 — consent + honesty safety patch)

| ID | Defect | Repro | Fix | Test | Status |
|----|--------|-------|-----|------|--------|
| A | `_evaluate_turn` ignores `ai_prep_opt_in` — always calls provider | spy counter with consent=False | `authorize_practice_ai` reads canonical privacy; `_evaluate_turn` passes `ai_authorized=` | test_A, test_B, test_D | ✅ FIXED |
| B | `evaluate_submitted_answer_text` decides Claude via `is_anthropic_configured()` — no consent | configured + consent=False → Claude called | `ai_authorized: bool = False` param; Claude path gated on both `ai_authorized AND is_anthropic_configured()` | test_E, test evaluate_submitted | ✅ FIXED |
| C | FE body `ai_prep_opt_in:true` could forge consent | body true + privacy false → 0 calls expected | API/service ignores body; `submit_turn` calls `_evaluate_turn(db, candidate_id, ...)` which reads privacy | test_C forged body | ✅ FIXED |
| D | `CandidateInterviewPrivacy` model default True | new candidate → privacy row auto-created with ai_prep_opt_in=True | model default changed to False; `get_or_create_privacy` sets explicitly False on new rows | `test_authorize_new_privacy_row_defaults_false` | ✅ FIXED |
| E | `_heuristic_grounded_criteria`: answer "1" → SUPPORTED_IN_RESPONSE evidence_use | call heuristic with answer="1" | All semantic criteria = NOT_ASSESSED; factual observations in separate field; no SUPPORTED/PARTIAL from word count/digit | `test_G_answer_digit_only`, `test_heuristic_never_assigns_semantic_supported` | ✅ FIXED |
| F | `next_turn` uses fixed family/index — not adaptive | same session, diff answers → same follow-up | Library follow-ups vary by answer length/topics when no AI; labeled `library_not_adaptive_ai` | adaptive contrast test (M2 pending) | 🔄 PARTIAL |
| G | `promote_to_evidence` hardcodes `is_synthetic=False`; reports total but promotes first-3 | promote with 4 submitted turns | `is_synthetic=session.kpi_excluded`; `turn_ids` explicit list; `turns_promoted==len(created_ids)` | promote integrity test | ✅ FIXED |
| H | Session delete marks parent only; delayed eval persists after delete | delete then check eval | `delete_session` soft-deletes child turns; `submit_turn` re-checks `session.deleted_at` before writing eval | `test_F_session_deleted`, `test_K_soft_delete` | ✅ FIXED |
| I | Live AI gate script is placeholder | run script when provider absent | Script now exits 0 with `live_ai_quality: NOT_RUN_EXTERNAL_PREREQUISITE`; writes `live-ai-gate-status.json` with `certified: false` | script output | ✅ EXISTING OK |
| J | FE locale via `navigator.language` not app locale | switch app locale → catalog still EN | Use `locale` from `useTranslation()` instead | FE lint/tsc | ✅ FIXED |
| K | Practice UI lacks session list/pause/resume/delete | inspect page | Sessions addressable by `?session_id=`; list, delete+confirm, pause (M3 pending) | browser E2E (M3/M4) | 🔄 PENDING M3 |

## Test counts (2026-09-11 M1 commit)

- `test_epic_226_consent_provider_matrix.py`: 14 passed
- `test_epic_226_interview_practice.py`: 88 passed
- `test_ai_interview_coach_no_invented_score.py`: 11 passed
- **Total: 113 passed, 0 failed**

## Consent matrix verdict

PASS — all 6 scenarios verified:
- never_consented → 0 provider calls ✅
- consent_false → 0 provider calls ✅
- forged_body_true (privacy=false) → 0 provider calls ✅
- privacy_paused → 0 provider calls ✅
- consent_true + not_paused → 1 provider call ✅
- session_deleted before eval → eval not persisted ✅

## Hard bans (unchanged)
- NO numeric 0-100 score from heuristics
- NO SUPPORTED_IN_RESPONSE from word count / digit presence
- NO AI path without canonical privacy authorization
- NO body boolean overriding DB privacy row
- DO NOT merge to main until consent+honesty+adaptive+UI tests all pass
