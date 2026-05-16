"""CLI: python -m app.automation.cli --job-id 1 --user-email you@example.com"""

from __future__ import annotations

import argparse

from app.database.session import SessionLocal
from app.database.models import Job, User
from app.services.auto_apply_service import auto_apply_for_user


def main() -> None:
    parser = argparse.ArgumentParser(description="TWIN auto-apply (visible browser)")
    parser.add_argument("--job-id", type=int, required=True)
    parser.add_argument("--email", type=str, required=True)
    parser.add_argument("--submit", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if not user:
            raise SystemExit(f"User not found: {args.email}")
        job = db.query(Job).filter(Job.id == args.job_id).first()
        if not job:
            raise SystemExit(f"Job not found: {args.job_id}")
        outcome, message, _app = auto_apply_for_user(
            db, user=user, job_id=args.job_id, submit=args.submit
        )
        print(f"{outcome.value}: {message}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
