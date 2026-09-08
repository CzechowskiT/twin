# Epic 2.26 known limitations

- LIVE_AI_QUALITY = NOT_RUN_EXTERNAL_PREREQUISITE (ANTHROPIC_API_KEY empty/unset on production API)
- Deterministic labeled fallback + criterion heuristics CERTIFIED for degraded path
- Adaptive multi-turn with live Claude NOT CERTIFIED until provider key present
- REAL_CANDIDATE_* comprehension/trust/activation = NOT_EVALUATED
- Browser interactive multi-turn with stored session cookie: verified auth gates + API journeys; no Founder credentials used
- Canary remains READY_INACTIVE; Launch NO-GO
