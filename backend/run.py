"""Dev entry point.

Sets a psycopg-compatible event loop policy before uvicorn creates its loop.
Windows defaults to ProactorEventLoop, which psycopg's async mode cannot use;
uvicorn only switches to the selector loop when it spawns subprocesses, so we
set it explicitly here to cover the no-reload case too.

Run: python run.py
"""

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn  # noqa: E402

from app.config import settings  # noqa: E402

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=settings.port,
        reload=True,
    )
