"""FastAPI application entrypoint."""

import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.api.router import api_router
from app.config import get_settings
from app.database.session import engine
from app.database import models  # noqa: F401 — register metadata

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_app: FastAPI):
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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api/v1")

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

    @app.exception_handler(Exception)
    async def unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, RequestValidationError):
            return await request_validation_exception_handler(request, exc)
        if isinstance(exc, HTTPException):
            detail = exc.detail
            body = {"detail": detail} if isinstance(detail, str) else {"detail": str(detail)}
            return JSONResponse(status_code=exc.status_code, content=body)
        logger.error(
            "Unhandled %s on %s %s: %s\n%s",
            type(exc).__name__,
            request.method,
            request.url.path,
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
