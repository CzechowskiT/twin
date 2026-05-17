"""Lightweight DB session helper for scripts and one-off tools."""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.orm import Session

from app.database.session import SessionLocal


@contextmanager
def get_session() -> Iterator[Session]:
    """Yield a SQLAlchemy session and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
