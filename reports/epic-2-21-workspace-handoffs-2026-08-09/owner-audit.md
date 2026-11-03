# Epic 2.21 — Extended Route / CTA / Owner Classification (2.12–2.20 + Opp/App)

PARALLEL_HANDOFF_OR_CHECKPOINT_STORE=NONE · PARALLEL_ACTIVITY_TIMELINE=NONE · PARALLEL_JOURNEY_GRAPH=NONE
Continuity (Epic 2.18) = sole Continue owner. Handoff ≠ authorization.

## ALLOWLIST (registered in twin.candidate_handoff_registry/v1)

| handoff_id | Source | Dest | Object | Class |
|------------|--------|------|--------|-------|
| import_to_data_trust | Import Center 2.12 | Data Trust 2.15 | import_batch | ALLOW_HANDOFF |
| data_trust_to_path_home | Data Trust 2.15 | Path Home 2.16 | data_trust_review | ALLOW_HANDOFF |
| opportunity_to_app_studio | Matches / Opp Intel | Application Studio | opportunity | ALLOW_HANDOFF (context only) |
| app_studio_to_career_pack | Application Studio | Career Pack 2.17 | app_studio_workspace | ALLOW_HANDOFF |
| career_pack_to_access_center | Career Pack 2.17/19 | Access Center 2.20 | career_pack | ALLOW_HANDOFF |

## DEFER_TO_CONTINUITY
IMPORT_REVIEW · DATA_TRUST_REVIEW · APPLICATION_STUDIO_DRAFT · CAREER_PACK_DRAFT — Home Continue panel only.

## OWNER_MUTATING (not 2.21 layer)
`opportunity_intelligence.handoff_to_studio` creates workspace — remains owner API; envelope never calls it.
Access Center revoke, Share grant/revoke, Import commit, Data Trust resolve, Pack confirm — owner surfaces only.

## EXCLUDE / NOT_HANDOFF
Any-to-any router · Search 2.13 · Canary readiness 2.14 · Daily OS · Approvals bypass · Agent/recruiter/support escalation · Query-param domain dumps · Next-best-action · Navigation history graph · Recruiter packs · External delivery

## Privacy
Opaque Fernet handle via `?h=` then `history.replaceState` strip · sessionStorage · Referrer-Policy no-referrer · Cache-Control private,no-store · no raw context in URLs after strip
