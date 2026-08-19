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
from app.auth import assert_startup_safe
from app.auth import router as auth_router
from app.routers.v1.router import router as v1_router

# uvicorn configures only its own loggers, so anything the application logs
# would otherwise be discarded — including every notification dispatch, which
# is the only visible evidence that a message was sent or why it was not.
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-8s %(name)s: %(message)s",
)
# Third-party clients are chatty at INFO and drown the app's own output.
logging.getLogger("slack_sdk").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Before anything else: refuse to run while believing we are protected and
    # not being. A service that starts in that state is worse than one that
    # does not start at all.
    assert_startup_safe()

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
    # Mounted under the same version prefix as everything else.
    v1_router.include_router(auth_router)
    app.include_router(v1_router)

    return app


app = create_app()
