#!/usr/bin/env python3
"""Idempotent investor demo seed (CLI wrapper around app.services.investor_demo_seed).

Run from repository root:

  python3 scripts/seed-investor-demo.py
  python3 scripts/seed-investor-demo.py --print-credentials --reset-password

Env:
  DEMO_USER_EMAIL or INVESTOR_DEMO_EMAIL (default demo@twin.career)
  INVESTOR_DEMO_PASSWORD (required for --reset-password or first run)
  RECRUITER_DEMO_COMPANY_SLUG (default nova-hiring-pl — from primary demo job)
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database.connection import get_session  # noqa: E402
from app.database.models import Application, ApplicationStatus, Job  # noqa: E402
from app.services.investor_demo_seed import run_investor_demo_seed  # noqa: E402
from app.services.placement_verification import (  # noqa: E402
    PLACEMENT_VERIFIED,
    record_placement_event,
)
from app.services.recruiter_company_auth import mint_recruiter_company_token  # noqa: E402
from app.utils.slug import slugify_company  # noqa: E402


def _seed_placement_on_application(db, *, application_id: int, user_id: int) -> None:
    from app.database.models import Application, PlacementEvent

    if db.query(PlacementEvent).filter(PlacementEvent.application_id == application_id).count() >= 2:
        return
    app = db.get(Application, application_id)
    if not app:
        return
    record_placement_event(
        db,
        application_id=application_id,
        event_type="placement.declared",
        actor="candidate",
        detail={"source": "seed-investor-demo"},
        owner_user_id=user_id,
    )
    app.placement_state = "declared"
    record_placement_event(
        db,
        application_id=application_id,
        event_type="placement.verified",
        actor="system",
        detail={"method": "demo_seed"},
        owner_user_id=user_id,
    )
    app.placement_state = PLACEMENT_VERIFIED
    app.status = ApplicationStatus.HIRED
    db.add(app)


def _seed_recruiter_batch_extras(db, *, candidate_id: int, company: str) -> int:
    """Extra APPLIED rows for recruiter inbox (same company as primary demo job)."""
    slug = slugify_company(company)
    added = 0
    jobs = (
        db.query(Job)
        .filter(Job.company == company, Job.is_validated.is_(True))
        .limit(5)
        .all()
    )
    for job in jobs[1:3]:
        exists = (
            db.query(Application)
            .filter(Application.candidate_id == candidate_id, Application.job_id == job.id)
            .first()
        )
        if exists:
            if exists.status not in (ApplicationStatus.APPLIED, ApplicationStatus.INTERVIEW):
                exists.status = ApplicationStatus.APPLIED
                db.add(exists)
            continue
        db.add(
            Application(
                candidate_id=candidate_id,
                job_id=job.id,
                status=ApplicationStatus.APPLIED,
                notes="Investor demo — recruiter batch inbox",
            ),
        )
        added += 1
    return added


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed investor demo data (idempotent).")
    parser.add_argument("--print-credentials", action="store_true", help="Print recruiter inbox token when minted.")
    parser.add_argument("--reset-password", action="store_true", help="Reset demo user password from env.")
    args = parser.parse_args()

    email = (
        os.environ.get("INVESTOR_DEMO_EMAIL") or os.environ.get("DEMO_USER_EMAIL") or DEFAULT_DEMO_EMAIL
    ).strip().lower()
    password = (os.environ.get("INVESTOR_DEMO_PASSWORD") or os.environ.get("DEMO_USER_PASSWORD") or "").strip()
    if len(password) < 12:
        print(
            "Set DEMO_USER_PASSWORD or INVESTOR_DEMO_PASSWORD (12+ chars). Never commit secrets.",
            file=sys.stderr,
        )
        return 1

    company_slug = (os.environ.get("RECRUITER_DEMO_COMPANY_SLUG") or "nova-hiring-pl").strip()

    try:
        with get_session() as db:
            summary = run_investor_demo_seed(
                db,
                email=email,
                password=password,
                reset_password=args.reset_password,
                recompute_live_scores=False,
            )
            _seed_placement_on_application(
                db,
                application_id=int(summary["application_id"]),
                user_id=int(summary["user_id"]),
            )
            from app.database.models import Job

            primary = db.get(Job, summary["job_ids"][0])
            company = primary.company if primary else "Nova Hiring PL"
            batch_added = _seed_recruiter_batch_extras(
                db,
                candidate_id=int(summary["candidate_id"]),
                company=company,
            )
            db.commit()

            raw_token: str | None = None
            from app.database.models import RecruiterCompanyToken

            token_row = (
                db.query(RecruiterCompanyToken)
                .filter(
                    RecruiterCompanyToken.company_slug == company_slug,
                    RecruiterCompanyToken.revoked_at.is_(None),
                )
                .first()
            )
            if not token_row:
                token_row, raw_token = mint_recruiter_company_token(
                    db,
                    company_slug=company_slug,
                    label="Investor demo inbox",
                )

    except Exception as exc:
        print(f"seed-investor-demo failed: {exc}", file=sys.stderr)
        return 1

    print("Investor demo seed OK:")
    print(f"  email: {email}")
    print("  password:    (not printed — use your env password)")
    print(f"  application_id: {summary['application_id']}")
    print(f"  interview_id: {summary['interview_id']}")
    print(f"  jobs: {len(summary['job_ids'])}")
    print(f"  recruiter_batch_extra_apps: {batch_added}")
    print(f"  recruiter_inbox: /recruiter/inbox?company_slug={company_slug}")
    if args.print_credentials and raw_token:
        print(f"  recruiter_token: {raw_token}")
    elif args.print_credentials:
        print("  recruiter_token: (existing token — revoke in admin to mint a new one)")
    print("  docs: docs/INVESTOR_DEMO_RUNBOOK.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
