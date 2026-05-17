"""Career compass path and snapshot."""

from app.services.career_compass import (
    build_career_compass,
    ideal_dict_from_pydantic,
    next_open_milestone_title,
    set_milestone_done,
)
from app.schemas.career_compass import IdealJobIn


def test_build_compass_has_phases_and_snapshot() -> None:
    ideal = ideal_dict_from_pydantic(
        IdealJobIn(
            target_role_titles=["Director Operations"],
            target_salary_gross_monthly_pln=45000,
            work_formats=["hybrid"],
            must_have_tools=["Celonis"],
            key_responsibilities="Lead global ops transformation",
            target_horizon_months=12,
        )
    )
    profile = {
        "skills": ["Python", "stakeholder management"],
        "preferred_job_titles": ["Manager"],
        "experience_years": 10,
        "desired_salary": 30000,
        "location": "Warsaw",
        "has_cv": True,
        "cv_insights": None,
    }
    cc = build_career_compass(ideal, profile, prev=None, regenerate_path=True)
    assert cc["ideal"]["target_role_titles"]
    assert cc["snapshot"]["readiness_score"] >= 0
    path = cc["path"]
    assert path["phases"]
    assert next_open_milestone_title(cc)


def test_toggle_milestone_updates_xp() -> None:
    ideal = ideal_dict_from_pydantic(IdealJobIn(target_role_titles=["X"], target_horizon_months=6))
    profile = {"skills": [], "preferred_job_titles": [], "experience_years": 1, "desired_salary": None}
    cc = build_career_compass(ideal, profile, prev=None, regenerate_path=True)
    mid = cc["path"]["phases"][0]["milestones"][0]["id"]
    cc2, err = set_milestone_done(cc, mid, True)
    assert err is None
    assert cc2["path"]["xp_total"] > 0
