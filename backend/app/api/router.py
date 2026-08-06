"""Aggregate API routers."""

from fastapi import APIRouter

from app.api import (
    audit_events,
    auto_apply_settings,
    acceptance_calendar,
    admin_ops,
    ats_completion,
    candidate_intelligence,
    career_evidence,
    application_studio,
    interview_decision,
    career_transition,
    career_lifecycle,
    career_strategy,
    opportunity_intelligence,
    search_strategy_lab,
    search_outcome_intelligence,
    strategy_review_governance,
    decision_calendar_capacity,
    read_only_calendar_sync,
    adaptive_execution_intelligence,
    evidence_investment_intelligence,
    pilot_consolidation,
    pilot_operations,
    chatgpt_twin,
    company,
    company_feedback_persistence,
    consent,
    controlled_pilot_os,
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
    candidate_wave1,
    company,
    career_assistant,
    career_copilot,
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
    platform_foundations,
    profile_import,
    public,
    recruiter,
    recruiter_wave2,
    company_wave3,
    integrations_wave5,
    investor_wave4,
    ai_compliance,
    referrals,
    request_intake,
    review_queue,
    talent_pool,
    work_items,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(audit_events.router, prefix="/audit-events", tags=["Audit events"])
api_router.include_router(
    platform_foundations.router,
    prefix="/platform/foundations",
    tags=["Platform foundations"],
)
api_router.include_router(
    candidate_wave1.router,
    prefix="/platform/wave1",
    tags=["Candidate Wave 1"],
)
api_router.include_router(
    recruiter_wave2.router,
    prefix="/platform/wave2",
    tags=["Recruiter Wave 2"],
)
api_router.include_router(
    company_wave3.router,
    prefix="/platform/wave3",
    tags=["Company Wave 3"],
)
api_router.include_router(
    integrations_wave5.router,
    prefix="/platform/wave5",
    tags=["Integrations Wave 5"],
)
api_router.include_router(
    investor_wave4.router,
    prefix="/platform/wave4",
    tags=["Investor Wave 4"],
)
api_router.include_router(
    ai_compliance.router,
    prefix="/platform/ai-compliance",
    tags=["AI Compliance"],
)
api_router.include_router(ats_completion.router, tags=["ATS completion"])
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
api_router.include_router(
    career_copilot.router, prefix="/candidates", tags=["Career Copilot"]
)
api_router.include_router(
    acceptance_calendar.router, prefix="/candidates", tags=["Acceptance Calendar"]
)
api_router.include_router(
    career_evidence.router, prefix="/candidates", tags=["Career Evidence"]
)
api_router.include_router(
    application_studio.router, prefix="/candidates", tags=["Application Studio"]
)
api_router.include_router(
    interview_decision.router, prefix="/candidates", tags=["Interview Decision"]
)
api_router.include_router(
    career_transition.router, prefix="/candidates", tags=["Career Transition"]
)
api_router.include_router(
    career_lifecycle.router, prefix="/candidates", tags=["Career Lifecycle"]
)
api_router.include_router(
    career_strategy.router, prefix="/candidates", tags=["Career Strategy"]
)
api_router.include_router(
    opportunity_intelligence.router, prefix="/candidates", tags=["Opportunity Intelligence"]
)
api_router.include_router(
    search_strategy_lab.router, prefix="/candidates", tags=["Search Strategy Lab"]
)
api_router.include_router(
    search_outcome_intelligence.router,
    prefix="/candidates",
    tags=["Search Outcome Intelligence"],
)
api_router.include_router(
    strategy_review_governance.router,
    prefix="/candidates",
    tags=["Strategy Review Decision Governance"],
)
api_router.include_router(
    decision_calendar_capacity.router,
    prefix="/candidates",
    tags=["Decision Calendar Capacity Planning"],
)
api_router.include_router(
    read_only_calendar_sync.router,
    prefix="/candidates",
    tags=["Read-Only Calendar Sync"],
)
api_router.include_router(
    read_only_calendar_sync.public_router,
    prefix="",
    tags=["Private Calendar Feed"],
)
api_router.include_router(
    adaptive_execution_intelligence.router,
    prefix="/candidates",
    tags=["Adaptive Execution Intelligence"],
)
api_router.include_router(
    evidence_investment_intelligence.router,
    prefix="/candidates",
    tags=["Evidence Investment Intelligence"],
)
api_router.include_router(
    pilot_consolidation.router,
    prefix="/candidates",
    tags=["Pilot Consolidation"],
)
api_router.include_router(
    pilot_operations.router,
    prefix="/candidates",
    tags=["Pilot Operations"],
)
api_router.include_router(
    pilot_operations.admin_router,
    prefix="/admin",
    tags=["Pilot Operations Admin"],
)
api_router.include_router(
    candidate_intelligence.router, prefix="", tags=["Candidate Intelligence"]
)
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
api_router.include_router(controlled_pilot_os.router, prefix="/admin", tags=["Controlled Pilot OS"])
api_router.include_router(ops.router, prefix="/ops", tags=["Ops"])
api_router.include_router(
    founder_command.router, prefix="/founder-command", tags=["Founder Command"]
)
api_router.include_router(
    chatgpt_twin.router, prefix="/chatgpt/twin", tags=["ChatGPT Twin Product Operator"]
)
api_router.include_router(investor_data_room.router, prefix="/investor", tags=["Investor"])
api_router.include_router(company.router, prefix="/company", tags=["Company"])
api_router.include_router(recruiter.router, prefix="/recruiter", tags=["Recruiter"])
api_router.include_router(company.router, prefix="/company", tags=["Company"])
