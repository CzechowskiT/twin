#!/usr/bin/env python3
"""Local CLI: scrape Pracuj.pl (MVP Week 1) — JSON to stdout or file.

Run from repo root or backend:

  cd backend && python scripts/pracuj_scrape_cli.py --limit 50 -o jobs.json

Requires: Playwright installed (`playwright install chromium`).
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.scrapers.pracuj import scrape_pracuj  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Scrape Pracuj.pl search results to JSON.")
    p.add_argument("--keyword", default="python", help="Search keyword (default: python)")
    p.add_argument("--location", default="warszawa", help="Location slug (default: warszawa)")
    p.add_argument("--limit", type=int, default=100, help="Max offers to collect (default: 100)")
    p.add_argument("-o", "--output", help="Write JSON to this path (UTF-8); default: stdout")
    args = p.parse_args()

    jobs = scrape_pracuj(keyword=args.keyword, location=args.location, limit=args.limit)
    payload = [asdict(j) for j in jobs]
    text = json.dumps(payload, ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
        print(f"Wrote {len(payload)} jobs to {args.output}", file=sys.stderr)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
