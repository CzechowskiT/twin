# Epic 2.21 — Route / CTA / Owner Handoff Audit

PARALLEL_HANDOFF_OR_CHECKPOINT_STORE=NONE. Continuity (2.18) is sole Continue owner.

## Journey A (ALLOWLIST)
| ID | Source → Dest | Object | Notes |
|----|---------------|--------|-------|
| import_to_data_trust | /dashboard/import → /dashboard/data-trust | import_batch | Explicit CTA |
| data_trust_to_path_home | /dashboard/data-trust → /dashboard | data_trust_review | Path panel on Home |

## Journey B (ALLOWLIST)
| ID | Source → Dest | Object | Notes |
|----|---------------|--------|-------|
| opportunity_to_app_studio | /dashboard/matches → /dashboard/application-studio | opportunity | Context only — no studio.create |
| app_studio_to_career_pack | /dashboard/application-studio → /dashboard/career-pack | app_studio_workspace | |
| career_pack_to_access_center | /dashboard/career-pack → /dashboard/settings/access | career_pack | After private share |

## DEFER_TO_CONTINUITY
Long-lived draft/resume flows (CAREER_PACK_DRAFT, APPLICATION_STUDIO_DRAFT, IMPORT_REVIEW, DATA_TRUST_REVIEW) — Home Continue via 2.18 only.

## EXCLUDE
Any-to-any router; Daily OS; Search; Approvals mutation; Access revoke as handoff; recruiter/agent; query-param domain dumps; Next-best-action.

## Existing mutable owner handoff (NOT 2.21 layer)
opportunity_intelligence.handoff_to_studio creates workspace — stays owner API; 2.21 envelope never calls it.
