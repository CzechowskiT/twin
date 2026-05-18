"""Aggregate API routers."""

from fastapi import APIRouter

from app.api import applications, auth, beta_waitlist, billing, calendar, candidates, curated_careers, geo, health, jobs, kyc, linkedin_viral, partner, placement, public, referrals, talent_pool

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(public.router, prefix="/public", tags=["public"])
api_router.include_router(geo.router, prefix="/geo", tags=["geo"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(linkedin_viral.router, prefix="/linkedin-viral", tags=["linkedin-viral"])
api_router.include_router(referrals.router, prefix="/referrals", tags=["referrals"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
api_router.include_router(beta_waitlist.router, prefix="/beta", tags=["beta"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(kyc.router, prefix="/kyc", tags=["kyc"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
api_router.include_router(talent_pool.router, prefix="/talent-pool", tags=["talent-pool"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(placement.router, prefix="/placement", tags=["placement"])
api_router.include_router(curated_careers.router, prefix="/employers", tags=["employers"])
api_router.include_router(partner.router, prefix="/partner", tags=["partner"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
