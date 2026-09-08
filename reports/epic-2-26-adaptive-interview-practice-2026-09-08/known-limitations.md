# Epic 2.26 known limitations

- LIVE_AI_QUALITY = NOT_RUN_EXTERNAL_PREREQUISITE (Railway `twin` ANTHROPIC_API_KEY len=0; worker has no ANTHROPIC key)
- Re-checked in continuation 2026-09-08 — still empty; no Verdict A upgrade
- Local env may contain short placeholder-shaped values — never used for live certification
- Deterministic labeled fallback + §29 shape matrix (unit) CERTIFIED for degraded path only
- Adaptive multi-turn with live Claude NOT CERTIFIED until production provider key present
- REAL_CANDIDATE_* comprehension/trust/activation = NOT_EVALUATED
- Canary remains READY_INACTIVE; Launch NO-GO; enrollment OFF; caps 0
- Tip/docs may drift FE `git_commit` after evidence tips; product SHA remains `7a214aa8`
