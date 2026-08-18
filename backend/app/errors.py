import logging

import psycopg
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from psycopg_pool import PoolTimeout
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")


class ApiError(Exception):
    """Domain error carrying an HTTP status + machine-readable code."""

    def __init__(self, status: int, code: str, message: str, details: dict | None = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details

    @classmethod
    def bad_request(cls, message: str, details: dict | None = None) -> "ApiError":
        return cls(400, "BAD_REQUEST", message, details)

    @classmethod
    def not_found(cls, message: str) -> "ApiError":
        return cls(404, "NOT_FOUND", message)

    @classmethod
    def conflict(cls, message: str, details: dict | None = None) -> "ApiError":
        return cls(409, "CONFLICT", message, details)


def _envelope(code: str, message: str, details: dict | None = None) -> dict:
    body: dict = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    return {"error": body}


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content=_envelope(exc.code, exc.message, exc.details),
    )


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Flatten FastAPI's validation errors into the same envelope."""
    raw = exc.errors()
    first = raw[0] if raw else {}
    loc = ".".join(str(p) for p in first.get("loc", []) if p not in ("body", "query"))
    message = f"{loc}: {first.get('msg', 'invalid input')}" if loc else "Invalid request"
    # errors() can carry exception objects in "ctx"; keep only JSON-safe fields.
    safe = [
        {"field": ".".join(str(p) for p in e.get("loc", [])), "message": e.get("msg", "")}
        for e in raw
    ]
    return JSONResponse(
        status_code=400,
        content=_envelope("BAD_REQUEST", message, {"errors": safe}),
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Keep framework-raised errors (e.g. unmatched routes) in our envelope."""
    code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(code, str(exc.detail)),
    )


async def database_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Surface DB connectivity problems as 503 with an actionable message.

    Without this, a wrong PGPASSWORD looks like a slow request that ends in an
    opaque 500 — the cause is invisible to whoever is looking at the UI.
    """
    logger.error("database error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content=_envelope(
            "DATABASE_UNAVAILABLE",
            "Cannot reach the database. Check PGPASSWORD/PGHOST in backend/.env "
            "and that PostgreSQL is running, then re-run scripts.migrate.",
            {"reason": str(exc).strip()[:300]},
        ),
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log the real traceback; the client still gets a generic message.
    logger.exception("unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_envelope("INTERNAL", "Something went wrong."),
    )
