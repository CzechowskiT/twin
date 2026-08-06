"""Epic 2.10 — activation manifest validator (DRY-RUN ONLY).

Never activates, generates, sends, or redeems. Rejects unknown fields.
No PII may be persisted to git; validator accepts in-memory/dict payloads only.
"""

from __future__ import annotations

from typing import Any

REQUIRED_FIELDS = frozenset(
    {
        "unique_id",
        "founder_approval",
        "approval_timestamp",
        "approved_roster_reference",
        "hard_cohort_cap",
        "canary_wave_size",
        "invite_expiry",
        "delivery_channel",
        "generation_authorization",
        "send_authorization",
        "observation_window",
        "support_owner",
        "support_channel",
        "incident_owner",
        "privacy_notice_version",
        "consent_version",
        "rollback_owner",
    }
)

OPTIONAL_FIELDS = frozenset({"schema", "notes", "dry_run"})

FORBIDDEN_PII_KEYS = frozenset(
    {
        "emails",
        "recipients",
        "roster",
        "email",
        "phone",
        "cv",
        "cv_text",
        "token",
        "invite_token",
        "name",
        "full_name",
    }
)


def validate_activation_manifest_dry_run(payload: dict[str, Any] | None) -> dict[str, Any]:
    """Validate structure only. Always mutates_state=false; never activates."""
    data = payload if isinstance(payload, dict) else {}
    errors: list[str] = []
    unknown = sorted(k for k in data if k not in REQUIRED_FIELDS | OPTIONAL_FIELDS)
    if unknown:
        errors.append(f"unknown_fields:{','.join(unknown[:20])}")
    for key in FORBIDDEN_PII_KEYS:
        if key in data:
            errors.append(f"forbidden_pii_field:{key}")
    missing = sorted(f for f in REQUIRED_FIELDS if f not in data or data.get(f) in (None, "", []))
    if missing:
        errors.append(f"missing_fields:{','.join(missing)}")
    try:
        cohort = int(data.get("hard_cohort_cap") or 0)
        if cohort < 1 or cohort > 3:
            errors.append("hard_cohort_cap_must_be_1_to_3")
    except (TypeError, ValueError):
        if "hard_cohort_cap" in data:
            errors.append("hard_cohort_cap_not_int")
    try:
        canary = int(data.get("canary_wave_size") or 0)
        if canary < 1 or canary > 1:
            errors.append("canary_wave_size_must_be_1")
    except (TypeError, ValueError):
        if "canary_wave_size" in data:
            errors.append("canary_wave_size_not_int")
    send_auth = data.get("send_authorization")
    gen_auth = data.get("generation_authorization")
    if send_auth is not None and gen_auth is not None and send_auth == gen_auth:
        errors.append("send_authorization_must_differ_from_generation")
    return {
        "schema": "twin.activation_manifest_validator/v1",
        "valid": len(errors) == 0,
        "errors": errors,
        "dry_run": True,
        "mutates_state": False,
        "activates": False,
        "generates_invites": False,
        "sends_invites": False,
        "redeems_invites": False,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }
