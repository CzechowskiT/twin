#!/usr/bin/env python3
"""Summarize which user-story surfaces exist in the repo (heuristic audit)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "USER_STORIES_COMPLETE.md"
OUT = ROOT / "docs" / "USER_STORIES_STATUS.md"

MARKERS = [
    ("Phase 1 Candidate", "US-C", 50, [
        ("landing", ["(marketing)/page.tsx", "how-it-works", "pricing", "mvp-live-stats"]),
        ("signup", ["register/", "login/", "auth/callback"]),
        ("onboarding", ["onboarding/page.tsx", "onboarding-gate"]),
        ("profile", ["profile/page.tsx", "candidates/me"]),
        ("matches", ["dashboard/page.tsx", "matches"]),
        ("applications", ["applications", "auto-apply", "nightly_auto_apply"]),
        ("calendar", ["dashboard/calendar", "calendar.py", "webcal"]),
        ("settings", ["billing", "auto-apply/settings", "feedback"]),
    ]),
    ("Phase 2 Recruiter", "US-R", 40, [
        ("recruiter", ["recruiter/", "for-recruiters"]),
        ("inbox", ["recruiter/inbox"]),
        ("placement", ["placement/"]),
    ]),
    ("Phase 3 Investor", "US-I", 20, [
        ("investor", ["investor/", "for-companies", "workspace/investor"]),
        ("metrics", ["admin/metrics", "mvp-stats"]),
    ]),
]


def grep_repo(needle: str) -> bool:
    for base in (ROOT / "frontend" / "src", ROOT / "backend" / "app"):
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.is_file() and needle in str(path):
                return True
    return False


def main() -> None:
    doc_lines = DOC.read_text(encoding="utf-8").count("\n") if DOC.exists() else 0
    lines = [
        "# User stories — implementation status (auto-generated heuristic)",
        "",
        f"Source spec: [USER_STORIES_COMPLETE.md](./USER_STORIES_COMPLETE.md) ({doc_lines} lines).",
        "",
        "**Reality:** TWIN Phase 1 MVP already covers most candidate journeys in code; this file tracks gaps, not greenfield builds.",
        "",
        "| Phase | Stories | Repo signals | Honest status |",
        "|-------|---------|--------------|---------------|",
    ]

    for phase_name, prefix, count, checks in MARKERS:
        hits = sum(1 for _, needles in checks if any(grep_repo(n) for n in needles))
        total = len(checks)
        pct = int(100 * hits / total) if total else 0
        status = "mostly done" if pct >= 75 else "partial" if pct >= 40 else "early"
        lines.append(f"| {phase_name} | {count} ({prefix}*) | {hits}/{total} areas | **{status}** (~{pct}% surfaces) |")

    lines.extend(
        [
            "",
            "## Phase 1 critical paths (investor demo)",
            "",
            "- [x] Landing + social proof (`MvpLiveStatsStrip`, `/how-it-works`, `/pricing`)",
            "- [x] Register/login zones per persona",
            "- [x] 5-step onboarding + resume (`OnboardingGate`, localStorage step)",
            "- [x] Dashboard matches + applications + nightly auto-apply",
            "- [ ] Email verification flow (account activation email)",
            "- [ ] Prod job corpus always populated (ops scrape)",
            "- [ ] Full 50/50 story acceptance criteria from spec",
            "",
            "## Not in 16h scope",
            "",
            "- ATS integrations (Greenhouse/Lever) — Phase 2+",
            "- 200+ dedicated endpoints / 1000+ tests per spec fiction",
            "- Load test 100 concurrent users",
            "",
            "Regenerate: `python scripts/story_audit.py`",
            "",
        ]
    )

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
