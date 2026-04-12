"""Configuration loaded from environment variables. No secrets in source."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "openEBM"

    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-opus-4-5"
    CLAUDE_FAST_MODEL: str = "claude-sonnet-4-5"

    DATABASE_URL: str = "sqlite:///./openebm_dev.db"
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://openebm.vercel.app"
    REDIS_URL: str = ""

    VERIFY_TIMEOUT_SECONDS: int = 8
    MAX_CONCURRENT_VERIFICATIONS: int = 10
    MIN_REFERENCES: int = 10
    PREFERRED_REFERENCES_MAX: int = 15

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
