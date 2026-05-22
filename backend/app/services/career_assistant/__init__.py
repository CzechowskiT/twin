"""AI career assistant services (US-C052–057)."""

from app.services.career_assistant.ats_cv import optimize_cv_for_application
from app.services.career_assistant.follow_up import generate_follow_up_email
from app.services.career_assistant.hiring_insights import research_hiring_insights_for_job
from app.services.career_assistant.interview_prep import build_interview_prep
from app.services.career_assistant.linkedin_profile import optimize_linkedin_profile
from app.services.career_assistant.salary_negotiation import build_salary_negotiation

__all__ = [
    "optimize_cv_for_application",
    "build_interview_prep",
    "build_salary_negotiation",
    "generate_follow_up_email",
    "research_hiring_insights_for_job",
    "optimize_linkedin_profile",
]
