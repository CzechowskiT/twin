"""Capture free-text referral at signup; resolve active referrer by email-shaped note."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import User

UTM_FIELD_MAX_LEN = 128


def normalize_utm_field(raw: str | None, *, max_len: int = UTM_FIELD_MAX_LEN) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    return s[:max_len]


def normalize_stored_referred_by_note(raw: str | None, *, max_len: int = 500) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    return s[:max_len]


def _note_as_normalized_email(note: str) -> str | None:
    """Return normalized lower email only if the whole note is a single valid address."""
    from email_validator import EmailNotValidError, validate_email

    try:
        return validate_email(note.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        return None


def resolve_signup_referrer_user_id(
    db: Session,
    *,
    stored_note: str | None,
    new_user_email: str,
) -> int | None:
    """If ``stored_note`` is one valid email matching an active user, return that user's id."""
    if not stored_note:
        return None
    candidate = _note_as_normalized_email(stored_note)
    if not candidate:
        return None
    if candidate == new_user_email.strip().lower():
        return None
    ref = (
        db.query(User)
        .filter(
            func.lower(User.email) == candidate,
            User.is_active.is_(True),
        )
        .first()
    )
    return int(ref.id) if ref else None


def resolve_signup_referrer_from_utm_content(
    db: Session,
    *,
    utm_content: str | None,
    new_user_email: str,
) -> int | None:
    """Resolve referrer when ``utm_content`` equals another active user's ``referral_public_token``."""
    normalized = normalize_utm_field(utm_content)
    if not normalized:
        return None
    email_lower = new_user_email.strip().lower()
    ref = (
        db.query(User)
        .filter(
            User.referral_public_token == normalized,
            User.is_active.is_(True),
        )
        .first()
    )
    if not ref:
        return None
    if ref.email.strip().lower() == email_lower:
        return None
    return int(ref.id)


def resolve_combined_signup_referrer_user_id(
    db: Session,
    *,
    stored_note: str | None,
    new_user_email: str,
    ref: str | None = None,
    utm_content: str | None = None,
) -> int | None:
    """Pick ``signup_referrer_user_id``: **share token (`ref` or `utm_content`) first**, then email note.

    Documented merge rule: a matching public ``referral_public_token`` wins over ``referred_by_note``
    so share links stay authoritative for attribution.
    """
    token = normalize_utm_field(ref) or normalize_utm_field(utm_content)
    tid = resolve_signup_referrer_from_utm_content(
        db, utm_content=token, new_user_email=new_user_email
    )
    if tid is not None:
        return tid
    return resolve_signup_referrer_user_id(db, stored_note=stored_note, new_user_email=new_user_email)
