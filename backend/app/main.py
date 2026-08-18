import logging
from contextlib import asynccontextmanager

import psycopg
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from psycopg_pool import PoolTimeout
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.db import check_connection, pool
from app.errors import (
    ApiError,
    api_error_handler,
    database_error_handler,
    http_exception_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from app.routers.v1.router import router as v1_router

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await pool.open()
    # Probe once at boot so a bad password is obvious in the log immediately,
    # rather than only showing up as a failed request later.
    reason = await check_connection()
    if reason:
        logger.error(
            "DATABASE UNREACHABLE - %s\n"
            "  Fix PGPASSWORD/PGHOST in backend/.env, then run:\n"
            "    python -m scripts.migrate && python -m scripts.seed",
            reason,
        )
    else:
        logger.info("database connection OK (%s)", settings.pgdatabase)
    yield
    await pool.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Leave Management API",
        version="1.0.0",
        description="Employee leave request API (v1). Scope: onboarding -> submission.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    # DB connectivity failures get their own 503 + actionable message.
    app.add_exception_handler(PoolTimeout, database_error_handler)
    app.add_exception_handler(psycopg.OperationalError, database_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    # Versioned surface. A future v2 mounts alongside this one.
    app.include_router(v1_router)

    return app


app = create_app()
