"""Aggregate API routers."""

from fastapi import APIRouter

from app.api import (
    audit_events,
    auto_apply_settings,
    admin_ops,
    company,
    company_feedback_persistence,
    consent,
    csp_reports,
    demo,
    export_requests,
    founder_command,
    ops,
    investor_data_room,
    applications,
    auth,
    beta_waitlist,
    billing,
    calendar,
    calendar_microsoft,
    candidates,
    candidate_role_status,
    candidate_visibility_preferences,
    company,
    career_assistant,
    curated_careers,
    gamification,
    geo,
    health,
    feedback,
    integrations_ats,
    interview_coach,
    jobs,
    kyc,
    linkedin_viral,
    opportunities,
    partner,
    placement,
    placement_events,
    profile_import,
    public,
    recruiter,
    referrals,
    request_intake,
    review_queue,
    talent_pool,
    work_items,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(audit_events.router, prefix="/audit-events", tags=["Audit events"])
api_router.include_router(work_items.router, prefix="/work-items", tags=["Work items"])
api_router.include_router(
    candidate_role_status.router,
    prefix="/candidate-role-status",
    tags=["Candidate role status"],
)
api_router.include_router(
    candidate_visibility_preferences.router,
    prefix="/candidate-visibility-preferences",
    tags=["Candidate visibility preferences"],
)
api_router.include_router(export_requests.router, prefix="/export-requests", tags=["Export requests"])
api_router.include_router(request_intake.router, prefix="/request-intake", tags=["Request intake"])
api_router.include_router(review_queue.router, prefix="/review-queue", tags=["Review queue"])
api_router.include_router(
    company_feedback_persistence.router,
    prefix="/company-feedback",
    tags=["Company feedback"],
)
api_router.include_router(csp_reports.router, tags=["Security"])
api_router.include_router(demo.router, prefix="/demo", tags=["Demo"])
api_router.include_router(public.router, prefix="/public", tags=["Public"])
api_router.include_router(geo.router, prefix="/geo", tags=["Geo"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(consent.router, prefix="/consent", tags=["Consent"])
api_router.include_router(linkedin_viral.router, prefix="/linkedin-viral", tags=["LinkedIn viral"])
api_router.include_router(referrals.router, prefix="/referrals", tags=["Referrals"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(calendar_microsoft.router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(beta_waitlist.router, prefix="/beta", tags=["Beta waitlist"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])
api_router.include_router(kyc.router, prefix="/kyc", tags=["KYC"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["Candidates"])
api_router.include_router(profile_import.router, prefix="/profile", tags=["Profile import"])
api_router.include_router(opportunities.router, prefix="/opportunities", tags=["Opportunities"])
api_router.include_router(gamification.router, prefix="/gamification", tags=["Gamification"])
api_router.include_router(interview_coach.router, prefix="/interview-coach", tags=["Interview coach"])
api_router.include_router(
    career_assistant.router, prefix="/career-assistant", tags=["Career assistant"]
)
api_router.include_router(talent_pool.router, prefix="/talent-pool", tags=["Talent pool"])
api_router.include_router(integrations_ats.router, prefix="/integrations", tags=["Integrations"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(placement.router, prefix="/placement", tags=["Placement"])
api_router.include_router(
    placement_events.router,
    prefix="/placement-events",
    tags=["Placement events"],
)
api_router.include_router(curated_careers.router, prefix="/employers", tags=["Employers"])
api_router.include_router(partner.router, prefix="/partner", tags=["Partner"])
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])
api_router.include_router(auto_apply_settings.router, prefix="/auto-apply", tags=["Auto-apply"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
api_router.include_router(admin_ops.router, prefix="/admin", tags=["Admin"])
api_router.include_router(ops.router, prefix="/ops", tags=["Ops"])
api_router.include_router(
    founder_command.router, prefix="/founder-command", tags=["Founder Command"]
)
api_router.include_router(investor_data_room.router, prefix="/investor", tags=["Investor"])
api_router.include_router(company.router, prefix="/company", tags=["Company"])
api_router.include_router(recruiter.router, prefix="/recruiter", tags=["Recruiter"])
api_router.include_router(company.router, prefix="/company", tags=["Company"])
