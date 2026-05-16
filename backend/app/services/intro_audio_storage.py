"""Store optional “tell me about yourself” audio; transcription wired in a later phase."""

from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Candidate

_ALLOWED_SUFFIX = frozenset({".webm", ".mp3", ".wav", ".m4a", ".ogg"})


def save_intro_audio_for_candidate(
    db: Session,
    candidate: Candidate,
    *,
    content: bytes,
    filename: str,
) -> Candidate:
    settings = get_settings()
    suffix = Path(filename).suffix.lower()
    if suffix not in _ALLOWED_SUFFIX:
        raise ValueError(f"Unsupported audio type ({suffix or 'none'}). Use webm, mp3, wav, m4a, or ogg.")

    upload_dir = Path(settings.intro_audio_upload_dir) / str(candidate.user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name.replace("..", "_")
    file_path = upload_dir / safe_name
    file_path.write_bytes(content)

    candidate.intro_audio_path = str(file_path)
    candidate.intro_audio_uploaded_at = datetime.utcnow()
    candidate.intro_audio_transcript = None
    candidate.profile_signals_json = None

    db.commit()
    db.refresh(candidate)
    return candidate
