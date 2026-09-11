# Epic 2.26 remediation — requirements-to-evidence ledger

Updated: 2026-09-11 (Milestones 1–4 complete)

| ID | Defect | Repro | Fix | Test | Status |
|----|--------|-------|-----|------|--------|
| A | `_evaluate_turn` ignores `ai_prep_opt_in` — always calls provider | spy counter with consent=False | `authorize_practice_ai` reads canonical privacy; `_evaluate_turn` passes `ai_authorized=` | test_A, test_B, test_D | ✅ FIXED |
| B | `evaluate_submitted_answer_text` decides Claude via `is_anthropic_configured()` — no consent | configured + consent=False → Claude called | `ai_authorized: bool = False` param; Claude path gated on both `ai_authorized AND is_anthropic_configured()` | test_E, test evaluate_submitted | ✅ FIXED |
| C | FE body `ai_prep_opt_in:true` could forge consent | body true + privacy false → 0 calls expected | API/service ignores body; `submit_turn` calls `_evaluate_turn(db, candidate_id, ...)` which reads privacy | test_C forged body | ✅ FIXED |
| D | `CandidateInterviewPrivacy` model default True | new candidate → privacy row auto-created with ai_prep_opt_in=True | model default changed to False; `get_or_create_privacy` sets explicitly False on new rows | `test_new_privacy_row_default_off` | ✅ FIXED |
| E | `_heuristic_grounded_criteria`: answer "1" → SUPPORTED_IN_RESPONSE evidence_use | call heuristic with answer="1" | All semantic criteria = NOT_ASSESSED; factual observations in separate field; no SUPPORTED/PARTIAL from word count/digit | `test_answer_one_digit_not_supported`, `test_heuristic_never_assigns_semantic_outcomes` | ✅ FIXED |
| F | `next_turn` uses fixed family/index — not adaptive | same session, diff answers → same follow-up | `generate_adaptive_follow_up` called with answer content; library path (`_library_adaptive_follow_up`) varies by length/topics/STAR; contrasting-answer test added | `test_contrasting_answers_yield_different_library_follow_ups` | ✅ FIXED |
| G | `promote_to_evidence` hardcodes `is_synthetic=False`; reports total but promotes first-3 | promote with 4 submitted turns | `is_synthetic=session.kpi_excluded`; `turn_ids` explicit list; `turns_promoted==len(created_ids)` | `test_promote_to_evidence_count_matches_created` | ✅ FIXED |
| H | Session delete marks parent only; delayed eval persists after delete | delete then check eval | `delete_session` soft-deletes child turns; `submit_turn` re-checks `session.deleted_at` before writing eval | `test_delete_session_rejects_delayed_eval_write`, `test_delete_session_supersedes_open_turns` | ✅ FIXED |
| I | Live AI gate script is placeholder; exits 0 claiming cert when skipped | run script when provider absent | Script exits 2 (BLOCKED) with `certified: false` in `live-ai-gate-status.json`; never claims certified when skipped | script output + `live-ai-gate-status.json` | ✅ FIXED |
| J | FE locale via `navigator.language` not app locale | switch app locale → catalog still EN | Use `locale` from `useTranslation()` instead | FE lint/tsc | ✅ FIXED |
| K | Practice UI lacks session list/pause/resume/delete; no `?session_id=` routing | inspect page | Prior session list with resume/delete+confirm; `?session_id=` auto-opens session; URL updated on create/open | FE code + tsc | ✅ FIXED |

## Exercise catalog (M2 rewrite — 2026-09-11)

v2 tracks (3 × 2 = 6):
- `software_backend`: `sw_backend_objective_1` (debug latency, objective), `sw_backend_rubric_1` (rate-limiter design, open rubric)
- `business_data`: `biz_data_objective_1` (retention diagnosis, objective), `biz_data_rubric_1` (backlog prioritization, open rubric)
- `customer_b2b`: `cust_b2b_objective_1` (procurement objection, objective), `cust_b2b_rubric_1` (account rescue, open rubric)

Legacy v1 IDs (`behavioral_star_1/2`, `role_problem_1/2`, `clarifying_1/2`) kept as aliases.

## Test counts (2026-09-11 M1–M4 commit)

| Test file | Count |
|-----------|-------|
| `test_epic_226_consent_provider_matrix.py` | 15 |
| `test_epic_226_interview_practice.py` | 106 |
| `test_ai_interview_coach_no_invented_score.py` | 11 |
| **Total** | **132 passed, 0 failed** |

## E2E script result (2026-09-11)

`scripts/epic-2-26-interview-practice-e2e.py`: **SUMMARY PASS=34 FAIL=0**

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
- Live AI `certified: false` until full §29 matrix run against production with provider key present

## Remaining blockers / NOT_RUN
- Live AI §29 matrix: NOT_RUN_NO_PROVIDER (ANTHROPIC_API_KEY not set in env) — `certified: false`
- Browser Playwright journeys A–H: NOT_RUN (Playwright not installed in this environment) — static code proof only
- PG concurrency test: NOT_RUN_NO_PG (DATABASE_URL not set) — static `with_for_update` proof passes
