"""Epic 2.13 — complete authenticated candidate route inventory for search.

Every candidate dashboard/profile family is classified:
  SEARCHABLE_CANONICAL_RECORD | CAPABILITY_ONLY | EXCLUDED_WITH_REASON
"""

from __future__ import annotations

from typing import Any

# disposition, reason (when excluded)
ROUTE_INVENTORY: list[dict[str, Any]] = [
    # Primary IA
    {"href": "/dashboard", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/career", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/matches", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/portfolio", "disposition": "SEARCHABLE_CANONICAL_RECORD", "reason": "evidence_domain"},
    {"href": "/dashboard/execution-calendar", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/approvals", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/privacy-center", "disposition": "CAPABILITY_ONLY", "reason": None},
    # Secondary / modules
    {"href": "/dashboard/help", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/help/report-problem", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/help/feedback", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/profile", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/jobs", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/strategy", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/search-strategy", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/search-outcomes", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/application-studio", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/interview-decision", "disposition": "SEARCHABLE_CANONICAL_RECORD", "reason": "interview_process_domain"},
    {"href": "/dashboard/career-transition", "disposition": "SEARCHABLE_CANONICAL_RECORD", "reason": "transition_domain"},
    {"href": "/dashboard/review-center", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/decision-journal", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/execution-intelligence", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/evidence-investment", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/calendar", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/calendar-sync", "disposition": "EXCLUDED_WITH_REASON", "reason": "ms_calendar_content_never_indexed"},
    {"href": "/dashboard/consent-center", "disposition": "EXCLUDED_WITH_REASON", "reason": "consents_never_searchable"},
    {"href": "/dashboard/import", "disposition": "SEARCHABLE_CANONICAL_RECORD", "reason": "committed_import_batches_only"},
    {"href": "/dashboard/history", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/identity", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/privacy", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/evidence", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/applications", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/lifecycle", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/trust", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/search", "disposition": "CAPABILITY_ONLY", "reason": "legacy_lifecycle_search_ui"},
    {"href": "/dashboard/workspace-search", "disposition": "CAPABILITY_ONLY", "reason": "unified_search_shell"},
    {"href": "/dashboard/plan", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/cv", "disposition": "EXCLUDED_WITH_REASON", "reason": "raw_cv_never_indexed"},
    {"href": "/dashboard/profile", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/billing", "disposition": "EXCLUDED_WITH_REASON", "reason": "billing_purchase_surface"},
    {"href": "/dashboard/recovery", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/acceptance", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/timeline", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/referrals", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/offer-readiness", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/placement-verification", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/interview-prep", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/hiring-journey", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/scheduling-proposal", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/settings/auto-apply", "disposition": "EXCLUDED_WITH_REASON", "reason": "application_submission_controls"},
    # Trust sub-routes (excluded as family)
    {"href": "/dashboard/trust/overview", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/trust/controls", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/trust/portability", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/trust/export-preview", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/trust/export-requests", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/trust/corrections", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/trust/consent-receipt", "disposition": "EXCLUDED_WITH_REASON", "reason": "consents_never_searchable"},
    {"href": "/dashboard/trust/identity-verification", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/trust/visibility-preferences", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/trust/activity-timeline", "disposition": "EXCLUDED_WITH_REASON", "reason": "telemetry_audits_never_searchable"},
    {"href": "/dashboard/trust/audit-export", "disposition": "EXCLUDED_WITH_REASON", "reason": "telemetry_audits_never_searchable"},
    {"href": "/dashboard/trust/revoke-delete", "disposition": "EXCLUDED_WITH_REASON", "reason": "deletion_controls"},
    {"href": "/dashboard/trust/request-upvote-preview", "disposition": "EXCLUDED_WITH_REASON", "reason": "hidden_chrome_trust_surfaces"},
    {"href": "/dashboard/evidence/claims", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/evidence/disputes", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/evidence/ai-runs", "disposition": "EXCLUDED_WITH_REASON", "reason": "telemetry_runtime_never_searchable"},
    {"href": "/dashboard/evidence/security", "disposition": "EXCLUDED_WITH_REASON", "reason": "security_ops_surface"},
    {"href": "/dashboard/calendar/readiness", "disposition": "CAPABILITY_ONLY", "reason": None},
    {"href": "/dashboard/referrals/cash-out", "disposition": "EXCLUDED_WITH_REASON", "reason": "purchase_payout_surface"},
    # Explicitly never: admin/operator/invite/pilot
    {"href": "/admin", "disposition": "EXCLUDED_WITH_REASON", "reason": "admin_operator_surface"},
    {"href": "/preview", "disposition": "EXCLUDED_WITH_REASON", "reason": "public_preview_isolated"},
    {"href": "/login", "disposition": "EXCLUDED_WITH_REASON", "reason": "unauthenticated"},
    {"href": "/signup", "disposition": "EXCLUDED_WITH_REASON", "reason": "public_signup_off"},
]


def inventory_contract() -> dict[str, Any]:
    total = len(ROUTE_INVENTORY)
    by_disp: dict[str, int] = {}
    for row in ROUTE_INVENTORY:
        d = str(row["disposition"])
        by_disp[d] = by_disp.get(d, 0) + 1
    return {
        "schema": "twin.workspace_search_route_inventory/v1",
        "total": total,
        "complete": f"{total}/{total}",
        "by_disposition": by_disp,
        "routes": ROUTE_INVENTORY,
        "eighth_primary_nav": False,
        "claim_kind": "FACT",
    }
