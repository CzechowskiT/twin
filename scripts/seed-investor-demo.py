#!/usr/bin/env python3
"""Seed or refresh production/staging data for the investor demo path.

Requires DATABASE_URL (or Railway-linked env). Never commit passwords — pass via env or CLI.

  export DEMO_USER_PASSWORD='…'   # or INVESTOR_DEMO_PASSWORD (legacy alias)
  export DEMO_USER_EMAIL=demo@twin.career   # optional
  python3 scripts/seed-investor-demo.py

  # Against Railway (from repo root, after `railway link` + DATABASE_URL):
  railway run python3 scripts/seed-investor-demo.py --reset-password
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database.connection import get_session  # noqa: E402
from app.services.investor_demo_seed import (  # noqa: E402
    DEFAULT_DEMO_EMAIL,
    demo_email_from_env,
    run_investor_demo_seed,
)


def _password_from_env() -> str:
    return (
        os.environ.get("DEMO_USER_PASSWORD", "").strip()
        or os.environ.get("INVESTOR_DEMO_PASSWORD", "").strip()
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed investor demo user, jobs, matches, application, interview.")
    parser.add_argument(
        "--email",
        default=demo_email_from_env(),
        help=f"Demo user email (default: {DEFAULT_DEMO_EMAIL} or DEMO_USER_EMAIL)",
    )
    parser.add_argument(
        "--password",
        default="",
        help="Password (prefer DEMO_USER_PASSWORD / INVESTOR_DEMO_PASSWORD env; never commit)",
    )
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Update password when user already exists",
    )
    parser.add_argument(
        "--no-recompute-scores",
        action="store_true",
        help="Skip live matcher pass; keep fixed demo match_score values only",
    )
    parser.add_argument(
        "--skip-auto-apply",
        action="store_true",
        help="Do not seed auto-apply consent / sweep row (dashboard strip may be empty)",
    )
    args = parser.parse_args()
    password = args.password.strip() or _password_from_env()
    if not password or len(password) < 12:
        print(
            "Set DEMO_USER_PASSWORD or INVESTOR_DEMO_PASSWORD (12+ chars) or pass --password.",
            file=sys.stderr,
        )
        return 1

    email = args.email.strip().lower()
    with get_session() as db:
        summary = run_investor_demo_seed(
            db,
            email=email,
            password=password,
            reset_password=args.reset_password,
            recompute_live_scores=not args.no_recompute_scores,
            seed_auto_apply=not args.skip_auto_apply,
        )
        db.commit()

    print("Investor demo seed OK")
    print(f"  email:       {email}")
    print(f"  user_id:     {summary['user_id']}")
    print(f"  candidate:   {summary['candidate_id']}")
    print(f"  jobs:        {len(summary['job_ids'])} (investor-demo-*)")
    print(f"  matches:     {summary['match_count']}")
    print(f"  application: {summary['application_id']} (applied → {summary['primary_job_title']})")
    print(f"  interview:   {summary['interview_id']}")
    print("  password:    (not printed — use your env password)")
    print("  login:       /login then /dashboard")
    print("  public demo: enable DEMO_MODE_ENABLED=true → GET /api/v1/demo/snapshot")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
