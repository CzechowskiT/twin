#!/usr/bin/env python3
"""Checkpoint report for user-story phases (see docs/USER_STORIES_COMPLETE.md)."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PHASE_STORIES = {
    1: ("US-C001", "US-C050", "Candidate"),
    2: ("US-R001", "US-R040", "Recruiter"),
    3: ("US-I001", "US-I020", "Investor"),
}


def run_pytest(backend: bool) -> tuple[int, str]:
    if not backend:
        return 0, "skipped"
    try:
        proc = subprocess.run(
            [str(ROOT / "backend" / ".venv" / "bin" / "python"), "-m", "pytest", "-q", "--tb=no"],
            cwd=ROOT / "backend",
            capture_output=True,
            text=True,
            timeout=600,
        )
        tail = (proc.stdout or proc.stderr or "").strip().splitlines()[-1:] or ["no output"]
        return proc.returncode, tail[0]
    except Exception as exc:
        return 1, str(exc)


def main() -> int:
    parser = argparse.ArgumentParser(description="TWIN user-story phase checkpoint")
    parser.add_argument("--phase", type=int, choices=(1, 2, 3), required=True)
    parser.add_argument("--pytest", action="store_true", help="Run backend pytest (slow)")
    args = parser.parse_args()

    start, end, label = PHASE_STORIES[args.phase]
    status_path = ROOT / "docs" / "USER_STORIES_STATUS.md"
    status_note = status_path.read_text(encoding="utf-8")[:400] if status_path.exists() else "(missing USER_STORIES_STATUS.md)"

    print(f"# Checkpoint — Phase {args.phase} ({label})")
    print(f"Story range: {start} … {end}")
    print()
    print("## Tracker excerpt")
    print(status_note)
    print()

    if args.pytest:
        code, summary = run_pytest(True)
        print(f"## pytest: {'PASS' if code == 0 else 'FAIL'}")
        print(summary)
        return code

    print("## pytest")
    print("Skipped (pass `--pytest` to run).")
    print()
    print("Human gate: approve phase in docs/USER_STORIES_COMPLETE.md checklist.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
