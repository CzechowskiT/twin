"""Epic 2.13 — Unified Career Workspace Search (retrieval/navigation only).

Zero mutations / approvals / recomputations / external actions.
Query never logged; results are candidate-scoped allowlisted records + capabilities.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.services import capability_discoverability as discover
from app.services.workspace_search_adapters import run_adapters
from app.services.workspace_search_constants import (
    CONTRACT_ID,
    RESULT_GROUP_CAPABILITY,
    SCHEMA,
)
from app.services.workspace_search_route_inventory import inventory_contract

# Capability catalog — reuse Epic 2.11 primary + secondary labels (no 8th primary).
CAPABILITY_ENTRIES: list[dict[str, str]] = [
    {"id": "home", "href": "/dashboard", "label_en": "Home", "label_pl": "Start"},
    {"id": "direction", "href": "/dashboard/career", "label_en": "Direction", "label_pl": "Kierunek"},
    {
        "id": "opportunities",
        "href": "/dashboard/matches",
        "label_en": "Opportunities",
        "label_pl": "Szanse",
    },
    {"id": "evidence", "href": "/dashboard/portfolio", "label_en": "Evidence", "label_pl": "Dowody"},
    {"id": "plan", "href": "/dashboard/execution-calendar", "label_en": "Plan", "label_pl": "Plan"},
    {
        "id": "decisions",
        "href": "/dashboard/approvals",
        "label_en": "Decisions",
        "label_pl": "Decyzje",
    },
    {
        "id": "settings",
        "href": "/dashboard/privacy-center",
        "label_en": "Settings & privacy",
        "label_pl": "Ustawienia i prywatność",
    },
    {"id": "help", "href": "/dashboard/help", "label_en": "Help", "label_pl": "Pomoc"},
    {"id": "import", "href": "/dashboard/import", "label_en": "Import Center", "label_pl": "Centrum importu"},
    {"id": "strategy", "href": "/dashboard/strategy", "label_en": "Strategy", "label_pl": "Strategia"},
    {
        "id": "interview",
        "href": "/dashboard/interview-decision",
        "label_en": "Interview",
        "label_pl": "Rozmowy",
    },
    {
        "id": "transition",
        "href": "/dashboard/career-transition",
        "label_en": "Transition",
        "label_pl": "Przejście",
    },
    {
        "id": "workspace_search",
        "href": "/dashboard/workspace-search",
        "label_en": "Workspace search",
        "label_pl": "Szukaj w przestrzeni",
    },
]

# Surfaces never offered as capability results
_BLOCKED_HREF_PREFIXES = (
    "/admin",
    "/ops",
    "/preview",
    "/signup",
    "/recruiter",
    "/company",
    "/investor",
    "/beta",
)


def _privacy_paused(db: Session, *, candidate_id: int) -> bool:
    try:
        from app.services.career_lifecycle import get_or_create_privacy

        privacy = get_or_create_privacy(db, candidate_id=candidate_id)
        return bool(getattr(privacy, "paused", False))
    except Exception:
        return False


def _deep_link_ok(href: str) -> bool:
    if not href.startswith("/"):
        return False
    if any(href.startswith(p) for p in _BLOCKED_HREF_PREFIXES):
        return False
    # No external / executable schemes
    if "://" in href or href.lower().startswith("javascript:"):
        return False
    return True


def search_capabilities(*, q: str, locale: str = "en", limit: int = 20) -> list[dict[str, Any]]:
    needle = (q or "").strip().lower()
    if len(needle) < 1:
        return []
    out: list[dict[str, Any]] = []
    for cap in CAPABILITY_ENTRIES:
        href = cap["href"]
        if not _deep_link_ok(href):
            continue
        label = cap["label_pl"] if locale.startswith("pl") else cap["label_en"]
        reasons: list[str] = []
        if needle in label.lower() or needle in cap["label_en"].lower() or needle in cap["label_pl"].lower():
            reasons.append("CAPABILITY_LABEL_MATCH")
        if needle in href.lower() or needle in cap["id"]:
            reasons.append("CAPABILITY_HREF_MATCH")
        if not reasons:
            continue
        out.append(
            {
                "group": RESULT_GROUP_CAPABILITY,
                "type": "capability",
                "opaque_id": f"wsc_{cap['id']}",
                "deep_link": href,
                "title": label,
                "excerpt": href,
                "status": "available",
                "truth": "FACT",
                "source": "capability_registry_v211",
                "updated_at": None,
                "match_reasons": sorted(set(reasons)),
                "provenance": {"domain": "capability", "area_id": cap["id"]},
            }
        )
        if len(out) >= limit:
            break
    out.sort(key=lambda r: (str(r.get("title")), str(r.get("opaque_id"))))
    return out


def run_search(
    db: Session,
    *,
    candidate_id: int,
    q: str,
    locale: str = "en",
    include_archived: bool = False,
    domains: list[str] | None = None,
    groups: list[str] | None = None,
) -> dict[str, Any]:
    """Private retrieval — never mutates canonical state; never logs query text."""
    needle = (q or "").strip().lower()
    # Do not echo query back in response body beyond length
    query_len = len(needle)
    if query_len < 2:
        return _envelope(
            capabilities=[],
            records=[],
            query_len=query_len,
            privacy_paused=False,
            include_archived=include_archived,
            empty_reason="query_too_short",
        )

    paused = _privacy_paused(db, candidate_id=candidate_id)
    want_cap = groups is None or "capability" in groups
    want_rec = groups is None or "record" in groups

    capabilities: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = []

    if want_cap:
        capabilities = search_capabilities(q=needle, locale=locale)

    if want_rec:
        if paused:
            records = []
        else:
            records = run_adapters(
                db,
                candidate_id=candidate_id,
                q=needle,
                domains=domains,
                include_archived=include_archived,
            )

    # Re-validate deep links at result time
    capabilities = [r for r in capabilities if _deep_link_ok(str(r.get("deep_link") or ""))]
    records = [r for r in records if _deep_link_ok(str(r.get("deep_link") or ""))]

    empty_reason = None
    if not capabilities and not records:
        empty_reason = "privacy_pause" if paused and want_rec else "no_matches"

    return _envelope(
        capabilities=capabilities,
        records=records,
        query_len=query_len,
        privacy_paused=paused,
        include_archived=include_archived,
        empty_reason=empty_reason,
    )


def _envelope(
    *,
    capabilities: list[dict[str, Any]],
    records: list[dict[str, Any]],
    query_len: int,
    privacy_paused: bool,
    include_archived: bool,
    empty_reason: str | None,
) -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "contract_id": CONTRACT_ID,
        "query_len": query_len,
        # Never return raw query
        "groups": {
            "capability": capabilities,
            "record": records,
        },
        "counts": {
            "capability": len(capabilities),
            "record": len(records),
            "total": len(capabilities) + len(records),
        },
        "privacy_paused": privacy_paused,
        "include_archived": include_archived,
        "empty_reason": empty_reason,
        "mutations": 0,
        "external_actions": 0,
        "first_value_satisfied": False,
        "truth_upgrade": False,
        "ranking": "deterministic_stable_order",
        "opaque_scores": False,
        "candidate_scoped": True,
        "leaks_other_candidates": False,
        "cache_control": "private, no-store",
        "claim_kind": "FACT",
        "kpi_excluded_hint": True,
    }


def catalog() -> dict[str, Any]:
    inv = inventory_contract()
    disc = discover.discoverability_registry()
    return {
        "schema": SCHEMA,
        "contract_id": CONTRACT_ID,
        "primary_ia_count": disc.get("primary_count"),
        "eighth_nav_item": False,
        "route_inventory": {
            "total": inv["total"],
            "complete": inv["complete"],
            "by_disposition": inv["by_disposition"],
        },
        "allowed_record_domains": sorted(
            [
                "evidence",
                "opportunity_watch",
                "interview_process",
                "transition",
                "import_batch",
            ]
        ),
        "excluded_from_index": [
            "quarantine",
            "staging",
            "unapproved_import",
            "raw_cv",
            "tokens",
            "sessions",
            "consents",
            "invites",
            "pilot_flags",
            "telemetry",
            "audits",
            "runtime",
            "other_candidates",
            "employer_corpora",
            "ms_calendar_content",
            "deleted",
        ],
        "engine": "postgresql_native_lexical_adapters",
        "no_elasticsearch": True,
        "no_vector_embeddings": True,
        "no_llm_rag": True,
        "no_web_search": True,
        "search_equals_first_value": False,
        "claim_kind": "FACT",
    }


def route_inventory() -> dict[str, Any]:
    return inventory_contract()
