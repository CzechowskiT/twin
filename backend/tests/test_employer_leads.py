"""Public employer lead capture (no auth)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from fastapi.testclient import TestClient

from app.database.models import Base, EmployerLead
from app.database.session import get_db
from app.main import app


def test_employer_lead_post_persists() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    try:
        res = client.post(
            "/api/v1/employers/employer-leads",
            json={
                "company_name": "Acme SA",
                "email": "hr@acme.example",
                "contact_name": "Jan Kowalski",
                "message": "Interested in talent pool access.",
                "source": "companies_signup",
            },
        )
        assert res.status_code == 201
        assert "id" in res.json()
        row = db.query(EmployerLead).filter(EmployerLead.email == "hr@acme.example").first()
        assert row is not None
        assert row.company_name == "Acme SA"
        assert row.notes and "Jan Kowalski" in row.notes
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
