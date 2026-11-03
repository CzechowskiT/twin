"""Epic 2.13 — domain adapters for candidate-scoped lexical workspace search.

PostgreSQL-native / dialect-safe string contains — no Elasticsearch/vector/LLM.
Unknown domains fail closed (not registered).
"""

from __future__ import annotations

import html
from datetime import datetime
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateCareerEvidence,
    CandidateImportBatch,
    CandidateInterviewProcess,
    CandidateOpportunityWatch,
    CandidateTransitionWorkspace,
)
from app.services.workspace_search_constants import (
    ALLOWED_RECORD_DOMAINS,
    EVIDENCE_EXCLUDED_STATUS,
)

AdapterFn = Callable[..., list[dict[str, Any]]]


def _safe_excerpt(text: str, *, limit: int = 160) -> str:
    raw = (text or "").replace("\n", " ").strip()
    clipped = raw[:limit]
    return html.escape(clipped)


def _opaque(domain: str, row_id: int) -> str:
    return f"wsr_{domain}_{int(row_id)}"


def _match(hay: str, needle: str) -> bool:
    return bool(needle) and needle in (hay or "").lower()


def search_evidence(
    db: Session,
    *,
    candidate_id: int,
    q: str,
    include_archived: bool,
    limit: int,
) -> list[dict[str, Any]]:
    rows = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .order_by(CandidateCareerEvidence.id.desc())
        .limit(80)
        .all()
    )
    out: list[dict[str, Any]] = []
    for ev in rows:
        if (ev.status or "").lower() in EVIDENCE_EXCLUDED_STATUS:
            continue
        archived = getattr(ev, "archived_at", None) is not None
        if archived and not include_archived:
            continue
        reasons: list[str] = []
        if _match(ev.title or "", q):
            reasons.append("TITLE_MATCH")
        if _match(ev.summary or "", q):
            reasons.append("SUMMARY_MATCH")
        if not reasons:
            continue
        out.append(
            {
                "group": "record",
                "type": "evidence",
                "opaque_id": _opaque("evidence", ev.id),
                "deep_link": f"/dashboard/portfolio?evidence={ev.id}",
                "title": (ev.title or "")[:200],
                "excerpt": _safe_excerpt(ev.summary or ev.title or ""),
                "status": "archived" if archived else (ev.status or "active"),
                "truth": ev.claim_kind or "UNKNOWN",
                "source": "career_evidence",
                "updated_at": (ev.updated_at or ev.created_at).isoformat()
                if isinstance(ev.updated_at or ev.created_at, datetime)
                else None,
                "match_reasons": reasons,
                "provenance": {
                    "domain": "evidence",
                    "claim_kind": ev.claim_kind,
                    "verification_state": getattr(ev, "verification_state", None),
                },
            }
        )
        if len(out) >= limit:
            break
    return out


def search_opportunity_watch(
    db: Session,
    *,
    candidate_id: int,
    q: str,
    include_archived: bool,
    limit: int,
) -> list[dict[str, Any]]:
    rows = (
        db.query(CandidateOpportunityWatch)
        .filter(CandidateOpportunityWatch.candidate_id == candidate_id)
        .order_by(CandidateOpportunityWatch.id.desc())
        .limit(80)
        .all()
    )
    out: list[dict[str, Any]] = []
    for w in rows:
        archived = getattr(w, "archived_at", None) is not None
        if archived and not include_archived:
            continue
        reasons: list[str] = []
        if _match(w.label or "", q):
            reasons.append("LABEL_MATCH")
        if not reasons:
            continue
        out.append(
            {
                "group": "record",
                "type": "opportunity_watch",
                "opaque_id": _opaque("opportunity_watch", w.id),
                "deep_link": f"/dashboard/matches?watch={w.id}",
                "title": (w.label or "")[:200],
                "excerpt": _safe_excerpt(w.label or ""),
                "status": "archived" if archived else (w.watch_type or "active"),
                "truth": "CANDIDATE_DECLARED",
                "source": "opportunity_watchlist",
                "updated_at": (w.updated_at or w.created_at).isoformat()
                if isinstance(w.updated_at or w.created_at, datetime)
                else None,
                "match_reasons": reasons,
                "provenance": {"domain": "opportunity_watch", "watch_type": w.watch_type},
            }
        )
        if len(out) >= limit:
            break
    return out


