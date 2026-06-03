import asyncpg
from app.config import config


class Pool:
    _pool: asyncpg.Pool | None = None

    async def open(self):
        url = config.database_url.replace("?sslmode=disable", "")
        self._pool = await asyncpg.create_pool(url, min_size=2, max_size=5)

    async def close(self):
        if self._pool:
            await self._pool.close()

    @property
    def conn(self) -> asyncpg.Pool:
        if not self._pool:
            raise RuntimeError("DB pool not initialized")
        return self._pool


pool = Pool()
