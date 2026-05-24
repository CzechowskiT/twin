"""Opportunity forecast + unified job/freelance feed."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.subscription_gates import Feature, feature_allowed, forecast_limit_for_user, paywall_for_feature
from app.database.models import User
from app.database.session import get_db
from app.schemas.opportunities import OpportunityForecastOut, UnifiedFeedItemOut, UnifiedFeedOut
from app.services.career_assistant_common import get_candidate_for_user
from app.services.opportunity_forecaster import forecast_opportunities
from app.services.request_locale import locale_from_request
from app.services.unified_feed import unified_opportunity_feed

router = APIRouter()


@router.get("/forecast", response_model=OpportunityForecastOut)
def get_opportunity_forecast(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OpportunityForecastOut:
    """Perfect / Near Miss / Stretch buckets for validated jobs."""
    candidate = get_candidate_for_user(db, current_user.id)
    locale = locale_from_request(request)
    limit = forecast_limit_for_user(current_user)
    data = forecast_opportunities(db, candidate, limit_per_band=limit, locale=locale)
    paywall = None if feature_allowed(current_user, Feature.OPPORTUNITY_FORECAST_FULL) else paywall_for_feature(
        Feature.OPPORTUNITY_FORECAST_FULL
    )
    return OpportunityForecastOut(paywall=paywall, **data)


@router.get("/unified-feed", response_model=UnifiedFeedOut)
def get_unified_feed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    opportunity_type: str = Query(default="all"),
    limit: int = Query(default=30, ge=1, le=100),
    min_score: float = Query(default=0.0, ge=0.0, le=100.0),
) -> UnifiedFeedOut:
    """Jobs + freelance gigs in one feed with optional type filter."""
    candidate = get_candidate_for_user(db, current_user.id)
    type_filter = opportunity_type if feature_allowed(current_user, Feature.UNIFIED_FEED_FILTERS) else "all"
    paywall = None if feature_allowed(current_user, Feature.UNIFIED_FEED_FILTERS) else paywall_for_feature(
        Feature.UNIFIED_FEED_FILTERS
    )
    items = unified_opportunity_feed(
        db,
        candidate,
        opportunity_type=type_filter if type_filter != "all" else None,
        limit=limit,
        min_score=min_score,
    )
    return UnifiedFeedOut(
        items=[UnifiedFeedItemOut(**item) for item in items],
        opportunity_type=type_filter,
        paywall=paywall,
    )
