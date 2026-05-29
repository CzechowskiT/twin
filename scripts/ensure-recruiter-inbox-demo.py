#!/usr/bin/env python3
"""Refresh recruiter batch inbox demo rows on prod (no password reset).

Resets prior batch-accept/decline on investor-demo Nova Hiring PL applications back to
``applied`` so `/recruiter/inbox?company_slug=nova-hiring-pl` shows a fresh queue.

  export DATABASE_URL='postgresql://…'   # Postgres service DATABASE_PUBLIC_URL (Railway)
  python3 scripts/ensure-recruiter-inbox-demo.py

  python3 scripts/ensure-recruiter-inbox-demo.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database.connection import get_session  # noqa: E402
from app.services.investor_demo_seed import DEMO_RECRUITER_COMPANY, ensure_recruiter_inbox_demo  # noqa: E402
from app.services.recruiter_inbox import build_recruiter_batch  # noqa: E402
from app.utils.slug import slugify_company  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh recruiter inbox demo APPLIED rows.")
    parser.add_argument("--dry-run", action="store_true", help="Print inbox snapshot without writing.")
    parser.add_argument(
        "--company",
        default=DEMO_RECRUITER_COMPANY,
        help=f"Employer name (default: {DEMO_RECRUITER_COMPANY})",
    )
    args = parser.parse_args()
    slug = slugify_company(args.company)

    with get_session() as db:
        before = build_recruiter_batch(db, company_slug=slug)
        if args.dry_run:
            print(
                json.dumps(
                    {
                        "dry_run": True,
                        "company_slug": slug,
                        "inbox_before": before,
                    },
                    indent=2,
                )
            )
            return 0
        summary = ensure_recruiter_inbox_demo(db, company=args.company)
        db.commit()
        after = build_recruiter_batch(db, company_slug=slug)
        summary["company_slug"] = slug
        summary["inbox_before_total"] = before["total"]
        summary["inbox_after_total"] = after["total"]
        summary["inbox_applied"] = sum(1 for i in after["items"] if i["status"] == "applied")

    print(json.dumps(summary, indent=2))
    print(f"Recruiter inbox: /recruiter/inbox?company_slug={slug}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
