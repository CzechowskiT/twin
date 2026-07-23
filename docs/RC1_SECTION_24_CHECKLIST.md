# RC1 §24 checklist — Controlled Pilot Activation

**Tip must be four-way aligned. Launch / Enrollment / Phase 3B must stay frozen.**

| # | Condition | Proven? | Evidence |
|---|-----------|---------|----------|
| 1 | CORE_PILOT Hard LIVE 143/0/0 | YES | registry + guards |
| 2 | Gate F PASS | YES | `production-action-gates.ts` |
| 3 | Launch NO-GO | YES | frozen |
| 4 | Enrollment OFF | YES | `EXTERNAL_PILOT_ENROLLMENT_ENABLED` false |
| 5 | Phase 3B BLOCKED | YES | founder pack |
| 6 | Four-way SHA ALIGNED | YES | verify on tip |
| 7 | Alembic head `099` | YES | admin expected head |
| 8 | Operational FE reachable | YES | `https://twin-sooty.vercel.app` |
| 9 | Preferred public domain twin.care → app | **NO** | Afternic NS parking lander |
| 10 | Recruiter token session works | YES | local synced to Railway hash |
| 11 | Invite-only registration gate | YES | `PILOT_REGISTRATION_INVITE_ONLY` on prod |
| 12 | Synthetic identities documented | YES | `RC1_SYNTHETIC_PILOT_IDENTITIES.md` |
| 13 | Cand/rec/inv E2E smoke PASS | YES | `scripts/rc1-prod-e2e-smoke.py` |
| 14 | Security gate Crit/High closed | YES | `scripts/rc1-security-gate.sh` |
| 15 | Topology manifest + CI guard | YES | `PRODUCTION_TOPOLOGY_RC1.json` |
| 16 | Backup/restore evidence (no prod overwrite) | YES | O7 `o7-r020` staging |
| 17 | Rollback runbook present | YES | launch-day + controlled pilot manuals |
| 18 | Worker deployed same tip | YES | Railway worker commit |
| 19 | Observability / health OK | YES | `/api/v1/health` |
| 20 | On-call PRIMARY assigned | **NO** | `RC1_ON_CALL_ROSTER.md` UNASSIGNED |
| 21 | On-call SECONDARY assigned | **NO** | UNASSIGNED |
| 22 | Alert path for on-call | PARTIAL | email/in-app; Slack optional |
| 23 | Cohort prep docs | YES | synthetic + operating manual |
| 24 | Founder accepts RC1 operational URL until DNS | YES/NO | business: accept sooty **or** fix NS |

## Flip rule

`PILOT_STANCE → READY_FOR_CONTROLLED_PILOT` **only if all rows YES** (including 9 **or** 24 accepts sooty as temporary operational canonical, **and** 20–21 assigned).

If only 20–21 missing → **Verdict B**.
