"""Auto-tag smoke/demo/admin accounts so they never pollute North Star.

Convention (document in ACTIVATION_COHORT_OPS_PACK):
- Email local-part prefixes: smoke-, demo-, test-, synthetic-, e2e-, playwright-
- Domains: @twin.internal, @example.com (synthetic), @mailinator.com
- UTM: utm_source in {smoke,demo,synthetic,e2e} OR utm_campaign containing smoke|demo|synthetic
- Env: METRICS_EXCLUDE_EMAIL_SUFFIXES (comma-separated) for ops overrides
"""

from __future__ import annotations

import os
import re
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import User

_EMAIL_PREFIX_RE = re.compile(
    r"^(smoke|demo|test|synthetic|e2e|playwright)[-_.]",
    re.IGNORECASE,
)
# Do NOT include example.com — pytest fixtures use it for real (non-excluded) accounts.
_EXCLUDED_DOMAINS = frozenset(
    {
        "twin.internal",
        "mailinator.com",
        "guerrillamail.com",
    }
)
_UTM_SOURCE_EXACT = frozenset({"smoke", "demo", "synthetic", "e2e", "playwright", "internal"})
_UTM_CAMPAIGN_TOKENS = ("smoke", "demo", "synthetic", "e2e", "playwright")


def _email_parts(email: str) -> tuple[str, str]:
    raw = (email or "").strip().lower()
    if "@" not in raw:
        return raw, ""
    local, _, domain = raw.partition("@")
    return local, domain


def should_exclude_from_product_metrics(
    *,
    email: str | None = None,
    utm_source: str | None = None,
    utm_campaign: str | None = None,
    utm_medium: str | None = None,
) -> bool:
    """Return True when account looks like smoke/demo/synthetic/internal."""
    local, domain = _email_parts(email or "")
    if local and _EMAIL_PREFIX_RE.match(local):
        return True
    if domain in _EXCLUDED_DOMAINS:
        return True
    suffixes = (os.environ.get("METRICS_EXCLUDE_EMAIL_SUFFIXES") or "").strip()
    if suffixes and email:
        lower = email.strip().lower()
        for suf in suffixes.split(","):
            s = suf.strip().lower()
            if s and lower.endswith(s):
                return True
    src = (utm_source or "").strip().lower()
    if src in _UTM_SOURCE_EXACT:
        return True
    med = (utm_medium or "").strip().lower()
    if med in {"synthetic", "smoke", "e2e"}:
        return True
    camp = (utm_campaign or "").strip().lower()
    if camp and any(tok in camp for tok in _UTM_CAMPAIGN_TOKENS):
        return True
    return False


def apply_metrics_exclusion_to_user(
    user: User,
    *,
    force: bool | None = None,
    commit: bool = False,
    db: Session | None = None,
) -> bool:
    """Set exclude_from_product_metrics when heuristics match (or force=True).

    Never clears an existing True flag (ops may have marked manually).
    Returns True if the flag is True after this call.
    """
    if user.exclude_from_product_metrics:
        return True
    exclude = (
        True
        if force is True
        else should_exclude_from_product_metrics(
            email=user.email,
            utm_source=user.signup_utm_source,
            utm_campaign=user.signup_utm_campaign,
            utm_medium=user.signup_utm_medium,
        )
    )
    if not exclude:
        return False
    user.exclude_from_product_metrics = True
    if db is not None:
        db.add(user)
        if commit:
            db.commit()
            db.refresh(user)
    return True


def exclusion_reason_preview(
    *,
    email: str | None = None,
    utm_source: str | None = None,
    utm_campaign: str | None = None,
    utm_medium: str | None = None,
) -> dict[str, Any]:
    """Ops/debug helper — no PII beyond email domain."""
    local, domain = _email_parts(email or "")
    matched = should_exclude_from_product_metrics(
        email=email,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        utm_medium=utm_medium,
    )
    reasons: list[str] = []
    if local and _EMAIL_PREFIX_RE.match(local):
        reasons.append("email_prefix")
    if domain in _EXCLUDED_DOMAINS:
        reasons.append("email_domain")
    if (utm_source or "").strip().lower() in _UTM_SOURCE_EXACT:
        reasons.append("utm_source")
    if (utm_medium or "").strip().lower() in {"synthetic", "smoke", "e2e"}:
        reasons.append("utm_medium")
    camp = (utm_campaign or "").strip().lower()
    if camp and any(tok in camp for tok in _UTM_CAMPAIGN_TOKENS):
        reasons.append("utm_campaign")
    return {"exclude": matched, "reasons": reasons, "email_domain": domain or None}