def search_interview(
    db: Session,
    *,
    candidate_id: int,
    q: str,
    include_archived: bool,
    limit: int,
) -> list[dict[str, Any]]:
    _ = include_archived
    rows = (
        db.query(CandidateInterviewProcess)
        .filter(
            CandidateInterviewProcess.candidate_id == candidate_id,
            CandidateInterviewProcess.deleted_at.is_(None),
        )
        .order_by(CandidateInterviewProcess.id.desc())
        .limit(80)
        .all()
    )
    out: list[dict[str, Any]] = []
    for proc in rows:
        reasons: list[str] = []
        if _match(proc.title or "", q):
            reasons.append("TITLE_MATCH")
        if _match(proc.company or "", q):
            reasons.append("COMPANY_MATCH")
        if _match(proc.role_title or "", q):
            reasons.append("LABEL_MATCH")
        if not reasons:
            continue
        out.append(
            {
                "group": "record",
                "type": "interview_process",
                "opaque_id": _opaque("interview_process", proc.id),
                "deep_link": f"/dashboard/interview-decision?process={proc.id}",
                "title": (proc.title or "")[:200],
                "excerpt": _safe_excerpt(f"{proc.company} · {proc.role_title}"),
                "status": proc.status or "active",
                "truth": proc.claim_kind or "UNKNOWN",
                "source": "interview_process",
                "updated_at": (proc.updated_at or proc.created_at).isoformat()
                if isinstance(proc.updated_at or proc.created_at, datetime)
                else None,
                "match_reasons": reasons,
                "provenance": {"domain": "interview_process", "company": "redacted"},
            }
        )
        if len(out) >= limit:
            break
    return out


def search_transition(
    db: Session,
    *,
    candidate_id: int,
    q: str,
    include_archived: bool,
    limit: int,
) -> list[dict[str, Any]]:
    _ = include_archived
    rows = (
        db.query(CandidateTransitionWorkspace)
        .filter(
            CandidateTransitionWorkspace.candidate_id == candidate_id,
            CandidateTransitionWorkspace.deleted_at.is_(None),
        )
        .order_by(CandidateTransitionWorkspace.id.desc())
        .limit(80)
        .all()
    )
    out: list[dict[str, Any]] = []
    for tr in rows:
        reasons: list[str] = []
        if _match(tr.title or "", q):
            reasons.append("TITLE_MATCH")
        if not reasons:
            continue
        out.append(
            {
                "group": "record",
                "type": "transition",
                "opaque_id": _opaque("transition", tr.id),
                "deep_link": f"/dashboard/career-transition?id={tr.id}",
                "title": (tr.title or "")[:200],
                "excerpt": _safe_excerpt(tr.title or ""),
                "status": tr.status or "active",
                "truth": tr.claim_kind or "UNKNOWN",
                "source": "transition_workspace",
                "updated_at": (tr.updated_at or tr.created_at).isoformat()
                if isinstance(tr.updated_at or tr.created_at, datetime)
                else None,
                "match_reasons": reasons,
                "provenance": {"domain": "transition"},
            }
        )
        if len(out) >= limit:
            break
    return out


def search_import_batch(
    db: Session,
    *,
    candidate_id: int,
    q: str,
    include_archived: bool,
    limit: int,
) -> list[dict[str, Any]]:
    """Only COMMITTED import batches — never quarantine/staging/raw ciphertext."""
    _ = include_archived
    rows = (
        db.query(CandidateImportBatch)
        .filter(
            CandidateImportBatch.candidate_id == candidate_id,
            CandidateImportBatch.deleted_at.is_(None),
            CandidateImportBatch.state == "COMMITTED",
        )
        .order_by(CandidateImportBatch.id.desc())
        .limit(40)
        .all()
    )
    out: list[dict[str, Any]] = []
    for batch in rows:
        reasons: list[str] = []
        if _match(batch.family or "", q) or _match("import", q) or _match(batch.state or "", q):
            reasons.append("FAMILY_MATCH")
        if not reasons:
            continue
        out.append(
            {
                "group": "record",
                "type": "import_batch",
                "opaque_id": _opaque("import_batch", batch.id),
                "deep_link": f"/dashboard/import?batch={batch.batch_key}",
                "title": f"Import · {batch.family}",
                "excerpt": _safe_excerpt(f"Committed import ({batch.family})"),
                "status": batch.state,
                "truth": "CANDIDATE_DECLARED",
                "source": "candidate_owned_import",
                "updated_at": (batch.updated_at or batch.created_at).isoformat()
                if isinstance(batch.updated_at or batch.created_at, datetime)
                else None,
                "match_reasons": reasons,
                "provenance": {
                    "domain": "import_batch",
                    "family": batch.family,
                    "content_indexed": False,
                },
            }
        )
        if len(out) >= limit:
            break
    return out


ADAPTERS: dict[str, AdapterFn] = {
    "evidence": search_evidence,
    "opportunity_watch": search_opportunity_watch,
    "interview_process": search_interview,
    "transition": search_transition,
    "import_batch": search_import_batch,
}


def run_adapters(
    db: Session,
    *,
    candidate_id: int,
    q: str,
    domains: list[str] | None,
    include_archived: bool,
    per_domain: int = 12,
) -> list[dict[str, Any]]:
    wanted = list(domains) if domains else list(ALLOWED_RECORD_DOMAINS)
    results: list[dict[str, Any]] = []
    for domain in wanted:
        if domain not in ALLOWED_RECORD_DOMAINS:
            # Fail closed — skip unknown
            continue
        fn = ADAPTERS.get(domain)
        if fn is None:
            continue
        results.extend(
            fn(
                db,
                candidate_id=candidate_id,
                q=q,
                include_archived=include_archived,
                limit=per_domain,
            )
        )
    # Stable deterministic order: type then opaque_id
    results.sort(key=lambda r: (str(r.get("type")), str(r.get("opaque_id"))))
    return results
