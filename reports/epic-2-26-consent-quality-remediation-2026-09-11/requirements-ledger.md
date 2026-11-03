# Epic 2.26 remediation — requirements-to-evidence ledger

Updated: 2026-09-11 (post browser + PG + deploy)

## Product / deploy

| Field | Value |
|-------|-------|
| Product feature SHA | `924bc7d684880c25a045ba69b7ed7441f1e79c7f` |
| Tip (docs ledger merge) | `d36e15ee943082b25ddcd1d039a1bd2a5c305410` |
| Remediation branch | `cursor/epic-2-26-consent-quality-remediation` |
| Integration | `cursor/phase1-monorepo-scaffold` |
| Alembic | `139_candidate_interview_practice` (unchanged; no additive migration required) |

| ID | Defect | Repro | Fix | Test | Status |
|----|--------|-------|-----|------|--------|
| A | `_evaluate_turn` ignores consent | spy + consent false | `authorize_practice_ai` + `ai_authorized` | consent matrix | FIXED |
| B | provider gated on config only | configured + consent false | Claude only if authorized AND configured | consent matrix | FIXED |
| C | body forge consent | body true + privacy false | body ignored; privacy row authoritative | consent matrix | FIXED |
| D | digit "1" → SUPPORTED | answer="1" | semantic NOT_ASSESSED; factual observations separate | honesty tests | FIXED |
| E | fixed next_turn | contrasting answers | adaptive library follow-up by content | contrasting-answer test | FIXED |
| F | live AI gate placeholder | no provider | exits 2 + certified:false | live-ai-gate-status.json | FIXED |
| G | promote is_synthetic=False / count mismatch | promote N turns | kpi_excluded + explicit turn_ids | promote tests + auth e2e | FIXED |
| H | delete parent only / delayed eval | delete during eval | soft-delete children; reject delayed write | delete tests | FIXED |
| I | UI pause/resume/delete | inspect FE | session list + ?session_id= + delete confirm | browser C/F | FIXED |
| J | locale via navigator | app locale | useTranslation locale | FE | FIXED |
| K | catalog tracks incomplete | only v1 families | 3 tracks × 2 exercises EN/PL + aliases | auth e2e B_three_families | FIXED |

## Gates

| Gate | Result |
|------|--------|
| 1 IMPLEMENTATION_AND_PRIVACY | PASS (consent matrix + honesty + adaptive + sessions + promote/delete) |
| 2 BROWSER_AND_DATABASE_VERIFICATION | PASS (Playwright A–H 8/8; PG concurrency PASS) |
| 3 LIVE_PROVIDER_QUALITY | NOT_RUN_NO_PROVIDER (ANTHROPIC_API_KEY len=0; certified:false) |

## Test counters (separate)

| Category | Result |
|----------|--------|
| Unit (practice + coach honesty) | 117 passed |
| Consent provider matrix (included in suite history) | PASS |
| HTTP authenticated e2e | product 18/18, stance 6/6, invariant 1/1 |
| PostgreSQL concurrency | PASS — dialect postgresql 18.6; 1×200 + 1×turn_already_submitted |
| Browser Playwright A–H | 8 passed (42.3s); journeys-summary PASS |
| Live provider §29 | NOT_RUN_NO_PROVIDER; exit 2; certified false |

## Canary / launch stance (before=after)

- rc1_launch=NO-GO
- enrollment OFF
- canary READY_INACTIVE / active false
- activation PREPARED_NOT_EXECUTED
- caps 0 / designation 0
- pilot OPERATIONALLY_READY_INACTIVE
- Phase 3B BLOCKED; Agent NOT_STARTED

## Correction vs earlier COMPLETE_PROVIDER_BLOCKED claim

Earlier tip docs claimed gaps closed while consent bypass, heuristic SUPPORTED, non-adaptive next_turn, promote/synthetic bugs, and missing real browser/PG proofs remained. Those are closed in this remediation. Live AI remains externally blocked (empty Anthropic key) — do not collapse into a single flattering COMPLETE label.

## Final outcome

`EPIC_2_26_IMPLEMENTATION_VERIFIED_LIVE_AI_BLOCKED`
