"""
RoxyMail — Application Configuration
Loads all environment variables using Pydantic Settings.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "roxymail"

    # Upstash Redis
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # JWT
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MIN: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Webhook
    WEBHOOK_SECRET: str = "test-secret-key-for-development"

    # Security
    BCRYPT_ROUNDS: int = 12

    # CORS
    ALLOWED_ORIGINS: str = "https://roxymail.vercel.app,http://localhost:3000"

    # Domain
    DOMAIN: str = "roxystore.my.id"

    # Inbox limits
    MAX_MESSAGES_PER_INBOX: int = 200
    MESSAGE_TTL_HOURS: int = 24

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
