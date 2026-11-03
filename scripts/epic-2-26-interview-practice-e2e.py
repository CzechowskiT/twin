#!/usr/bin/env python3
"""Epic 2.26 — code + stance matrix for journeys A–H (static / unit; no canary mutation)."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PASS = FAIL = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"PASS  {name}" + (f" — {detail}" if detail else ""))
    else:
        FAIL += 1
        print(f"FAIL  {name}" + (f" — {detail}" if detail else ""))


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def main() -> int:
    # A — defect repair: no invented word-count score
    coach = read("backend/app/services/ai_interview_coach.py")
    code = re.sub(r'""".*?"""', "", coach, flags=re.S)
    code = re.sub(r"#.*", "", code)
    check("A no wordcount formula", "min(85" not in code and "words // 3" not in code)
    check("A EVALUATION_UNAVAILABLE", "EVALUATION_UNAVAILABLE" in coach)
    check("A score None path", "score=None" in coach or '"score": None' in coach)

    # B — no SynthCo / runChain on ordinary interview-decision UI
    decision = read("frontend/src/app/dashboard/interview-decision/page.tsx")
    check("B no runChain", "runChain" not in decision)
    check("B no SynthCo company write", 'company: "SynthCo"' not in decision and "company: 'SynthCo'" not in decision)
    check("B practice link", "interview-practice" in decision)

    # C — catalog 3×2 EN+PL
    catalog = read("backend/app/services/candidate_interview_exercise_catalog.py")
    check("C family behavioral", "behavioral_star" in catalog)
    check("C family role_problem", "role_problem" in catalog)
    check("C family clarifying", "clarifying_questions" in catalog)
    check("C six ids", all(
        x in catalog
        for x in (
            "behavioral_star_1",
            "behavioral_star_2",
            "role_problem_1",
            "role_problem_2",
            "clarifying_1",
            "clarifying_2",
        )
    ))
    check("C bilingual titles", "title_pl" in catalog and "title_en" in catalog)

    # D — adaptive multi-turn practice domain
    check("D alembic 139", (ROOT / "backend/alembic/versions/139_candidate_interview_practice.py").exists())
    check("D service", (ROOT / "backend/app/services/candidate_interview_practice.py").exists())
    check("D api", (ROOT / "backend/app/api/interview_practice.py").exists())
    check("D fe page", (ROOT / "frontend/src/app/dashboard/interview-practice/page.tsx").exists())
    check("D adr", (ROOT / "docs/ADR_EPIC_2_26_ADAPTIVE_INTERVIEW_PRACTICE.md").exists())
    mig = read("backend/alembic/versions/139_candidate_interview_practice.py")
    check("D revises 138", "138_candidate_totp_mfa" in mig)
    check("D expected head", 'EXPECTED_ALEMBIC_HEAD = "139_candidate_interview_practice"' in read("backend/app/api/admin_ops.py"))

    # E — criterion feedback, grounded mock
    mock = read("backend/app/services/interview_decision.py")
    check("E grounded mock", "grounded_in_submitted_answers" in mock)
    check("E NOT_ASSESSED empty", "NOT_ASSESSED" in mock)
    api = read("backend/app/api/interview_practice.py")
    check("E submit + next-turn", "/submit" in api and "next-turn" in api)

    # F — evidence promotion PRACTICE_WORK_SAMPLE
    prac = read("backend/app/services/candidate_interview_practice.py")
    const = read("backend/app/services/candidate_interview_practice_constants.py")
    check("F PRACTICE_WORK_SAMPLE", "PRACTICE_WORK_SAMPLE" in const and "PRACTICE_WORK_SAMPLE" in prac)
    check("F promote endpoint", "promote-to-evidence" in api)
    check("F for_update submit", "with_for_update" in prac)
    check("F commit before model", "Commit before calling AI" in prac or "commit before" in prac.lower())

    # G — IA=7, secondary practice, consent/deletion
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("G primary IA 7", primary.count("href:") == 7)
    check("G practice secondary", "/dashboard/interview-practice" in ia)
    check("G soft delete", "delete_session" in prac and "deleted_at" in prac)
    check("G kpi excluded", "kpi_excluded" in prac)

    # H — frozen stance (code posture; live checked in authenticated e2e)
    check("H no canary activation in practice", "canary_activation" not in prac)
    check(
        "H no banned columns",
        "webcam" not in mig.lower()
        and "psychometric" not in mig.lower()
        and "behavioral_score" not in mig.lower(),
    )
    check("H router mounted", "interview_practice" in read("backend/app/api/router.py"))

    py = str(ROOT / ".venv/bin/python") if (ROOT / ".venv/bin/python").exists() else sys.executable
    r = subprocess.run(
        [py, "-m", "pytest", "tests/test_epic_226_interview_practice.py", "-q", "--tb=line"],
        cwd=ROOT / "backend",
        capture_output=True,
        text=True,
    )
    check("H unit fixtures", r.returncode == 0, (r.stdout + r.stderr)[-220:])

    r2 = subprocess.run(
        ["npm", "run", "test:epic-226-interview-practice-guard"],
        cwd=ROOT / "frontend",
        capture_output=True,
        text=True,
    )
    check("H fe guard", r2.returncode == 0, (r2.stdout + r2.stderr)[-180:])

    print(f"\nSUMMARY PASS={PASS} FAIL={FAIL}")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
