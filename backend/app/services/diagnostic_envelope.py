"""Privacy-safe diagnostic envelope — recursive allowlist; candidate preview/opt-out."""

from __future__ import annotations

from typing import Any

ALLOWED_TOP = frozenset(
    {
        "surface",
        "route",
        "locale",
        "error_code",
        "http_status",
        "feature_flag",
        "client_version",
        "os_family",
        "browser_family",
        "journey_step",
        "recovery_hint_id",
        "support_category",
        "timestamp_bucket",
        "kpi_excluded",
        "synthetic",
        "claim_kind",
    }
)

SENSITIVE_KEYS = frozenset(
    {
        "email",
        "phone",
        "name",
        "full_name",
        "cv",
        "cv_text",
        "resume",
        "token",
        "invite_token",
        "password",
        "authorization",
        "cookie",
        "jd",
        "job_description",
        "notes",
        "interview_notes",
        "calendar",
        "calendar_title",
        "evidence",
        "transcript",
        "message",
        "body",
        "body_text",
        "subject",
        "attachment",
        "screenshot",
        "keystroke",
        "mouse",
        "ip",
        "address",
    }
)


def _reject_key(key: str) -> bool:
    k = key.strip().lower()
    if k in SENSITIVE_KEYS:
        return True
    if any(s in k for s in ("email", "token", "cv", "password", "secret", "phone")):
        return True
    return False


def sanitize_diagnostic(
    raw: Any,
    *,
    depth: int = 0,
    max_depth: int = 4,
) -> tuple[dict[str, Any] | list[Any] | None, list[str]]:
    """Return (sanitized, rejected_paths). Unknown nested keys rejected."""
    rejected: list[str] = []
    if depth > max_depth:
        rejected.append("max_depth")
        return None, rejected
    if raw is None:
        return {}, rejected
    if isinstance(raw, list):
        out_list: list[Any] = []
        for i, item in enumerate(raw[:20]):
            if isinstance(item, (dict, list)):
                cleaned, rej = sanitize_diagnostic(item, depth=depth + 1, max_depth=max_depth)
                rejected.extend(f"[{i}].{r}" for r in rej)
                if cleaned is not None:
                    out_list.append(cleaned)
            elif isinstance(item, (str, int, float, bool)):
                if isinstance(item, str) and len(item) > 80:
                    rejected.append(f"[{i}]:long_string")
                else:
                    out_list.append(item)
            else:
                rejected.append(f"[{i}]:unsupported")
        return out_list, rejected
    if not isinstance(raw, dict):
        rejected.append("not_object")
        return None, rejected
    out: dict[str, Any] = {}
    for key, value in list(raw.items())[:40]:
        sk = str(key)
        if _reject_key(sk) or sk not in ALLOWED_TOP:
            rejected.append(sk)
            continue
        if isinstance(value, (dict, list)):
            cleaned, rej = sanitize_diagnostic(value, depth=depth + 1, max_depth=max_depth)
            rejected.extend(f"{sk}.{r}" for r in rej)
            if cleaned is not None:
                out[sk] = cleaned
        elif isinstance(value, (str, int, float, bool)) or value is None:
            if isinstance(value, str) and len(value) > 120:
                rejected.append(f"{sk}:too_long")
                continue
            out[sk] = value
        else:
            rejected.append(f"{sk}:unsupported_type")
    return out, rejected


def build_preview_envelope(
    raw: dict[str, Any] | None,
    *,
    opt_in: bool,
) -> dict[str, Any]:
    cleaned, rejected = sanitize_diagnostic(raw or {})
    return {
        "schema": "twin.diagnostic_envelope/v1",
        "opt_in": bool(opt_in),
        "included": cleaned if opt_in else {},
        "rejected_fields": rejected,
        "candidate_previewable": True,
        "attachments_allowed": False,
        "screenshots_allowed": False,
        "cv_capture": False,
        "external_email_auto": False,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }
