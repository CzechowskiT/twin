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
from app.services.investor_demo_seed import (  # noqa: E402
    DEFAULT_DEMO_EMAIL,
    ensure_demo_placement_verified,
    ensure_recruiter_inbox_demo,
    run_investor_demo_seed,
)
from app.services.recruiter_company_auth import mint_recruiter_company_token  # noqa: E402


def _seed_recruiter_batch_extras(db, *, candidate_id: int, company: str) -> int:
    """Extra APPLIED rows for recruiter inbox (delegates to shared seed helper)."""
    del candidate_id  # kept for CLI compatibility; shared helper covers all demo candidates
    out = ensure_recruiter_inbox_demo(db, company=company)
    return int(out.get("created", 0)) + int(out.get("reset_to_applied", 0))


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
            placement = ensure_demo_placement_verified(
                db,
                application_id=int(summary["application_id"]),
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
    print(f"  placement_verified: {placement.get('verified', False)} (app_id={placement.get('application_id', 0)})")
    print(f"  recruiter_inbox: /recruiter/inbox?company_slug={company_slug}")
    if args.print_credentials and raw_token:
        print(f"  recruiter_token: {raw_token}")
    elif args.print_credentials:
        print("  recruiter_token: (existing token — revoke in admin to mint a new one)")
    print("  docs: docs/INVESTOR_DEMO_RUNBOOK.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
