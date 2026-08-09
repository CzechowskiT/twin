"""Epic 2.20 — derived candidate access inventory + delegated revocation.

No new aggregate grant store. Adapters read owner sources at request time.
Never serialize secrets, bearer URLs, tokens, or pack bytes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateCalendarPrivateFeed,
    CandidateCareerPack,
    CandidateCareerPackShareGrant,
    User,
    UserGoogleCalendar,
    UserMicrosoftCalendar,
)
from app.services import acceptance_calendar as acal
from app.services import candidate_career_pack as ccp
from app.services import candidate_career_pack_share as cps
from app.services import candidate_privacy_request_service as cprs
from app.services import read_only_calendar_sync as rocs
from app.services.calendar_oauth_credentials import get_best_google_row
from app.services.candidate_access_inventory_constants import (
    ACCESS_ANALYTICS,
    ACCESS_KINDS,
    CONTRACT_ID,
    EIGHTH_PRIMARY_NAV,
    EXCLUDED_DOMAINS,
    FIRST_VALUE_CONTRACT,
    FIRST_VALUE_SATISFIED_BY_ACCESS_CENTER,
    KIND_TO_GROUP,
    NEW_ACCESS_GRANT_STORE,
    OUTBOUND_SEND,
    PARALLEL_AUDIT_TIMELINE_STORE,
    PARALLEL_AUTH_SESSION_STORE,
    PARALLEL_CONSENT_STORE,
    PARALLEL_SHARE_STORE,
    PARALLEL_TOKEN_STORE,
    RECIPIENT_TRACKING,
    REVOCATION_SCHEMA_ID,
    SCHEMA_ID,
    UX_GROUPS,
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def catalog() -> dict[str, Any]:
    return {
        "schema_id": SCHEMA_ID,
        "revocation_schema_id": REVOCATION_SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "first_value_contract": FIRST_VALUE_CONTRACT,
        "access_kinds": list(ACCESS_KINDS),
        "ux_groups": list(UX_GROUPS),
        "excluded_domains": list(EXCLUDED_DOMAINS),
        "new_access_grant_store": NEW_ACCESS_GRANT_STORE,
        "parallel_token_store": PARALLEL_TOKEN_STORE,
        "parallel_auth_session_store": PARALLEL_AUTH_SESSION_STORE,
        "parallel_consent_store": PARALLEL_CONSENT_STORE,
        "parallel_share_store": PARALLEL_SHARE_STORE,
        "parallel_audit_timeline_store": PARALLEL_AUDIT_TIMELINE_STORE,
        "outbound_send": OUTBOUND_SEND,
        "recipient_tracking": RECIPIENT_TRACKING,
        "access_analytics": ACCESS_ANALYTICS,
        "eighth_primary_nav": EIGHTH_PRIMARY_NAV,
        "first_value_satisfied_by_access_center": FIRST_VALUE_SATISFIED_BY_ACCESS_CENTER,
        "derived_only": True,
        "secrets_in_inventory": False,
    }


def _item(
    *,
    kind: str,
    access_key: str,
    title: str,
    scope: str,
    state: str,
    owner_module: str,
    revocable: bool,
    revision: str,
    expires_at: str | None = None,
    consequence: str,
    provider: str | None = None,
    source_ref: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "access_key": access_key,
        "kind": kind,
        "group": KIND_TO_GROUP.get(kind, "connected_services"),
        "title": title,
        "scope": scope,
        "state": state,
        "owner_module": owner_module,
        "revocable": revocable,
        "revision": revision,
        "expires_at": expires_at,
        "consequence": consequence,
        "provider": provider,
        "source_ref": source_ref or {},
        "secret_present": False,
        "bearer_url_present": False,
        "recipient_activity": None,
        "urgency_score": None,
    }


def _auth_session_items(user: User) -> list[dict[str, Any]]:
    # Stateless JWT — inventory shows current session meta only; no server revoke-all.
    rev = f"user:{user.id}:auth:v1"
    return [
        _item(
            kind="AUTH_SESSION",
            access_key=f"auth_session:current:{user.id}",
            title="Current signed-in session",
            scope="JWT access to your TWIN account on this device",
            state="ACTIVE",
            owner_module="auth.jwt",
            revocable=False,
            revision=rev,
            consequence=(
                "Sign out on this device clears the local token. "
                "TWIN has no server-side session list to revoke other devices."
            ),
            provider="twin",
            source_ref={"user_id": user.id, "server_session_store": False},
        )
    ]


def _oauth_items(db: Session, *, user: User) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    g = get_best_google_row(db, user.id)
    if g is not None:
        rev = f"google_cal:{user.id}:{getattr(g, 'updated_at', None) or g.created_at}"
        out.append(
            _item(
                kind="OAUTH_CONNECTION",
                access_key=f"oauth:google_calendar:{user.id}",
                title="Google Calendar connection",
                scope="Calendar read (busy/events as configured)",
                state="ACTIVE",
                owner_module="calendar.google",
                revocable=True,
                revision=str(rev),
                consequence="Disconnect removes Google Calendar tokens from TWIN.",
                provider="google",
                source_ref={"email_present": bool(getattr(g, "google_email", None))},
            )
        )
    ms = (
        db.query(UserMicrosoftCalendar)
        .filter(UserMicrosoftCalendar.user_id == user.id)
        .one_or_none()
    )
    if ms is not None and (
        ms.refresh_token_encrypted or getattr(ms, "access_token_encrypted", None)
    ):
        rev = f"ms_cal:{user.id}:{getattr(ms, 'updated_at', None) or ms.created_at}"
        out.append(
            _item(
                kind="OAUTH_CONNECTION",
                access_key=f"oauth:microsoft_calendar:{user.id}",
                title="Microsoft Calendar connection",
                scope="Calendar busy-read (write off)",
                state="ACTIVE",
                owner_module="calendar.microsoft",
                revocable=True,
                revision=str(rev),
                consequence="Disconnect removes Microsoft Calendar tokens from TWIN.",
                provider="microsoft",
                source_ref={"token_refs_only": True},
            )
        )
    return out


def _consent_items(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    consent = acal.get_or_create_consent(db, candidate_id=candidate_id)
    if not consent.ms_busy_read_opt_in and not getattr(consent, "ics_export_opt_in", False):
        return []
    flags = []
    if consent.ms_busy_read_opt_in:
        flags.append("ms_busy_read")
    if getattr(consent, "ics_export_opt_in", False):
        flags.append("ics_export")
    rev = f"cal_consent:{candidate_id}:v{int(consent.version or 0)}"
    return [
        _item(
            kind="CALENDAR_READ_CONSENT",
            access_key=f"calendar_read_consent:{candidate_id}",
            title="Calendar read consent",
            scope=", ".join(flags),
            state="ACTIVE",
            owner_module="calendar_sync.consent",
            revocable=True,
            revision=rev,
            consequence="Turning consent off stops busy-read sync; cached busy blocks are purged.",
            provider="twin",
            source_ref={"consent_version": int(consent.version or 0)},
        )
    ]


def _feed_items(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    rows = (
        db.query(CandidateCalendarPrivateFeed)
        .filter(
            CandidateCalendarPrivateFeed.candidate_id == candidate_id,
            CandidateCalendarPrivateFeed.deleted_at.is_(None),
            CandidateCalendarPrivateFeed.status == "active",
        )
        .order_by(CandidateCalendarPrivateFeed.id.desc())
        .limit(20)
        .all()
    )
    out: list[dict[str, Any]] = []
    for f in rows:
        rev = f"feed:{f.id}:v{int(f.token_version or 1)}"
        out.append(
            _item(
                kind="PRIVATE_CALENDAR_FEED",
                access_key=f"private_calendar_feed:{f.id}",
                title="Private calendar feed",
                scope="Internal holds ICS/WebCal (opaque token)",
                state="ACTIVE",
                owner_module="calendar_sync.feeds",
                revocable=True,
                revision=rev,
                expires_at=f.expires_at.isoformat() if f.expires_at else None,
                consequence="Revoke invalidates the feed URL immediately; subscribers stop seeing new holds.",
                provider="twin",
                source_ref={"feed_id": f.id, "token_hash_redacted": True},
            )
        )
    return out


def _share_items(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    rows = (
        db.query(CandidateCareerPackShareGrant)
        .filter(
            CandidateCareerPackShareGrant.candidate_id == candidate_id,
            CandidateCareerPackShareGrant.deleted_at.is_(None),
            CandidateCareerPackShareGrant.state == "ACTIVE",
        )
        .order_by(CandidateCareerPackShareGrant.id.desc())
        .limit(50)
        .all()
    )
    out: list[dict[str, Any]] = []
    for g in rows:
        pack = db.query(CandidateCareerPack).filter(CandidateCareerPack.id == g.pack_id).one_or_none()
        cps._refresh_grant_state(db, g, pack)
        if g.state != "ACTIVE":
            continue
        rev = f"share:{g.grant_key}:{g.pack_snapshot_hash[:12]}"
        out.append(
            _item(
                kind="CAREER_PACK_SHARE",
                access_key=f"career_pack_share:{g.grant_key}",
                title="Private Career Pack share link",
                scope=f"{g.permission}; immutable pack revision",
                state="ACTIVE",
                owner_module="career_pack.share",
                revocable=True,
                revision=rev,
                expires_at=g.expires_at.isoformat() if g.expires_at else None,
                consequence="Revoke closes recipient access immediately. TWIN never sends the link.",
                provider="twin",
                source_ref={
                    "grant_key": g.grant_key,
                    "pack_key": pack.pack_key if pack else None,
                    "public_id_prefix": g.public_id[:8],
                },
            )
        )
    db.commit()
    return out


def _pack_artifact_items(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    packs = ccp.list_packs(db, candidate_id=candidate_id).get("packs") or []
    out: list[dict[str, Any]] = []
    for p in packs:
        if not isinstance(p, dict):
            continue
        if p.get("state") != "READY" or not (p.get("has_pdf") or p.get("has_zip")):
            continue
        pk = str(p.get("pack_key") or "")
        rev = f"pack:{pk}:{p.get('snapshot_hash') or 'x'}"
        out.append(
            _item(
                kind="TEMPORARY_CAREER_PACK_ARTIFACT",
                access_key=f"career_pack_artifact:{pk}",
                title="Career Pack download artifact",
                scope="Owner-only PDF/ZIP until expiry or revoke",
                state="ACTIVE",
                owner_module="career_pack",
                revocable=True,
                revision=rev,
                expires_at=p.get("expires_at"),
                consequence="Revoke/delete clears download bytes; existing downloads you saved are outside TWIN.",
                provider="twin",
                source_ref={"pack_key": pk, "byte_size": p.get("byte_size")},
            )
        )
    return out


def _privacy_export_items(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    out = [
        _item(
            kind="TEMPORARY_PRIVACY_EXPORT",
            access_key=f"privacy_export:live:{candidate_id}",
            title="Self-serve privacy export",
            scope="On-demand export.json via your signed-in session (no stored download token)",
            state="AVAILABLE",
            owner_module="candidates.export",
            revocable=False,
            revision=f"export_live:{candidate_id}:v1",
            consequence="Export requires your current session; there is no lasting download link to revoke.",
            provider="twin",
            source_ref={"path": "/api/v1/candidates/me/export.json"},
        )
    ]
    listed = cprs.list_privacy_requests(db, candidate_id=candidate_id, limit=20, offset=0)
    items = listed.get("items") if isinstance(listed, dict) else listed
    if not isinstance(items, list):
        items = []
    for row in items:
        if not isinstance(row, dict):
            continue
        if row.get("request_type") not in {"export", "portability"}:
            continue
        if row.get("status") not in {"open", "processing"}:
            continue
        rid = row.get("id")
        rev = f"privacy_req:{rid}:{row.get('updated_at') or row.get('created_at')}"
        out.append(
            _item(
                kind="TEMPORARY_PRIVACY_EXPORT",
                access_key=f"privacy_export_request:{rid}",
                title=f"Privacy {row.get('request_type')} request",
                scope="Manual ops fulfillment (no auto-download token)",
                state=str(row.get("status") or "open").upper(),
                owner_module="privacy_requests",
                revocable=row.get("status") == "open",
                revision=str(rev),
                consequence="Cancel stops the open request; completed exports are not retractable from recipient devices.",
                provider="twin",
                source_ref={"request_id": rid, "request_type": row.get("request_type")},
            )
        )
    return out


def build_inventory(db: Session, *, user: User, candidate_id: int) -> dict[str, Any]:
    """Request-time derived inventory — never writes a grant aggregate."""
    items: list[dict[str, Any]] = []
    unavailable: list[str] = []
    adapters = [
        ("AUTH_SESSION", lambda: _auth_session_items(user)),
        ("OAUTH_CONNECTION", lambda: _oauth_items(db, user=user)),
        ("CALENDAR_READ_CONSENT", lambda: _consent_items(db, candidate_id=candidate_id)),
        ("PRIVATE_CALENDAR_FEED", lambda: _feed_items(db, candidate_id=candidate_id)),
        ("CAREER_PACK_SHARE", lambda: _share_items(db, candidate_id=candidate_id)),
        ("TEMPORARY_CAREER_PACK_ARTIFACT", lambda: _pack_artifact_items(db, candidate_id=candidate_id)),
        ("TEMPORARY_PRIVACY_EXPORT", lambda: _privacy_export_items(db, candidate_id=candidate_id)),
    ]
    for kind, fn in adapters:
        try:
            items.extend(fn())
        except Exception:
            unavailable.append(kind)
    groups = {g: [] for g in UX_GROUPS}
    for it in items:
        groups.setdefault(it["group"], []).append(it)
    return {
        "schema_id": SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "new_access_grant_store": NEW_ACCESS_GRANT_STORE,
        "derived_only": True,
        "items": items,
        "groups": groups,
        "unavailable_sources": unavailable,
        "excluded_domains": list(EXCLUDED_DOMAINS),
        "recipient_tracking": False,
        "access_analytics": False,
        "first_value_satisfied": False,
        "kpi_excluded": True,
        "generated_at": _utcnow().isoformat(),
        "inventory_revision": str(uuid4()),
    }


def _verify_gone(db: Session, *, user: User, candidate_id: int, access_key: str) -> bool:
    inv = build_inventory(db, user=user, candidate_id=candidate_id)
    active = {
        i["access_key"]
        for i in inv["items"]
        if i.get("state") in {"ACTIVE", "AVAILABLE", "OPEN", "PROCESSING"}
    }
    return access_key not in active


def revoke_access(
    db: Session,
    *,
    user: User,
    candidate_id: int,
    access_key: str,
    kind: str,
    client_revision: str,
    confirm: bool = False,
) -> dict[str, Any]:
    """Delegate revoke to owner modules; verify post-condition. Never success-on-accept."""
    if not confirm:
        raise ValueError("confirm_required")
    inv = build_inventory(db, user=user, candidate_id=candidate_id)
    match = next((i for i in inv["items"] if i["access_key"] == access_key), None)
    if match is None:
        raise LookupError("access_not_found")
    if match["kind"] != kind:
        raise ValueError("kind_mismatch")
    if client_revision and client_revision != match["revision"]:
        raise ValueError("revision_mismatch")
    if not match.get("revocable"):
        raise ValueError("not_revocable")

    if kind == "OAUTH_CONNECTION":
        _revoke_oauth(db, user=user, candidate_id=candidate_id, access_key=access_key)
    elif kind == "CALENDAR_READ_CONSENT":
        rocs.update_consent_lifecycle(
            db,
            candidate_id=candidate_id,
            user_id=user.id,
            ms_busy_read_opt_in=False,
            ics_export_opt_in=False,
        )
    elif kind == "PRIVATE_CALENDAR_FEED":
        feed_id = int((match.get("source_ref") or {}).get("feed_id"))
        rocs.revoke_private_feed(db, candidate_id=candidate_id, feed_id=feed_id)
    elif kind == "CAREER_PACK_SHARE":
        ref = match.get("source_ref") or {}
        pack_key = str(ref.get("pack_key") or "")
        grant_key = str(ref.get("grant_key") or "")
        cps.revoke_grant(db, candidate_id=candidate_id, pack_key=pack_key, grant_key=grant_key)
    elif kind == "TEMPORARY_CAREER_PACK_ARTIFACT":
        pack_key = str((match.get("source_ref") or {}).get("pack_key") or "")
        ccp.revoke(db, candidate_id=candidate_id, pack_key=pack_key)
    elif kind == "TEMPORARY_PRIVACY_EXPORT":
        rid = (match.get("source_ref") or {}).get("request_id")
        if rid is None:
            raise ValueError("not_revocable")
        cprs.cancel_privacy_request(
            db, candidate_id=candidate_id, request_id=int(rid), user_id=user.id
        )
    else:
        raise ValueError("unsupported_kind")

    verified = _verify_gone(db, user=user, candidate_id=candidate_id, access_key=access_key)
    if not verified:
        raise RuntimeError("post_condition_failed")
    return {
        "schema_id": REVOCATION_SCHEMA_ID,
        "revoked": True,
        "access_key": access_key,
        "kind": kind,
        "post_condition_verified": True,
        "success_on_accept": False,
        "first_value_satisfied": False,
        "recipient_tracking": False,
    }


def _revoke_oauth(db: Session, *, user: User, candidate_id: int, access_key: str) -> None:
    if "google_calendar" in access_key:
        row = get_best_google_row(db, user.id)
        if row:
            db.delete(row)
            db.commit()
        return
    if "microsoft_calendar" in access_key:
        rocs.disconnect_connection(db, candidate_id=candidate_id, user_id=user.id)
        row = (
            db.query(UserMicrosoftCalendar)
            .filter(UserMicrosoftCalendar.user_id == user.id)
            .one_or_none()
        )
        if row:
            db.delete(row)
            db.commit()
        return
    raise ValueError("unknown_oauth")
