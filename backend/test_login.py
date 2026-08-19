import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, '.')
from app.db import pool, get_db
from app.routers.auth import login
from app.schemas import LoginRequest

async def main():
    req = LoginRequest(email='priya@meridian.io', password='password123')
    await pool.open()
    try:
        async for db in get_db():
            res = await login(req, db)
            print("LOGIN SUCCESS:", res)
    finally:
        await pool.close()

if __name__ == '__main__':
    asyncio.run(main())
