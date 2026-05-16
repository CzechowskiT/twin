"""Aggregate API routers."""

from fastapi import APIRouter

from app.api import applications, auth, billing, candidates, curated_careers, health, jobs

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(curated_careers.router, prefix="/employers", tags=["employers"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
