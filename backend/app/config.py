from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to this file (backend/.env), not the shell's CWD.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), extra="ignore")

    port: int = 4000
    cors_origins: str = "http://localhost:5173"

    # JWT Authentication
    jwt_secret: str  # Loaded from .env
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24  # 1 day

    # DATABASE_URL wins when set; otherwise assembled from the PG* fields.
    database_url: str | None = None
    pghost: str = "localhost"
    pgport: int = 5432
    pguser: str = "postgres"
    pgpassword: str = ""
    pgdatabase: str = "leave_management"

    pg_pool_min: int = 1
    pg_pool_max: int = 10
    # Seconds to wait for a pooled connection before giving up.
    pg_pool_timeout: float = 5.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def dsn(self, database: str | None = None) -> str:
        """Connection string for `database` (defaults to the configured one).

        User and password are percent-encoded: passwords routinely contain
        characters like '@', ':' or '/' that would otherwise be parsed as URI
        delimiters and silently produce a wrong host or database.
        """
        if self.database_url and database is None:
            return self.database_url
        db = database or self.pgdatabase
        user = quote(self.pguser, safe="")
        password = quote(self.pgpassword, safe="")
        return f"postgresql://{user}:{password}@{self.pghost}:{self.pgport}/{db}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
