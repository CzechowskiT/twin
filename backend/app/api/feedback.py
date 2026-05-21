"""Authenticated product feedback API."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import ProductFeedback, User
from app.schemas.feedback import ProductFeedbackIn, ProductFeedbackOut

router = APIRouter()


@router.post("", response_model=ProductFeedbackOut, status_code=201)
def submit_feedback(
    body: ProductFeedbackIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductFeedbackOut:
    row = ProductFeedback(
        user_id=user.id,
        category=body.category.strip().lower(),
        rating=body.rating,
        message=(body.message or "").strip() or None,
        page_path=(body.page_path or "").strip() or None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ProductFeedbackOut.model_validate(row)
