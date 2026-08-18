from contextlib import asynccontextmanager

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.config import settings

# Async pool, opened on app startup and closed on shutdown (see main.py).
# dict_row gives us dict results instead of tuples.
pool = AsyncConnectionPool(
    conninfo=settings.dsn(),
    min_size=settings.pg_pool_min,
    max_size=settings.pg_pool_max,
    kwargs={"row_factory": dict_row},
    # Fail fast. The default is 30s, which makes a bad password look like a
    # hung request instead of a config error.
    timeout=settings.pg_pool_timeout,
    # Validate a connection before handing it out. Postgres (or a firewall)
    # can close idle connections; without this the pool serves a dead one and
    # the request fails with "server closed the connection unexpectedly".
    check=AsyncConnectionPool.check_connection,
    # Recycle idle connections before the server is likely to drop them.
    max_idle=300.0,
    open=False,
)


async def check_connection() -> str | None:
    """Return None if the DB is reachable, else the underlying failure reason.

    Connects directly rather than via the pool: PoolTimeout would only report
    "couldn't get a connection", hiding the actual cause (bad password, host
    down, missing database).
    """
    try:
        conn = await psycopg.AsyncConnection.connect(
            settings.dsn(), connect_timeout=int(settings.pg_pool_timeout)
        )
        await conn.close()
        return None
    except Exception as exc:  # noqa: BLE001
        # psycopg messages are multi-line; collapse to one for logging.
        return " ".join(str(exc).split())


@asynccontextmanager
async def get_cursor():
    """Yield a cursor from a pooled connection."""
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            yield cur


async def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    async with get_cursor() as cur:
        await cur.execute(sql, params)
        return await cur.fetchall()


async def fetch_one(sql: str, params: tuple = ()) -> dict | None:
    async with get_cursor() as cur:
        await cur.execute(sql, params)
        return await cur.fetchone()
