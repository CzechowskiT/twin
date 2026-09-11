# Epic 2.26 remediation — requirements-to-evidence ledger

Updated: 2026-09-11 (M1–M4 remediation complete)

| ID | Defect | Repro | Fix | Test | Status |
|----|--------|-------|-----|------|--------|
| A | `_evaluate_turn` ignores `ai_prep_opt_in` — always calls provider | spy counter with consent=False | `authorize_practice_ai` reads canonical privacy; `_evaluate_turn` passes `ai_authorized=` | test_never_consented, test_consent_false | ✅ FIXED |
| B | `evaluate_submitted_answer_text` decides Claude via `is_anthropic_configured()` — no consent | configured + consent=False → Claude called | `ai_authorized: bool = False` param; Claude path gated on both `ai_authorized AND is_anthropic_configured()` | test_evaluate_submitted_no_ai | ✅ FIXED |
| C | FE body `ai_prep_opt_in:true` could forge consent | body true + privacy false → 0 calls expected | API/service ignores body; `submit_turn` calls `_evaluate_turn(db, candidate_id, ...)` which reads privacy | test_forged_request_body | ✅ FIXED |
| D | `CandidateInterviewPrivacy` model default True for new rows | new candidate → privacy row auto-created with ai_prep_opt_in=True | `get_or_create_privacy` explicitly sets ai_prep_opt_in=False for new rows | test_new_privacy_row_default_off | ✅ FIXED |
| E | `_heuristic_grounded_criteria`: answer "1" → SUPPORTED_IN_RESPONSE evidence_use | call heuristic with answer="1" | All semantic criteria = NOT_ASSESSED; factual observations in separate field | test_answer_one_digit_not_supported, test_heuristic_never_assigns_semantic | ✅ FIXED |
| F | `next_turn` uses fixed family/index — not adaptive to answer content | same session, diff answers → same follow-up | Library follow-ups vary by answer length/topics; labeled library_not_adaptive_ai; family-aware | adaptive catalog tests M2 | ✅ ADDRESSED (deterministic library, labeled) |
| G | `promote_to_evidence` hardcodes `is_synthetic=False`; reports total but promotes first-3 subset | promote with 4 submitted turns | `is_synthetic=session.kpi_excluded`; `turn_ids` explicit list; `turns_promoted==len(created_ids)` | test_promote_to_evidence_count_matches_created | ✅ FIXED |
| H | Session delete marks parent only; delayed eval persists after delete | delete then check eval | `delete_session` supersedes child turns; `submit_turn` re-checks `session.deleted_at` before writing eval | test_delete_session_rejects_delayed_eval_write, test_delete_session_supersedes_open_turns | ✅ FIXED |
| I | Live AI gate script is placeholder; exits 0 claiming certification when not run | run script when provider absent | Script exits 2 (BLOCKED) for NOT_RUN states; exits 0 only on PASS; writes `certified: false` JSON when not run | python3 scripts/epic-2-26-live-ai-quality-gate.py → exit 2 | ✅ FIXED |
| J | FE locale via `navigator.language` not app locale | switch app locale → catalog still EN | Use `locale` from `useTranslation()` instead | FE build clean | ✅ FIXED |
| K | FE lacks AI consent panel; sends ai_prep_opt_in in body | FE sends ai_prep_opt_in:true → server still ignores (fixed server-side) | FE consent checkbox PATCHes canonical privacy row; shows paused/off/active states; body never used as authority | FE build + manual smoke | ✅ FIXED |
| L | Exercise catalog aliases referenced wrong v2 IDs | import error in module load | Fixed aliases: sw_backend_objective_1, biz_data_*, cust_b2b_* + cross-naming aliases | 108 backend tests pass (import succeeds) | ✅ FIXED |

## Test counts (2026-09-11 M1–M4 remediation complete)

- `test_epic_226_consent_provider_matrix.py`: 15 passed
- `test_epic_226_interview_practice.py`: 95 passed (includes contrasting-answer M2 test + v2 ID resolution test)
- `test_ai_interview_coach_no_invented_score.py`: 11 passed
- **Total: 121 passed, 0 failed**
- Frontend build: ✅ CLEAN
- Concurrency proof: ✅ submit_turn uses with_for_update + commit-before-model + duplicate guard
- Live AI gate: ✅ exits 2 (BLOCKED) when provider absent; writes certified=false

## Consent matrix verdict

PASS — all scenarios verified:

| Scenario | Expected calls | Result |
|----------|---------------|--------|
| never_consented | 0 | ✅ |
| consent_false | 0 | ✅ |
| forged_body_true (privacy=false) | 0 | ✅ |
| privacy_paused | 0 | ✅ |
| consent_true + not_paused | 1 | ✅ |
| session_deleted before eval | eval discarded | ✅ |

## Live AI gate status

- `live-ai-gate-status.json`: `certified: false, status: NOT_RUN_NO_PROVIDER`
- Script exits 2 (BLOCKED) when provider absent — does NOT exit 0
- When ANTHROPIC + OPS_ADMIN_TOKEN present: executes §29 matrix and writes PASS/FAIL

## Hard bans (invariants)
- NO numeric 0-100 score from heuristics
- NO SUPPORTED_IN_RESPONSE from word count / digit presence (answer "1" → NOT_ASSESSED)
- NO AI provider call without canonical DB privacy authorization
- NO body boolean overriding DB privacy row
- Phase 3B BLOCKED (no merge to main; no employer data)

## Commits (branch: cursor/epic-2-26-consent-quality-remediation)

- `21e58c58` fix(consent): Epic 2.26 M1 — consent gate, honest heuristics, provider spy tests
- `e0983577` fix(consent): M1 — consent gate, honesty invariant, locale fix, provider matrix tests
- `87b79d4b` feat(catalog): M2 — v2 exercise tracks (software_backend, business_data, customer_b2b)
- `dab1d9c8` feat(ui): M3 — session discover/resume/delete UI + ?session_id= URL param

## Next recommended

Run with ANTHROPIC_API_KEY + OPS_ADMIN_TOKEN set to execute live §29 matrix and
upgrade live-ai-gate-status.json to certified=true. Then merge to phase1-monorepo-scaffold.
