"""FastAPI application entrypoint."""

import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler, request_validation_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError

from app.api.router import api_router
from app.config import get_settings
from app.database.session import engine
from app.database import models  # noqa: F401 — register metadata

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Rebuild Settings once at startup so Railway-only env (e.g. RAILWAY_ENVIRONMENT) is visible
    # before Celery reads CELERY_TASK_ALWAYS_EAGER (import order can cache Settings too early).
    get_settings.cache_clear()
    from app.tasks.celery_app import apply_celery_runtime_config

    apply_celery_runtime_config()
    yield
    engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="TWIN API",
        description="Autonomous career agent",
        version="0.1.0",
        lifespan=lifespan,
    )
    from app.middleware.request_id import add_request_id_middleware

    add_request_id_middleware(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api/v1")

    @app.exception_handler(HTTPException)
    async def http_exception_sanitize_500(request: Request, exc: HTTPException) -> JSONResponse:
        if exc.status_code == 500:
            logger.error(
                "HTTP 500 on %s %s rid=%s (client detail sanitized): %r",
                request.method,
                request.url.path,
                getattr(request.state, "request_id", None),
                exc.detail,
            )
            return JSONResponse(status_code=500, content={"detail": "Internal server error"})
        return await http_exception_handler(request, exc)

    @app.exception_handler(OperationalError)
    async def database_unavailable(_request: Request, exc: OperationalError) -> JSONResponse:
        """Surface DB connectivity issues instead of the generic 500 body."""
        logger.error("Database operational error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "detail": (
                    "Database unavailable. Ensure PostgreSQL is running and DATABASE_URL "
                    "matches your environment (see .env.example)."
                )
            },
        )

    @app.exception_handler(ProgrammingError)
    async def database_schema_mismatch(_request: Request, exc: ProgrammingError) -> JSONResponse:
        logger.error("Database programming error (migrations?): %s", exc, exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "detail": (
                    "Database schema mismatch. Run Alembic migrations on the API service "
                    "(e.g. `alembic upgrade head` in the Railway deploy / release phase)."
                )
            },
        )

    @app.exception_handler(IntegrityError)
    async def database_integrity(_request: Request, exc: IntegrityError) -> JSONResponse:
        logger.warning("IntegrityError: %s", exc)
        msg = str(getattr(exc, "orig", None) or exc).lower()
        if "email" in msg and ("unique" in msg or "duplicate" in msg):
            return JSONResponse(status_code=409, content={"detail": "Email already registered"})
        return JSONResponse(
            status_code=409,
            content={"detail": "Conflict with existing data. If this persists, contact support."},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, RequestValidationError):
            return await request_validation_exception_handler(request, exc)
        logger.error(
            "Unhandled %s on %s %s rid=%s: %s\n%s",
            type(exc).__name__,
            request.method,
            request.url.path,
            getattr(request.state, "request_id", None),
            exc,
            traceback.format_exc(),
        )
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    @app.get("/")
    def root() -> dict[str, str]:
        """So the public Railway URL without a path shows something useful."""
        return {
            "service": "TWIN API",
            "health": "/api/v1/health",
            "docs": "/docs",
        }

    return app


app = create_app()
