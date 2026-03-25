"""
RoxyMail — Upstash Redis REST Client
Uses httpx to call Upstash Redis REST API (no SDK dependency).
"""

import httpx
from app.config import settings


class RedisClient:
    """Async Upstash Redis REST client."""

    def __init__(self):
        self.base_url = settings.UPSTASH_REDIS_REST_URL
        self.token = settings.UPSTASH_REDIS_REST_TOKEN
        self._client: httpx.AsyncClient | None = None

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self.headers,
                timeout=10.0,
            )
        return self._client

    async def _request(self, *args: str):
        """Send a command to Upstash Redis REST API."""
        if not self.base_url or not self.token:
            # If Redis not configured, return None (graceful degradation)
            return None
        client = await self._get_client()
        path = "/" + "/".join(str(a) for a in args)
        resp = await client.get(path)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("result")
        return None

    async def get(self, key: str):
        return await self._request("GET", key)

    async def set(self, key: str, value: str, ex: int | None = None):
        if ex:
            return await self._request("SET", key, value, "EX", str(ex))
        return await self._request("SET", key, value)

    async def incr(self, key: str):
        return await self._request("INCR", key)

    async def expire(self, key: str, seconds: int):
        return await self._request("EXPIRE", key, str(seconds))

    async def delete(self, key: str):
        return await self._request("DEL", key)

    async def ttl(self, key: str):
        return await self._request("TTL", key)

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


redis = RedisClient()
